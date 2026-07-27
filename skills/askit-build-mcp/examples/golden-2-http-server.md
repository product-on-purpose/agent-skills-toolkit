# Golden example: an HTTP MCP server, self-contained and host-resolved

**Demonstrates:** the two shapes an `http` entry legitimately takes - a self-contained server with a parseable `https` url plus `bearer_token_env_var` indirection, and the managed connector `{"type":"http","url":""}` that `U11` deliberately warns on rather than erroring.
**Provenance:** authored by `askit-build-mcp` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

> "The status service already runs at status.example.com and speaks MCP. Wire it up. We also want the workspace mail connector the host provides, so the briefing skill can send the digest."

The create-mode interview (step 1), run once per server:

| Question | `service-status` | `workspace-mail` |
|---|---|---|
| Server name (kebab-case) | `service-status` | `workspace-mail` |
| Transport | `http` | `http` |
| URL | `https://status.example.com/mcp` | none - the host resolves it at runtime |
| Secrets (env-var NAMES only) | `bearer_token_env_var: EXAMPLE_STATUS_TOKEN` | none in the plugin; the host owns the auth |
| Declared targets | `claude`, `codex` | `claude`, `codex` |

## Output

### `.mcp.json` (authored, at the plugin root)

```json
{
  "mcpServers": {
    "service-status": {
      "type": "http",
      "url": "https://status.example.com/mcp",
      "bearer_token_env_var": "EXAMPLE_STATUS_TOKEN"
    },
    "workspace-mail": {
      "type": "http",
      "url": ""
    }
  }
}
```

### `library.json` (the `components.mcpServers` declaration, S3)

Both servers are declared. An undeclared server is an `S3` error, and so is a declaration that names no
real server, so this list is not bookkeeping.

```json
"components": {
  "mcpServers": [
    { "name": "service-status", "version": "0.1.0", "tier": "universal", "status": "active" },
    { "name": "workspace-mail", "version": "0.1.0", "tier": "universal", "status": "active" }
  ]
}
```

### `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` (generated, the S6 pointer)

```json
"mcpServers": "./.mcp.json"
```

### The stand-in server

`golden-2-http-server.mjs`, the runnable sibling of this file, plays the part of the remote service so
the verification below is a real request and a real response. It uses `node:http` and nothing else:
JSON-RPC 2.0 over `POST`, `protocolVersion` `"2025-06-18"`, one tool, and optional bearer auth read from
`EXAMPLE_STATUS_TOKEN`. In the real plugin no server file ships at all; the URL is the whole wiring.

## Why this is golden

- **There is no bundled server file to resolve, so the nonexistent-target defect class cannot occur
  here.** That is the substantive difference from golden example 1, not a phrasing difference. What
  replaces it as the thing the author must verify is two-part: **the URL answers**, and **the token in
  `.mcp.json` is a variable NAME, not a value**. Both are verified below.
- **`bearer_token_env_var` carries the NAME, sec 9.** `U11` errors on an inline `bearer_token`, on url
  userinfo (`https://user:pass@host`), and on a secretish query parameter - but its secret matcher is a
  16-character-plus alphanumeric pattern, so a short or punctuated token slips past it. Env indirection
  is the rule; the check is a backstop, never a secrets audit.
- **The managed connector is a WARNING on purpose, and the reason is recorded.**
  [ADR 0030 (calibrate U6 reference-links and U11 mcp-valid)](../../../docs/internal/decisions/0030-calibrate-u6-reference-links-and-u11-mcp-valid.md)
  records that Anthropic's own knowledge-work plugins ship `gmail` and `google calendar` as
  `{"type":"http","url":""}` suite-wide; erroring on it blocked the tier on 12 or more official plugins.
  A genuinely underspecified server - no `type`, no `command`, no `url` - is still an error, so the
  warning is a narrow, typed exception rather than a hole.
- **A warning is not a shrug.** Because the host supplies the endpoint, the plugin's docs have to say
  which host resolves it. That obligation is what the warning exists to prompt.
- **`U11`, `S3` and `S6` are all satisfied**, and `U8` cannot drift because the native manifests are
  generated from `library.json` rather than hand-edited.

## Verification

The demo plugin root used for this run:

```
_local/audit/eval-runs/2026-07-26/sandbox-2-service-status/
```

Create-mode step 5, the deterministic assessment:

```
$ node scripts/evaluate.mjs _local/audit/eval-runs/2026-07-26/sandbox-2-service-status
Evaluating (plugin): _local/audit/eval-runs/2026-07-26/sandbox-2-service-status
  [warn] U11: .mcp.json server "workspace-mail" declares type "http" with no url; treated as a host-resolved managed connector. If it is meant to be self-contained, add a url.  -> .mcp.json
  [error] G2: no CI workflow under .github/workflows/; Gold requires self-hosting CI that runs the conformance gate (Standard sec 2.6 G2, sec 4).  -> .github/workflows/
  [error] G5: RELEASE-NOTES.md is missing at the repository root; Gold requires a curated, user-facing RELEASE-NOTES.md distinct from CHANGELOG.md (Standard sec 2.6 G5, sec 10.6).  -> RELEASE-NOTES.md
  [error] G4: INDEX.md is missing; at Gold it is generated by gen-index and drift-checked (Standard sec 2.6 G4). Generate it: node scripts/generators/gen-index.mjs . --write  -> INDEX.md
  [error] G8: meaningful folder has no README.md (ADR 0024 D1.1); scaffold one with askit-build-docs folder-readme mode.  -> skills/status-briefing/README.md
Tier: convergent
4 error(s), 1 warning(s).
Real issues (objective + vendor-cited errors): 0
Profile conformance (house conventions, profile downgrades): 4   suppressed: 0
exit=0
```

The one `U11` line is the managed connector, at `warn`, exactly as designed. `service-status` produces
no finding. The four errors are Gold-tier scaffolding the throwaway demo plugin does not carry.

Now the part the gate cannot do: the URL has to answer. Start the stand-in on a local port:

```
$ node skills/askit-build-mcp/examples/golden-2-http-server.mjs 8931
service-status listening on http://127.0.0.1:8931/mcp
```

POST an `initialize` and a `tools/call`:

```
$ curl -s -X POST http://127.0.0.1:8931/mcp -H "content-type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"hand-check","version":"0"}}}'
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{}},"serverInfo":{"name":"service-status","version":"0.1.0"}}}

$ curl -s -X POST http://127.0.0.1:8931/mcp -H "content-type: application/json" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_status","arguments":{"service":"checkout-api"}}}'
{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"checkout-api: operational, 0 open incidents"}],"isError":false}}
```

Then the second obligation: the credential travels as an environment value, and only its NAME is in
`.mcp.json`. Restarted with the variable set, the same endpoint refuses an unauthenticated request and
accepts an authenticated one:

```
$ EXAMPLE_STATUS_TOKEN=local-dev-not-a-real-secret \
    node skills/askit-build-mcp/examples/golden-2-http-server.mjs 8932
service-status listening on http://127.0.0.1:8932/mcp

$ curl -s -i -X POST http://127.0.0.1:8932/mcp -H "content-type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | head -1
HTTP/1.1 401 Unauthorized

$ curl -s -X POST http://127.0.0.1:8932/mcp -H "content-type: application/json" \
    -H "authorization: Bearer local-dev-not-a-real-secret" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{}},"serverInfo":{"name":"service-status","version":"0.1.0"}}}
```

Both listeners were then stopped. Note what never appeared in any committed file: the token value. It
lived in the launching shell's environment and in the request header, which is the whole point of
`bearer_token_env_var`.

## See also

- [../SKILL.md](../SKILL.md) - the create-mode procedure this run followed.
- [../references/authoring-mcp.md](../references/authoring-mcp.md) - choosing a transport, the secrets
  rules, and the managed-connector exception.
- [../../../STANDARD.md](../../../STANDARD.md) - sec 3.9 (MCP server), sec 9 (secrets).
