# Golden example: a stdio server that exposes resources

**Demonstrates:** a bundled server whose protocol surface is wider than tools alone (`resources/list` and `resources/read`), and why that surface is advertised by the server at the handshake rather than copied into the `.mcp.json` entry.
**Provenance:** authored by `askit-build-mcp` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

> "Put our naming and review conventions behind an MCP server so the review skill can read them, and give it a tool that checks a name. The conventions should be readable documents, not tool output."

The create-mode interview (step 1):

| Question | Answer |
|---|---|
| Server name (kebab-case) | `team-conventions` |
| Transport | `stdio` - the documents ship with the plugin |
| Command | `node` |
| Args | `${CLAUDE_PLUGIN_ROOT}/mcp/team-conventions-server.mjs` |
| Protocol surface | 2 resources plus 1 tool |
| Secrets (env-var NAMES only) | none; one non-secret knob, `CONVENTIONS_PROFILE` |
| Declared targets | `claude`, `codex` |

"Readable documents, not tool output" is the whole reason this is a resource server. A resource has a
uri and a mime type and is read on demand; a tool is called with arguments and does something.

## Output

### `.mcp.json` (authored, at the plugin root)

```json
{
  "mcpServers": {
    "team-conventions": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/team-conventions-server.mjs"],
      "env": {
        "CONVENTIONS_PROFILE": ""
      }
    }
  }
}
```

Two resources and a tool, and the entry says nothing about any of them. That is correct.

### Wrong shape and right shape, side by side

```json
// WRONG - do not copy. "resources" and "tools" are not fields of a .mcp.json entry.
"team-conventions": {
  "command": "node",
  "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/team-conventions-server.mjs"],
  "resources": ["conventions://naming", "conventions://review"],
  "tools": ["check_name"]
}
```

```json
// RIGHT - the launch contract only. The surface comes from the handshake.
"team-conventions": {
  "command": "node",
  "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/team-conventions-server.mjs"],
  "env": { "CONVENTIONS_PROFILE": "" }
}
```

Standard sec 3.9 lists `tools`, `resources` and `prompts` when it describes what a server exposes. That
sentence describes the **protocol**, not the `.mcp.json` **schema**. Invented fields are read by nobody
and go stale the first time the server changes. The gate will not stop you either, which is exactly why
this is a lesson and not a check: `U11` on the wrong shape above returns an empty finding list (run in
the verification section).

### `library.json` (the `components.mcpServers` declaration, S3)

```json
"components": {
  "mcpServers": [
    { "name": "team-conventions", "version": "0.1.0", "tier": "universal", "status": "active" }
  ]
}
```

### `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` (generated, the S6 pointer)

```json
"mcpServers": "./.mcp.json"
```

### The server itself

The runnable sibling of this file is `golden-3-resources-server.mjs`. In the demo plugin it is installed
at the path the config launches, `mcp/team-conventions-server.mjs`. It declares
`capabilities: { tools: {}, resources: {} }` at `initialize` and answers `resources/list`,
`resources/read`, `tools/list` and `tools/call`.

## Why this is golden

- **The protocol surface is advertised, never declared.** The `resources/list` response below is the
  only place the resource inventory exists. This is the craft doc's "do not invent fields" rule made
  concrete, and it is the reason golden example 1's entry carries no `tools` array either.
- **`capabilities` is part of the contract.** A server that answers `resources/read` but omits
  `resources` from its `initialize` capabilities is lying to the client. The handshake below shows both
  advertised.
- **Same `${CLAUDE_PLUGIN_ROOT}` discipline as golden 1, wider surface.** The transport and path rules
  do not change with the protocol surface, which is the point of showing a third stdio server rather
  than a third phrasing of the first one.
- **`U11`, `S3` and `S6` are all satisfied**, and `U8` cannot drift because the native manifests are
  generated from `library.json`.
- **A bundled Node server is a runtime dependency.** Sec 3.1 and sec 5.1: if the plugin ships
  `node ${CLAUDE_PLUGIN_ROOT}/mcp/...`, `compatibility` or `engines` has to say Node is required.

## Verification

The demo plugin root used for this run:

```
_local/audit/eval-runs/2026-07-26/sandbox-3-team-conventions/
```

Install the server at the path the config names:

```
$ cp skills/askit-build-mcp/examples/golden-3-resources-server.mjs \
     _local/audit/eval-runs/2026-07-26/sandbox-3-team-conventions/mcp/team-conventions-server.mjs
```

Create-mode step 5, the deterministic assessment:

```
$ node scripts/evaluate.mjs _local/audit/eval-runs/2026-07-26/sandbox-3-team-conventions
Evaluating (plugin): _local/audit/eval-runs/2026-07-26/sandbox-3-team-conventions
  [error] G2: no CI workflow under .github/workflows/; Gold requires self-hosting CI that runs the conformance gate (Standard sec 2.6 G2, sec 4).  -> .github/workflows/
  [error] G5: RELEASE-NOTES.md is missing at the repository root; Gold requires a curated, user-facing RELEASE-NOTES.md distinct from CHANGELOG.md (Standard sec 2.6 G5, sec 10.6).  -> RELEASE-NOTES.md
  [error] G4: INDEX.md is missing; at Gold it is generated by gen-index and drift-checked (Standard sec 2.6 G4). Generate it: node scripts/generators/gen-index.mjs . --write  -> INDEX.md
  [error] G8: meaningful folder has no README.md (ADR 0024 D1.1); scaffold one with askit-build-docs folder-readme mode.  -> skills/conv-review/README.md
Tier: convergent
4 error(s), 0 warning(s).
Real issues (objective + vendor-cited errors): 0
Profile conformance (house conventions, profile downgrades): 4   suppressed: 0
exit=0
```

The wrong shape, put directly to the checker so the claim above is not taken on trust:

```
$ node --input-type=module -e "
import { check } from './scripts/checks/mcp-valid.mjs';
const def = { command: 'node', args: ['\${CLAUDE_PLUGIN_ROOT}/mcp/team-conventions-server.mjs'], resources: ['conventions://naming','conventions://review'], tools: ['check_name'] };
console.log(JSON.stringify(check({ mcpServers: [{ name: 'team-conventions', def }] })));
"
[]
```

No finding. The invented fields are silently accepted and silently useless.

Now the part the gate cannot do, launched from the worktree root (not the plugin root) with
`${CLAUDE_PLUGIN_ROOT}` substituted by hand:

```
$ printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"hand-check","version":"0"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"resources/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"resources/read","params":{"uri":"conventions://naming"}}' \
  '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"check_name","arguments":{"name":"Team_Conventions"}}}' \
  | node "E:/Projects/product-on-purpose/agent-skills-toolkit/.claude/worktrees/agent-ac1d4a8aa5421c1f1/_local/audit/eval-runs/2026-07-26/sandbox-3-team-conventions/mcp/team-conventions-server.mjs"
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{},"resources":{}},"serverInfo":{"name":"team-conventions","version":"0.1.0"}}}
{"jsonrpc":"2.0","id":2,"result":{"resources":[{"uri":"conventions://naming","name":"Naming conventions","description":"How components are named in this team's plugins.","mimeType":"text/markdown"},{"uri":"conventions://review","name":"Review conventions","description":"What a reviewer checks before approving a plugin change.","mimeType":"text/markdown"}]}}
{"jsonrpc":"2.0","id":3,"result":{"contents":[{"uri":"conventions://naming","mimeType":"text/markdown","text":"# Naming\n\n- Skill directories and skill names are kebab-case and identical.\n- Tool names are snake_case.\n"}]}}
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"\"Team_Conventions\" is not kebab-case"}],"isError":false}}
```

The resource inventory in that second response is the authoritative one. Nothing in `.mcp.json`
duplicates it, so nothing in `.mcp.json` can go stale.

## See also

- [../SKILL.md](../SKILL.md) - the create-mode procedure this run followed.
- [../references/authoring-mcp.md](../references/authoring-mcp.md) - the "do not invent fields" rule and
  the transport table.
- [../../../STANDARD.md](../../../STANDARD.md) - sec 3.9 (MCP server), sec 5.1 (`library.json` schema).
