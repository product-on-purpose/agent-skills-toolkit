# Golden example: least-privilege settings for a linting plugin

**Demonstrates:** authoring a `settings.json` that combines a minimal permission allowlist, env indirection for a secret, and a hook registration - distinguishing what belongs in the committed plugin settings versus what stays in the user's own settings.
**Provenance:** authored by `askit-build-settings` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

User asked: "Set up settings for my code-guardian plugin. It runs `ruff` to lint Python files, guards a schema file from accidental edits, and calls a remote reporting API that needs an API key."

| Field | Value |
|---|---|
| Plugin name | `code-guardian` |
| Tools actually used | `Read` (inspect files before linting), `Bash` with two specific ruff commands |
| Hook to register | PreToolUse guard on Write/Edit calls to `schema.py` |
| Secret needed | `CODE_GUARDIAN_API_KEY` for a remote reporting endpoint |
| Targets | Claude Code (`settings.json`) |

---

## Output

### Committed plugin `settings.json`

This file lives at `<plugin-root>/settings.json` and is checked into the repository.

```json
{
  "permissions": {
    "allow": [
      "Read(**)",
      "Bash(npx ruff check *)",
      "Bash(npx ruff format --check *)"
    ],
    "deny": []
  },
  "env": {
    "RUFF_CONFIG": "${CLAUDE_PLUGIN_ROOT}/ruff.toml"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/protect-schema.mjs"
          }
        ]
      }
    ]
  }
}
```

**Least-privilege notes:**
- `Read(**)` is the narrowest grant that covers "all files the plugin may need to inspect before linting." If the plugin only lints a specific subtree, tighten to `Read(src/**)`.
- `Bash(npx ruff check *)` and `Bash(npx ruff format --check *)` name the exact commands used; `Bash(**)` or `Bash(npx *)` would be over-broad (sec 9).
- The hook `matcher: "Write|Edit"` fires on exactly the two tool types that can mutate files; `NotebookEdit` is excluded because the schema file is a `.py` file, not a notebook.
- `RUFF_CONFIG` is a non-secret path pointing at the bundled config file via `${CLAUDE_PLUGIN_ROOT}`. This is the correct place for a path constant.

---

### User's local settings (NOT committed - secret goes here, never in the plugin)

The API key must NOT appear in the plugin's committed `settings.json`. The user adds it to their own `~/.claude/settings.local.json` or the shell environment before loading the plugin:

```json
{
  "env": {
    "CODE_GUARDIAN_API_KEY": "cgk_..."
  }
}
```

Standard sec 9 rule: "A component needing a credential uses `env` indirection (the setting names the env var; the value lives in the environment, not the repo)." The plugin's code reads `process.env.CODE_GUARDIAN_API_KEY`; the plugin's settings declare only what env vars it expects (documented in the plugin's README), not their values.

---

### Plugin-appropriate versus user-level (the boundary)

| Key | Location | Why |
|---|---|---|
| `permissions.allow` | Plugin `settings.json` (committed) | Defines the least-privilege surface the plugin needs; ships with the plugin |
| `env.RUFF_CONFIG` | Plugin `settings.json` (committed) | A non-secret constant that travels with the plugin |
| `hooks` | Plugin `settings.json` (committed) | The hook registration is the plugin's behavior; it must ship with it |
| `env.CODE_GUARDIAN_API_KEY` | User `settings.local.json` (never committed) | A secret; its value must never appear in any committed file (sec 9) |
| `statusLine` | NOT here - `askit-build-statusline` owns this entry | Boundary from settings-recipe.md |

---

## Why this is golden

- **Least-privilege allowlist (Standard sec 9, settings-recipe.md rubric):** The `allow` list names two exact `Bash` command prefixes rather than a wildcard. Every granted entry is used by a real component. The `deny` list is empty because the allowlist already scopes narrowly - broad allows that need explicit denies are a design smell.
- **Secret hygiene (Standard sec 9):** The API key is never in the committed settings file. The golden shows the two-file split explicitly: plugin settings carry the non-secret env constant; the user's own settings carry the credential. This is the pattern the recipe requires: "the setting names the env var; the value lives in the environment, not the repo."
- **Hook registration (settings-recipe.md boundary):** The `hooks` block wires the `protect-schema.mjs` guard that `askit-build-hook` authors. This skill (settings) owns the wiring entry; the hook script itself is a separate concern. The boundary is stated plainly so a maintainer knows which builder to invoke for each concern.
- **Plugin-vs-user table:** The explicit table in the Output section makes the boundary mechanically clear: a reader can see at a glance which keys ship with the plugin and which the user supplies. This satisfies the least-privilege reasoning sec 9 asks for.
- **Tighten advice in-place:** The "least-privilege note" on `Read(**)` shows how to tighten the grant if the scope is known - not just what to write, but how to reason about over-grants. This is what the improve mode adds: the advice is part of the artifact.

## Verification

### JSON parse

```
node -e "JSON.parse(require('fs').readFileSync('<settings-path>','utf8')); console.log('OK')"
OK
```

Run against `C:/Users/jpris/AppData/Local/Temp/claude/.../scratchpad/code-guardian-settings.json` - real output, not invented.

### Link verification

No relative markdown links written in this file. All reference doc paths are cited as inline code.
