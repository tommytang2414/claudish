# Claudish Project Guidance

Read `CLAUDE.md` and `AI_HANDOFF.md` before work. Follow the shared workflow in `C:\Users\User\AGENTS.md`.

## Local runtime

- `C:\Users\User\bin\claudish.ps1` is the user-facing launcher.
- Prefer the native Claude Code executable via `CLAUDE_PATH`; using the npm `claude.cmd` shim can break multi-word prompts on Windows.
- Use `C:\Users\User\.bun\bin\bun.exe` for verification until the stale extensionless `C:\Users\User\bin\bun` is removed from command resolution.
- Never include raw `--probe --json` output in logs or reports because current Claudish versions serialize credential provenance with an unmasked `effectiveValue`.

## Verification

- Run focused tests for changed code.
- Run CLI typecheck, lint, and build with the native Bun executable.
- Verify both a single-word and a quoted multi-word headless prompt through `C:\Users\User\bin\claudish.ps1`.

## Changelog

### 2026-07-18 — Revival started

- Documented the active Windows launcher, native Claude executable requirement, Bun command-resolution issue, and probe credential-output hazard before upgrading the stale fork.
