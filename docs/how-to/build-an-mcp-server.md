# How to build an MCP server

Add a Model Context Protocol server to a plugin: author the portable `.mcp.json`, register it, and wire the manifest pointer.

## 1. Create

Invoke `askit-build-mcp` (create mode). It asks for the server name, transport (`stdio` or `http`), the `command`/`args` or `url`, and any secrets as env-var NAMES. It writes the server into the root `.mcp.json` (copying `templates/mcp.json` if the file does not exist).

## 2. Register

Add the server to `library.json` `components.mcpServers` as `{ name, version, tier, status }`.

## 3. Wire the pointer

    node scripts/generators/gen-manifest.mjs . --write --target=all

Each native manifest gains `"mcpServers": "./.mcp.json"`.

## 4. Validate

    node scripts/evaluate.mjs . --json

Fix any mcp-valid (malformed server / committed secret), S3 (undeclared server), or S6 (missing pointer) findings, and iterate to `0 error(s)`.

## Secrets

Never commit a credential. Use an env-var reference: `"MY_TOKEN": ""` under `env` for stdio, or `bearer_token_env_var` for http. See [authoring-mcp](../../skills/askit-build-mcp/references/authoring-mcp.md).

## See also

- [`askit-build-mcp` reference](../reference/askit-build-mcp.md)
- [Conformance and tiers](../explanation/conformance-and-tiers.md)
