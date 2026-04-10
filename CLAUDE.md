# Claudish - Development Notes

## Release Process

**Releases are handled by CI/CD** - do NOT manually run `npm publish`.

1. Bump version in `package.json`
2. Commit with conventional commit message (e.g., `feat!: v3.0.0 - description`)
3. Create annotated tag: `git tag -a v3.0.0 -m "message"`
4. Push with tags: `git push origin main --tags`
5. CI/CD will automatically publish to npm

## Build Commands

- `bun run build` - Full build (extracts models + bundles)
- `bun run build:ci` - CI build (bundles only, no model extraction)
- `bun run dev` - Development mode

## Windows Build (Standalone EXE)

For Windows users, build a standalone executable:

```bash
cd packages/cli
bun build src/index.ts --compile --outfile claudish.exe
```

This creates `claudish.exe` (standalone, no Node.js/Bun required).

**Launcher scripts** (in `C:\Users\User\bin\`):
- `claudish.exe` - Standalone executable
- `claudish.cmd` - Windows CMD launcher (default MiniMax M2.7)
- `claudish.ps1` - PowerShell launcher

**Usage**:
```cmd
claudish --model mm@MiniMax-M2.7
```

## Model Routing (v4.0+)

### New Syntax: `provider@model[:concurrency]`

```bash
# Explicit provider routing
claudish --model google@gemini-2.0-flash "task"
claudish --model openrouter@deepseek/deepseek-r1 "task"

# Native auto-detection (no prefix needed)
claudish --model gpt-4o "task"          # → OpenAI
claudish --model gemini-2.0-flash "task" # → Google
claudish --model llama-3.1-70b "task"   # → OllamaCloud

# Local models with concurrency
claudish --model ollama@llama3.2:3 "task"  # 3 concurrent requests
```

### Provider Shortcuts
- `g@`, `google@` → Google Gemini
- `oai@` → OpenAI Direct
- `or@`, `openrouter@` → OpenRouter
- `mm@`, `mmax@` → MiniMax
- `mmc@` → MiniMax Coding Plan
- `kimi@`, `moon@` → Kimi
- `glm@`, `zhipu@` → GLM
- `gc@` → GLM Coding Plan
- `llama@`, `oc@` → OllamaCloud
- `litellm@`, `ll@` → LiteLLM (requires LITELLM_BASE_URL)
- `ollama@` → Ollama (local)
- `lmstudio@` → LM Studio (local)

### Vendor Prefix Auto-Resolution (ModelCatalogResolver)

API aggregators (OpenRouter, LiteLLM) require vendor-prefixed model names that users shouldn't need to know. The `ModelCatalogResolver` interface searches each aggregator's dynamic model catalog to find the correct prefix automatically.

**How it works**: User types bare model name → resolver searches the provider's already-fetched model list → finds the exact match with vendor prefix → sends the prefixed name to the API.

**Current resolvers**:
- **OpenRouter**: `or@qwen3-coder-next` → searches catalog → sends `qwen/qwen3-coder-next`
- **LiteLLM**: `ll@gpt-4o` → searches model groups → finds `openai/gpt-4o` (prefix-strip match)
- **Static fallback**: `OPENROUTER_VENDOR_MAP` for cold starts when catalog isn't loaded yet

**Key design rules**:
- Exact match only — no fuzzy/normalized matching. Find the right prefix, don't guess the model.
- Dynamic catalogs (from provider APIs) are PRIMARY. Static map is cold-start fallback only.
- Resolution happens BEFORE handler construction (in `proxy-server.ts`), not inside adapters.
- Sync entry point (`resolveModelNameSync()`) — uses in-memory caches + `readFileSync`, no async propagation.

**Adding a new aggregator resolver**: Implement `ModelCatalogResolver` interface in `providers/catalog-resolvers/`, register in `model-catalog-resolver.ts`. No changes to proxy-server or provider-resolver needed.

**Architecture doc**: `ai-docs/sessions/dev-arch-20260305-104836-a48a463d/architecture.md`

## Local Model Support

Claudish supports local models via:
- **Ollama**: `claudish --model ollama@llama3.2` (or `ollama@llama3.2:3` for concurrency)
- **LM Studio**: `claudish --model lmstudio@model-name`
- **Custom URLs**: `claudish --model http://localhost:11434/model`

### Context Tracking for Local Models

Local model APIs (LM Studio, Ollama) report `prompt_tokens` as the **full conversation context** each request, not incremental tokens. The `writeTokenFile` function uses assignment (`=`) not accumulation (`+=`) for input tokens to handle this correctly.

## Three-Layer Adapter Architecture (v5.14.0+)

The translation pipeline has three decoupled layers:

### Layer 1: FormatConverter — wire format translation
Translates between Claude API format and target model's wire format (messages, tools, payload).
Each converter declares its stream format via `getStreamFormat()`.
- **Interface**: `adapters/format-converter.ts`
- **Implementations**: OpenAIAdapter, AnthropicPassthroughAdapter, GeminiAdapter, CodexAdapter, OllamaCloudAdapter, LiteLLMAdapter
- **Message/tool conversion**: `handlers/shared/format/openai-messages.ts`, `openai-tools.ts`

### Layer 2: ModelTranslator — model dialect translation
Translates model-specific dialect differences (context windows, thinking→reasoning_effort, vision rules).
- **Interface**: `adapters/model-translator.ts`
- **Implementations**: GLMAdapter, GrokAdapter, MiniMaxAdapter, DeepSeekAdapter, QwenAdapter, CodexAdapter
- **Selection**: `AdapterManager` auto-selects based on model ID

### Layer 3: ProviderTransport — HTTP transport
Handles auth, endpoints, headers, rate limiting. Optionally overrides stream format for aggregators.
- **Interface**: `providers/transport/types.ts`
- **Stream format override**: LiteLLM and OpenRouter implement `overrideStreamFormat()` → `"openai-sse"`

### Composition in ComposedHandler
```
ComposedHandler = FormatConverter (explicit adapter) + ModelTranslator (auto-selected) + ProviderTransport
```

**Stream parser selection** (3-tier priority):
```typescript
transport.overrideStreamFormat() ?? modelAdapter.getStreamFormat() ?? providerAdapter.getStreamFormat()
```

**Adding a new provider**: Add one entry to `PROVIDER_PROFILES` table in `providers/provider-profiles.ts`.
**Adding a new model**: Create a ModelTranslator adapter, register in `adapters/adapter-manager.ts`.
**Verifying wiring**: `claudish --probe <model>` shows the full adapter composition.

### Stream Parsers
Located in `handlers/shared/stream-parsers/`:
- `openai-sse.ts` — OpenAI SSE → Claude SSE (used by most providers)
- `anthropic-sse.ts` — Anthropic SSE passthrough (MiniMax, Kimi direct)
- `gemini-sse.ts` — Gemini SSE → Claude SSE
- `ollama-jsonl.ts` — Ollama JSONL → Claude SSE
- `openai-responses-sse.ts` — OpenAI Responses API → Claude SSE (Codex)

### Lesson Learned — `anthropic-sse.ts` (2026-04-10, commit cbfb60c)

**症狀**: Claude Code 出 `Cannot read properties of undefined (reading 'input_tokens')`，只發生在用 Anthropic passthrough 嘅 provider（MiniMax、Kimi、Z.AI）。

**根本原因 — 兩個 bug 疊埋：**

**Bug 1 — 逐行 enqueue（主因）**
原本用 `buffer.split("\n")` 逐行 enqueue，Claude Code 收到嘅係半截 SSE event。SSE 格式要求 `event:` + `data:` + `\n\n` 作為完整單位，consumer (`parseClaudeSseStream`) 才能 parse 到 `usage`。Bun ReadableStream 唔保證 chunk delivery 順序，半截 event 令 `usage` 係 `undefined`。

**Bug 2 — CRLF line endings（Z.AI / Windows-origin streams）**
Z.AI 等 provider 回傳 `\r\n` 換行。修咗 Bug 1 之後改用 `split("\n\n")`，但 CRLF 檔案嘅 event 分隔符係 `\r\n\r\n`，唔含 `\n\n` substring，整個 stream 變成一個大 chunk。`find()` 只攞第一條 `data:` 行（`message_start` 嘅 `input_tokens: 0`），之後 `message_delta` 裡面嘅真實 token count 永遠讀唔到。

**Fix（兩行）**:
```typescript
// 1. Decode 後即刻 normalize 換行
buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

// 2. 以完整 SSE event 為單位 enqueue（唔係逐行）
const eventChunks = buffer.split("\n\n");
buffer = eventChunks.pop() || "";
for (const eventChunk of eventChunks) {
  controller.enqueue(encoder.encode(eventChunk + "\n\n"));
}
```

**如果呢個 error 再出現**：先用 `--debug` 捕捉 raw SSE，check 係咪有 `\r\n`，再確認 consumer 收到嘅 chunk 係完整 event 還是碎片。

### 持續監察清單 — 每次 update 都要 check

呢個 project 由 Claude Code 管理，每次有以下變動都要留意：

**1. 新增 Anthropic passthrough provider**
任何新 provider 用 `anthropic-sse` 格式（即 `getStreamFormat()` 返回 `"anthropic-sse"`），必須：
- 用 `--debug` 抽一個真實 SSE fixture
- 加 regression test 入 `format-translation.test.ts`
- 特別確認 `input_tokens` 係咪從 `message_delta`（唔係 `message_start`）讀

**2. 修改 `anthropic-sse.ts`**
任何改動後必須跑：
```bash
bun test packages/cli/src/format-translation.test.ts
```
確保 53 tests 全 pass，特別係：
- `SEED: text-only Anthropic response passes through text events`
- `Regression: Z.AI GLM-5 input_tokens in final usage event (#74)`

**3. Provider API 有變**
MiniMax / Kimi / Z.AI 任何一個改咗 SSE 格式（event 順序、usage 位置），token count 會靜靜地變 0，唔會 throw error。症狀係 token 顯示一直係 0，唔係 crash。偵測方法：`--debug` 後 grep `input_tokens`。

**4. 其他 stream parser 同類風險**
`openai-sse.ts`、`gemini-sse.ts` 等未經同樣審查，如果出現類似 `undefined` error，從同一方向入手：check 係咪逐行 enqueue、check 換行格式。

## Debug Logging

Debug logging is behind the `--debug` flag and outputs to `logs/` directory. It's disabled by default.
Keep full debug logging (including empty chunks, raw deltas) in log files — needed to understand real model streaming behavior. Suppress noise at the registration/initialization level (e.g., conditional middleware), not at the streaming data level.

### Raw SSE Capture (v5.14.0+)

When `--debug` is active, both stream parsers log raw SSE events:
- `[SSE:openai] {...}` — every OpenAI SSE data line
- `[SSE:anthropic] {...}` — every Anthropic SSE data line

These are greppable and extractable into test fixtures for regression testing.

## Debugging Failed Model Translations

When a model produces wrong output (0 bytes, garbled, wrong format), use this workflow:

### 1. Reproduce with --debug
```bash
claudish --model minimax-m2.5 --debug "say hello"
# Debug log written to logs/claudish_YYYY-MM-DD_HH-MM-SS.log
```

### 2. Verify wiring with --probe
```bash
claudish --probe minimax-m2.5
# Shows: transport, format adapter, model translator, stream format, overrides
```

### 3. Analyze the debug log
Use the `/debug-logs` slash command in Claude Code:
```
/debug-logs logs/claudish_2026-03-17_09-41-32.log
```

This command:
1. Reads the log and counts text chunks, tool calls, HTTP errors, fallback chains
2. Diagnoses the failure mode (no SSE content, text but 0 stdout, wrong parser, etc.)
3. Extracts SSE fixtures from `[SSE:*]` lines using `test-fixtures/extract-sse-from-log.ts`
4. Adds a regression test to `format-translation.test.ts`
5. Runs tests to confirm the regression is captured

### 4. Extract fixtures manually (alternative)
```bash
bun run packages/cli/src/test-fixtures/extract-sse-from-log.ts logs/claudish_*.log
# Creates: test-fixtures/sse-responses/<model>-<format>-turn<N>.sse
```

### 5. Run format translation tests
```bash
bun test packages/cli/src/format-translation.test.ts
```

## Channel Mode (v6.4.0+)

The MCP server supports a channel mode that enables async model sessions with push notifications.

### Architecture

Uses the low-level `Server` class (not `McpServer`) from `@modelcontextprotocol/sdk/server/index.js` to declare `experimental: { 'claude/channel': {} }` capability. The SDK's `assertNotificationCapability()` has no default case — custom notification methods like `notifications/claude/channel` pass through.

### Components (`packages/cli/src/channel/`)

- **SessionManager** — spawns `claudish --model X --stdin --quiet` child processes, tracks lifecycle, enforces timeouts
- **SignalWatcher** — per-session state machine (starting→running→tool_executing→waiting_for_input→completed/failed/cancelled)
- **ScrollbackBuffer** — in-memory ring buffer (2000 lines) for session output

### MCP Tools (11 total)

- **Low-level** (4): `run_prompt`, `list_models`, `search_models`, `compare_models`
- **Agentic** (2): `team`, `report_error`
- **Channel** (5): `create_session`, `send_input`, `get_output`, `cancel_session`, `list_sessions`

Tool gating via `CLAUDISH_MCP_TOOLS` env var: `all` (default), `low-level`, `agentic`, `channel`.

### Tool Registration Pattern

Uses a `ToolDefinition[]` registry with raw JSON Schema (not Zod). Two `setRequestHandler` calls replace McpServer's ergonomic API:
- `ListToolsRequestSchema` → returns filtered tool list
- `CallToolRequestSchema` → dispatches to handler by name

### Channel Notifications

`server.notification({ method: "notifications/claude/channel", params: { content, meta } })` — pushed by SessionManager's `onStateChange` callback on state transitions.

### Testing

```bash
bun test --cwd . ./packages/cli/src/channel/*.test.ts
```

59 tests across 4 files: scrollback-buffer (11), signal-watcher (12), session-manager (21), e2e-channel (15).

E2E tests use `--strict-mcp-config --bare --dangerously-skip-permissions` for isolation. SessionManager tests use a fake-claudish PATH shim (`channel/test-helpers/fake-claudish.ts`).

## Test Infrastructure

### Format Translation Test Harness
`packages/cli/src/format-translation.test.ts` — SSE replay tests for the full translation pipeline.

**Fixture-based**: Each `.sse` file in `test-fixtures/sse-responses/` is a captured SSE stream from a real provider response. Tests replay fixtures through the stream parser and assert correct Claude SSE output.

**Helpers**: `parseClaudeSseStream()`, `extractText()`, `extractToolNames()`, `extractStopReason()`, `fixtureToResponse()`

**Adding regression tests**: After extracting fixtures from a debug log, add a `describe("Regression: <model>")` block. Template is at the bottom of the test file.

## Version Bumping Checklist

When releasing a new version, update ALL of these locations:
1. `package.json` (root monorepo version)
2. `packages/cli/package.json` (npm-published package - **CI/CD publishes from here**)
3. `packages/cli/src/cli.ts` (fallback VERSION constant, line ~27)

The fallback VERSION in cli.ts ensures compiled binaries (Homebrew/standalone) display the correct version when package.json isn't available. The `packages/cli/package.json` version is what npm publishes - if it's not updated, npm publish will fail.

## Windows Modifications (Fork)

This fork adds Windows TTY support for interactive mode via `cmd.exe /c start`.

### Key Changes

**`pty-diag-runner.ts`**:
- Added `WindowsSpawnRunner` class - uses `cmd.exe /c start` to open Claude Code in a new terminal window with proper TTY
- Added `tryCreateWindowsPtyRunner()` factory function
- Added `PtyRunner` interface for common PTY runner abstraction

**`claude-runner.ts`**:
- Changed `needsShell` condition from `.cmd extension check` to `isWindows()` - spawns all Windows processes with `shell: true` for better TTY propagation
- Interactive mode now uses `WindowsSpawnRunner.run()` which opens a new terminal window

### How It Works

1. Interactive mode spawns Claude Code via `cmd.exe /c start /wait cmd.exe /k batchFile`
2. Batch file sets environment variables and launches Claude Code
3. `start /wait` ensures parent process waits for the new window to close
4. Claude Code gets a proper TTY in the new terminal window

### Build

```bash
cd packages/cli
bun build src/index.ts --compile --outfile ../../../bin/claudish.exe
```

Binary output: `C:\Users\User\bin\claudish.exe` (standalone, ~120MB)
