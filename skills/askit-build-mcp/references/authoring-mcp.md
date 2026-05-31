# Authoring an MCP server (reference)

The bar for a conformant MCP server entry in a plugin's `.mcp.json`.

## One file, all servers

A plugin declares all its MCP servers in one portable `.mcp.json` at the plugin root, in the standard format that Claude and Codex both read:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./mcp/server.mjs"],
      "env": { "MY_SERVICE_TOKEN": "" }
    }
  }
}
```

Each native manifest (`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`) references it with a generated `"mcpServers": "./.mcp.json"` pointer. Do not put MCP entries in `config.toml`: that is the user-level path (`codex mcp add|list`), not the plugin's.

## Well-formed (mcp-valid, U11)

- A **stdio** server declares `command` (and usually `args`).
- An **http** server declares `url`.
- Every server is an object under `mcpServers.<name>`.

## Secrets (Standard sec 9)

Never commit a credential inline. Reference it from the environment:

- stdio: put the var NAME in `env` with an empty or placeholder value (`"MY_SERVICE_TOKEN": ""`); the value is supplied by the runtime environment.
- http: use `bearer_token_env_var` (the env-var name), not an inline `bearer_token`.

`mcp-valid` flags an inline value under a credential-looking key as an error.

## Registration

- Declare each server in `library.json` `components.mcpServers` (`{ name, version, tier, status }`); the S3 components index check requires every `.mcp.json` server to be declared and vice versa.
- Regenerate manifests so each declared target carries the `mcpServers` pointer (the S6 component-level check).
