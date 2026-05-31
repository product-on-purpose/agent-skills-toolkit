---
name: askit-build-mcp
description: Creates and improves MCP server definitions (a portable .mcp.json) for a plugin to the Advanced Skill Library Standard. Use when you need to add an MCP server to a plugin, author or extend .mcp.json, or wire the per-target mcpServers manifest pointer.
metadata:
  version: 0.1.0
  tier: universal
  audience: advanced
---

# askit-build-mcp

## Purpose
Author the plugin's MCP servers as one portable `.mcp.json` at the plugin root (the standard `{ "mcpServers": { ... } }` format) and wire the per-target `mcpServers` manifest pointer. Two modes: `create` adds a server; `improve` fixes findings. MCP is Universal-tier: the server definition is portable and both Claude and Codex ingest a bundled `.mcp.json` referenced by the native manifest's `mcpServers` pointer (Standard sec 3.9). Authoring depth is in [references/authoring-mcp.md](references/authoring-mcp.md). Follows the shared builder contract ([../../docs/reference/builder-pattern.md](../../docs/reference/builder-pattern.md)).

## When to use
When the user asks to add, scaffold, author, or improve an MCP server (tools, resources, or prompts via the Model Context Protocol) for a plugin.

## create mode
1. Brief interview: server name (kebab-case), transport (`stdio` or `http`), the `command` plus `args` (stdio) or the `url` (http), and any secrets as an env-var NAME (never an inline value). Skip the interview if these are already in context.
2. Author or extend the root `.mcp.json`: add the server under `mcpServers`. Copy `templates/mcp.json` if the file does not exist yet.
3. Register the server in `library.json` `components.mcpServers` as `{ name, version, tier, status }`.
4. Wire the per-target pointer: run `node scripts/generators/gen-manifest.mjs <plugin-root> --write --target=all`. Each native manifest gains `"mcpServers": "./.mcp.json"`.
5. Assess with `node scripts/evaluate.mjs . --json` and iterate to 0 errors (mcp-valid, the S3 components index, and the S6 per-target pointer).

## improve mode
1. Run `node scripts/evaluate.mjs . --json` and read the report.
2. For each finding: a malformed server (mcp-valid) -> add the missing `command` or `url`; a committed secret (mcp-valid) -> replace the inline value with an env-var reference or `bearer_token_env_var`; a missing pointer (S6) -> regenerate the manifests; an undeclared server (S3) -> add it to `components.mcpServers`. For any other finding, read its message and apply the fix it states.
3. Re-run evaluate to confirm.

## Scope
The root `.mcp.json` is the single authored source; the manifest pointers are generated, so never hand-edit a generated manifest. Secrets MUST be referenced from the environment, never committed (Standard sec 9). MCP is the one plugin-distributable component both agents ingest, and emission is just the manifest-pointer wiring (no per-type render engine, per the builder pattern).
