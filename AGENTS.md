# Claudish Project Guidance

Read `CLAUDE.md` and `AI_HANDOFF.md` before changing this fork. Follow `C:\Users\User\AGENTS.md` for the shared Claude + Codex workflow.

## Local runtime

- The daily launcher is `C:\Users\User\bin\claudish.ps1` (with a matching `.cmd`) and defaults to `mm@MiniMax-M3`.
- Both launchers set `CLAUDE_PATH` to the native Claude Code executable at `C:\Users\User\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe`. Keep the native executable ahead of `claude.cmd`; the `.cmd` shell path corrupts multi-word prompt arguments on Windows.
- Bun must resolve through `C:\Users\User\bin\bun.ps1` / `bun.cmd` to `C:\Users\User\.bun\bin\bun.exe`. The old hanging binary is retained as `C:\Users\User\bin\bun.stale-20260329.exe` for recovery.
- After changing runtime code, run `bun run build`, then `npm install -g .\packages\cli`. Confirm the installed and local `dist/index.js` hashes match.

## Verification

- CLI typecheck: `bun run typecheck`
- Windows build: `bun run build`
- MiniMax/Anthropic regression group: `bun test src/providers/transport/anthropic-compat.test.ts src/handlers/composed-handler-error.test.ts src/format-translation.test.ts` from `packages/cli`
- Real launcher: `& C:\Users\User\bin\claudish.ps1 --version`, then a multi-word exact-response prompt.
- The unfiltered `bun test` suite includes long-running/API-dependent tests and can hang without output. Prefer bounded, explicit test files.
- `bun run typecheck:bridge` exposes the legacy macOS bridge's existing type debt. Do not make unverified networking changes merely to silence it on Windows.

## Gotchas

- `--probe --json` can include raw credential values. Do not share its output or commit it.
- Anthropic-compatible transient 429s retry twice, then open a short circuit. The first automatic retry while the circuit is open becomes a surfaced HTTP 400 so Claude Code stops an infinite silent retry loop.
- Preserve CRLF normalization on the complete Anthropic SSE buffer. Normalizing only each incoming chunk misses `\r` / `\n` split across chunk boundaries.
- MiniMax M3 is catalogued at a 1,000,000-token context window. Claudish tracks and displays that limit but does not compact messages; Claude Code owns `/compact` and automatic compaction.
- Treat the Claudish context percentage as an estimate. `TokenTracker` keeps cumulative session output, so the status line can be conservative after compaction or multiple internal requests.
- `backup/pre-revival-20260718` contains the complete pre-v7.15 fork state and MiniMax M3 work at commit `0823846`.
- Do not add `.claude/settings.json` from upstream without explicit approval; the upstream file enables multiple plugins and changes security posture.

## Changelog

### 2026-07-18 — v7.15 revival and Windows hardening

- Synced the fork from its old v6 lineage to upstream Claudish v7.15.0 while preserving the previous tree on a pushed backup branch.
- Upgraded the global daily-use install to the patched local v7.15 build.
- Fixed native Claude Code discovery and permanently configured `CLAUDE_PATH`, restoring Windows multi-word prompts.
- Repaired Bun command resolution, ignored/removed stale `.bun-build` output, and made CLI plus bridge build scripts cross-platform.
- Restored Windows CRLF-safe Anthropic SSE parsing and retained cache-token accounting.
- Added a bounded 429 circuit breaker for MiniMax/Kimi/Z.AI transports with regression coverage.
- Kept the active CLI typecheck clean and separated the legacy macOS bridge typecheck.
- Replaced the obsolete README dual-accounting claim with the current context ownership and MiniMax M3 1M behavior.
