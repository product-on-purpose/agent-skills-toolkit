# Authoring an MCP server (reference)

How to wire a plugin's MCP servers so they actually start on someone else's machine, and how the three
manifest checks that surround them differ. The contract is [STANDARD.md](../../../STANDARD.md) sec 3.9
(MCP server) and sec 9 (secrets); the procedure is in [the skill itself](../SKILL.md).

The theme of this page is that **the gate can prove your `.mcp.json` is well-formed and cannot prove
your server exists**. Everything below is organized around that gap.

## One file, all servers

A distributed plugin declares every MCP server in one portable `.mcp.json` at the plugin root, in the
standard format both Claude and Codex read:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/server.mjs"],
      "env": { "MY_SERVICE_TOKEN": "" }
    }
  }
}
```

Each native manifest (`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`) references it with a
generated `"mcpServers": "./.mcp.json"` pointer. This is the one path for both agents (sec 3.9).

Do **not** put plugin MCP entries in `config.toml`. The user-level `mcp_servers` table managed by
`codex mcp add|list` is a separate, non-plugin path: a server registered there belongs to the user, not
to your plugin, and it will not travel with an install.

## Paths: the defect that ships most often

A bundled server is launched **by the agent, on a machine you have never seen, from a working
directory that is the user's project**, not your plugin. So a bare relative path is not a path to your
file:

```json
"args": ["./mcp/server.mjs"]
```

That resolves against the agent's working directory. On the author's machine, sitting in the plugin
repo, it appears to work. Installed anywhere else it resolves to a file that does not exist, and the
server simply never starts.

Use the plugin-root variable. The vendor-documented expansion points are specific, so it is worth
knowing which fields accept it:

| Variable | Means | Expands in |
|---|---|---|
| `${CLAUDE_PLUGIN_ROOT}` | the plugin's installation directory | stdio `command`, `args`, `env`; http/sse/ws `url`, `headers`, `headersHelper` |
| `${CLAUDE_PLUGIN_DATA}` | persistent data that survives plugin updates | the same fields |
| `${CLAUDE_PROJECT_DIR}` | the user's project root | the same fields |

```json
"command": "node",
"args": ["${CLAUDE_PLUGIN_ROOT}/mcp/server.mjs"]
```

`${CLAUDE_PLUGIN_ROOT}` is also correct in `command` itself when the server is a bundled executable
rather than a script handed to an interpreter.

## The recorded defect: a server file that does not exist

This repository's own [templates/mcp.json](../../../templates/mcp.json) shipped this line, in every
release the template was in:

```json
"args": ["./mcp/example-server.mjs"]
```

There was no `mcp/` directory anywhere in the tree. Two defects in one line - the wrong path form, and
a target that does not exist - and the gate reported 0 errors on it the whole time.

The template is fixed: its `args` slot is now an explicit `REPLACE-` placeholder under
`${CLAUDE_PLUGIN_ROOT}`, so a copied-but-unedited scaffold is obviously unfinished instead of silently
broken. The defect itself is preserved as a worked anti-example -
[anti-nonexistent-server-file.md](../examples/anti-nonexistent-server-file.md) quotes what shipped,
separates the two defects, and demonstrates the gate's silence against the live checker.

What the fix does not change is the gap this page is about, and that gap is not a bug in the gate.
`U11` ([mcp-valid.mjs](../../../scripts/checks/mcp-valid.mjs)) checks
that a stdio server declares a non-empty `command` **string**; sec 3.9's "a referenced `command` SHOULD
be resolvable" is a SHOULD, and no check implements it (resolving an arbitrary launch command portably
is not a thing a deterministic, model-free, cross-platform gate can do). So the deterministic layer
proves your JSON is well-formed and proves nothing about whether the process starts.

The authoring rule that follows: **a golden MCP example is one you have actually launched.** Before
you call it done, run the exact `command` plus `args` yourself from a directory that is not the plugin
root, with the plugin-root variable substituted by hand, and confirm the process comes up and speaks
MCP. If you cannot run it, you have written a configuration, not a server.

## What U11 does and does not catch

| U11 checks | U11 does not check |
|---|---|
| a stdio server has a non-empty `command` | that the command exists or can run |
| an http server has a parseable `http(s)` `url` | that the URL answers |
| every server is an object under `mcpServers.<name>` | that the server implements MCP |
| no obvious inline credential | that the credential you referenced is set |

It **fails closed**: a present-but-unparseable `.mcp.json`, or one with no valid `mcpServers` object,
is an error, never silently treated as "this plugin has no servers".

**The managed-connector exception.** A server typed `http` with an empty or absent `url` is a WARNING,
not an error: the host supplies the endpoint at runtime. This is not a loophole, it is the recorded
official convention. ADR 0030
([calibrate U6 and U11](../../../docs/internal/decisions/0030-calibrate-u6-reference-links-and-u11-mcp-valid.md))
records that Anthropic's knowledge-work plugins ship `gmail` and `google calendar` as
`{"type":"http","url":""}` suite-wide, and that erroring on it blocked the tier on 12 or more official
plugins. If you are authoring one, type it `http` deliberately and say in the plugin docs which host
resolves it. A genuinely underspecified server (no type, no command, no url) is still an error.

## Secrets (sec 9)

Never commit a credential. Reference it from the environment:

- **stdio:** put the variable NAME in `env` with an empty or placeholder value
  (`"MY_SERVICE_TOKEN": ""`); the runtime supplies the value.
- **http:** use `bearer_token_env_var` (the name of the variable), never an inline `bearer_token`.
- **never** put credentials in the URL, as userinfo (`https://user:pass@host`) or as a query parameter.

`U11` errors on an inline value under a credential-looking key, on an inline `bearer_token`, on URL
userinfo, and on a secretish query parameter. Know its limits so you do not treat a green gate as a
secrets audit: it matches a key name containing token / secret / key / password / api_key / bearer
against a value of at least 16 characters from `[A-Za-z0-9_-]`. A short token, or one containing
punctuation, slips through. Env indirection is the rule; the check is a backstop.

## The manifest-vs-disk contract: three obligations, not one

Authors conflate these constantly, and each has a different fix. When you ship an MCP server, all
three apply:

| Check | The obligation | Failure direction | Standard |
|---|---|---|---|
| `S3` (components-index) | every server in `.mcp.json` is declared in `library.json` `components.mcpServers`, and every declaration names a real server | **both**: an undeclared server errors, and a dangling declaration errors | sec 5.1, 10.3 |
| `S6` (per-target-presence) | if the plugin ships any MCP server, each declared `agent-targets` entry's native manifest carries exactly `"mcpServers": "./.mcp.json"` | a missing or differing pointer errors, per target | sec 3.9, 10.1 |
| `U8` (manifest-drift) | each native manifest's `name` and `version` equal `library.json`'s | version drift is an **error**, name drift a warn | sec 5, G4 |

Two things follow.

**Never hand-edit a generated manifest.** All three are satisfied by regenerating:

    node scripts/generators/gen-manifest.mjs . --write --target=all

A hand-edited generated file is itself an error at `G4` by design (sec 2.6). `library.json` is the
authored source of truth; the native manifests are output.

**`S6` compares the pointer literally.** It looks for the exact string `./.mcp.json`. A pointer written
as `.mcp.json` or `./../.mcp.json` fails even though it might resolve, which is deliberate: the
generated form is one string, and accepting variants would make drift undetectable.

**Why version drift is an error and not a warn.** It is the exact invariant the release tag guard
enforces, so a single `node scripts/check.mjs .` has to fail on it rather than leaving a green gate
that the tag job then rejects
([manifest-drift.mjs](../../../scripts/checks/manifest-drift.mjs) says so in its own comment).

**The wider lesson: manifest-vs-disk drift is the failure class that ships silently.** Sensor reading
12 in [eval-runs.md](../../../docs/internal/eval-runs/eval-runs.md) records a real plugin whose
manifest registered 47 of its 49 on-disk skills, making the two newest invisible to installers. No user
files a bug about a capability that simply is not there. That reading became ADR 0035 and the `U13`
skill-registration check; `S3` is the same guarantee for MCP servers, and it is the reason the
declaration step is not bookkeeping.

## Choosing a transport

| Choose stdio when | Choose http when |
|---|---|
| the server is code you bundle in the plugin | the service is remote and already running |
| the server is a package you can `npx` | the host supplies the endpoint (the managed-connector pattern) |
| it needs local filesystem or process access | you want no local process per session |
| you can guarantee the runtime is present | authentication is a bearer token from the environment |

The consequence of stdio is a runtime dependency you must declare: if the server is
`node ${CLAUDE_PLUGIN_ROOT}/mcp/server.mjs`, the plugin now requires Node on the user's machine, and
`compatibility` or `engines` should say so (sec 3.1, sec 5.1).

## Do not invent fields

Section 3.9 describes a server as exposing `tools`, `resources`, and `prompts`. That is a description
of the protocol surface, not of the `.mcp.json` schema: the server advertises its own capabilities at
the MCP handshake. Adding `"tools": [...]` or `"resources": [...]` to a `.mcp.json` entry documents
nothing, is read by nobody, and drifts the moment the server changes. If a reader needs to know what
the server offers, put that in the plugin's docs or the server's own README.

## Validate

    node scripts/evaluate.mjs . --json

Then, because the gate cannot: launch the server by hand from outside the plugin root and confirm it
starts.

## See also

- [STANDARD.md](../../../STANDARD.md) - sec 3.9 (MCP server), sec 9 (secrets and least privilege),
  sec 5.1 (`library.json` schema), sec 10.1 (layout).
- [Universal checks](../../../docs/reference/universal-checks.md) - `U8`, `U11`, `U13`.
- [Silver checks](../../../docs/reference/silver-checks.md) - `S3`, `S6`.
- [The builder pattern](../../../docs/reference/builder-pattern.md) - why MCP has no per-type render
  engine and the manifest pointer is the whole emission story.
