# askit-build-mcp (reference)

Authors a plugin's MCP servers as one portable `.mcp.json` and wires the per-target `mcpServers` manifest pointer. Universal tier.

## Modes
- `create`: interview (name, transport, command/args or url, env-var names), author or extend `.mcp.json`, register in `library.json` `components.mcpServers`, run `gen-manifest --write --target=all`, evaluate to 0 errors.
- `improve`: consume evaluate findings (malformed server, committed secret, missing pointer, undeclared server) and fix each.

## Checks it must satisfy
- **mcp-valid (U11):** each server is well-formed (stdio has `command`, http has `url`) and commits no inline secret (use env-var references or `bearer_token_env_var`).
- **S3 (components-index):** every `.mcp.json` server is declared in `components.mcpServers`, and vice versa.
- **S6 (per-target, component-level):** when `.mcp.json` exists, each declared target's native manifest carries the `mcpServers` pointer.

## Notes
One `.mcp.json` at the plugin root holds all servers; the manifest pointers are generated (never hand-edit them). The user-level `config.toml` `mcp_servers` table is a separate, non-plugin path (Standard sec 3.9). See the [build-an-mcp-server how-to](../how-to/build-an-mcp-server.md) and the [authoring-mcp reference](../../skills/askit-build-mcp/references/authoring-mcp.md).
