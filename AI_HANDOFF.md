# AI Handoff

## Current state
- Branch / commit: `main` / `ab3f13bb9f5e5633462c05c19e567957d0b67d2d`
- Last agent: Codex
- Updated: 2026-07-18 12:56 HKT

## Completed
- Reviewed the stale fork and active global installation.
- Confirmed the active launcher uses global Claudish 7.2.0 while the repo and standalone EXE are 6.4.5.
- Confirmed MiniMax M3 works, with real 1M context tracked through Claudish dual accounting.
- Reproduced Windows multi-word prompt loss through `claude.cmd`; `CLAUDE_PATH` pointing to the native `claude.exe` fixes it.
- Found 2,141 final MiniMax HTTP 429 errors in one session and raw API-key exposure in `--probe --json`.

## Verification
- M3 focused tests: 81 passed, 7 real-API tests skipped.
- Typecheck fails because `packages/cli/tsconfig.json` references missing `packages/core`.
- Windows build bundles successfully but exits on unavailable `chmod`.
- Existing lint baseline: 518 errors and 523 warnings.

## Decisions / constraints
- Preserve all pre-existing uncommitted M3 changes before syncing upstream.
- Do not rotate or modify credentials without separate approval.
- Upgrade the active runtime and fork, then add the smallest Windows and rate-limit fixes still missing upstream.

## Next handoff
- Commit the pre-revival state on a backup branch, fetch upstream 7.15.0, and compare the fork-specific Windows changes before integration.
