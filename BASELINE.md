# Baseline

Recorded on 20 September 2026 before outer-shell changes. Base commit: `dfa7a46313e6258916f67af592bd7d959bef62ac`.

The worktree already contained substantial tracked and untracked changes, including protected interview/discovery files and `package-lock.json`. Those pre-existing changes are preserved as the protected-zone baseline and are not part of this maintenance work.

## Tests

Command: `npm.cmd test`

Result: **FAIL (baseline)** — 85 tests, 79 passed, 6 failed.

- Five PocketBase integration tests failed because network access was denied (`fetch failed`, `EACCES`).
- `tests/discovery.test.mjs` failed because the already-deleted `lib/discovery-core.mjs` module could not be imported.

No baseline failures were fixed.

## Lint

Command: `npm.cmd run lint`

Result: **UNAVAILABLE (baseline)** — `package.json` has no `lint` script (`Missing script: "lint"`). No lint configuration or dependency was added.

Note: invoking `npm test` through PowerShell first hit the host execution policy for `npm.ps1`; `npm.cmd test` was then used successfully to run the configured suite.
