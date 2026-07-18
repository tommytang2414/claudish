# AI Handoff

## Current state

- Branch / commit: `main` / merge baseline `5a73355`; revival changes are ready to commit.
- Last agent: Codex
- Updated: 2026-07-18 HKT

## Completed

- Pushed pre-revival state to `backup/pre-revival-20260718` at `0823846`.
- Merged upstream v7.15.0 into `main`, excluding upstream `.claude/settings.json` because it auto-enabled plugins.
- Fixed Windows Claude/Bun launch paths, cross-platform builds, Anthropic SSE CRLF parsing, and 429 retry storms.
- Installed the patched local v7.15.0 package globally; daily launchers default to `mm@MiniMax-M3`.

## Verification

- `bun run typecheck`: pass (active CLI).
- `bun run build`: pass (CLI and macOS bridge bundles on Windows).
- Targeted Anthropic/MiniMax/error tests: 80 pass, 0 fail.
- `claudish --version`: 7.15.0.
- Daily launcher multi-word prompt `Reply with exactly OK`: returned `OK`.
- Full unfiltered `bun test`: terminated after more than three minutes with no output; use bounded groups.

## Decisions / constraints

- Keep native `claude.exe` ahead of `claude.cmd` on Windows.
- The legacy macOS bridge still has pre-existing type errors exposed by `bun run typecheck:bridge`; it is outside the active Windows CLI path.
- Do not share raw `--probe --json` output and do not commit credentials.
- Do not reintroduce the upstream plugin-enabling `.claude/settings.json` without explicit approval.

## Next handoff

- When a real provider 429 next occurs, confirm the log shows two bounded retries followed by `429 circuit open`, and adjust the 5–60 second cooldown only if provider evidence warrants it.
