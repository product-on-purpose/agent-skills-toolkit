# Codex Round-Trip Integration Test - Local Pass Log

Date: 2026-05-28

## codex version

```
codex-cli 0.135.0
```

## Command run

```
node --test tests/integration/codex-roundtrip.test.mjs
```

## Result

PASSED (1 test, 0 skipped, 0 failed).

The test ran for real - codex was found via `shell: true` on Windows (required because Node.js
`spawnSync` cannot resolve `.cmd` wrappers without it on Windows).

### Round-trip path

1. Built a throwaway local marketplace in a temp dir (`%TEMP%\askit-codex-rt-*`).
2. Copied the toolkit's `.codex-plugin/plugin.json` into `plugins/agent-skills-toolkit/.codex-plugin/plugin.json`.
3. Wrote a probe skill to `plugins/agent-skills-toolkit/skills/probe/SKILL.md`.
4. Registered the marketplace: `codex plugin marketplace add <tmpdir>` - exit 0.
5. Listed: `codex plugin list --marketplace askit-rt-test` - confirmed `agent-skills-toolkit` appears.
6. Installed: `codex plugin add agent-skills-toolkit@askit-rt-test` - exit 0.

### Install root parsed from output

```
C:\Users\jpris\.codex\plugins\cache\askit-rt-test2\agent-skills-toolkit\0.1.0
```

(The `askit-rt-test2` suffix is from a manual verification run; the automated test uses `askit-rt-test`.)

### Skill ingestion confirmed

`skills/probe/SKILL.md` was present at `<install-root>/skills/probe/SKILL.md` - ingestion verified.

### Cleanup

The `finally` block ran `codex plugin remove agent-skills-toolkit@askit-rt-test` and
`codex plugin marketplace remove askit-rt-test` before deleting the temp dir.
`codex plugin marketplace list` after the test shows no `askit-rt-test` entry.

## Full suite

`npm test` - 107 tests, 107 pass, 0 fail, 0 skipped.

## Note on Windows shell fix

The task spec used `spawnSync("codex", ...)` without options. On Windows this hits ENOENT because
Node.js does not search for `.cmd` wrappers without `shell: true`. Added `const SHELL = process.platform === "win32"`
and a `cx()` helper that passes `shell: SHELL` to all `spawnSync` calls. The logic is otherwise
identical to the spec.
