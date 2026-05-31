# Phase 3C-2c Design - build-mcp (+ sec 3.9 correction, component-level S6, ingestion round-trip)

> Design doc (2026-05-29). Canonical inputs: `STANDARD.md` (v0.8, on main; sec 3.9 MCP server, sec 5 component index, sec 10.1 layout), `RELEASE-PLAN.md` (Phase 3 builders, R4), `builder-skills-catalog.md` (Area 9), `PHASE-3C-2b-{DESIGN,PLAN}.md` (the slice + two-stage-review pattern + `builder-pattern.md` to reuse), `spikes/2026-05-27_codex-plugin-format.md` (the MCP pins: plugin MCP = bundled `.mcp.json`; sec 3.9 wrong; the SYNTHESIS).
> Status: DESIGN (not yet maintainer-reviewed). Gitignored working doc. Phase 3 decomposition: 3A/3B/3C-1/3C-2a/3C-2b DONE -> **3C-2c = THIS (build-mcp)** -> 3C-2d+ (build-hook, build-workflow, build-chain-contract, build-agents-md, build-output-style; each reuses `builder-pattern.md`).

## Goal

Ship `build-mcp` (authors an MCP component: a bundled `.mcp.json` server definition + the per-target manifest pointers that register it). Correct STANDARD sec 3.9 (plugin MCP is a bundled `.mcp.json`, NOT `config.toml mcp_servers`). Add an MCP-validity check + the deferred component-level per-target S6 (MCP is the first plugin-distributable, both-ingestible dual-target component). Verify INGESTION via a round-trip. MCP is Universal-tier, so the toolkit stays Silver; build-mcp reuses the `builder-pattern.md` shape from 3C-2b (it is NOT a render-engine harness - per the spike SYNTHESIS, gen-manifest does the per-target wiring).

After 3C-2c: the toolkit ships a 5th builder skill (`askit-build-mcp`), the mcp-valid check, component-level S6, the sec 3.9 correction. No MCP dogfood (the toolkit has no MCP server; YAGNI) - proven via fixtures + round-trip.

## Confirmed facts (from the spike note; re-verify codex --version at build time)

- **MCP IS plugin-distributable AND ingested** (unlike subagents). `plugin.json` has a top-level `"mcpServers": "./.mcp.json"` pointer. Installed plugins' MCP servers register in the Codex runtime (GH #17360 - though the MCP Settings UI does not list them; runtime registration is real, visibility tooling is incomplete).
- **The plugin `.mcp.json` is the standard, PORTABLE MCP format** (the same one Claude uses): `{ "mcpServers": { "<name>": { "command": "...", "args": [...], "env": {...} } } }`; HTTP servers use `{ "url": "...", "bearer_token_env_var": "...", "http_headers": {...} }`. ONE `.mcp.json` at plugin root holds ALL the plugin's servers. Both native manifests reference it via their `mcpServers` pointer. (`config.toml [mcp_servers.<name>]` is the USER-level form; `codex mcp add|list` manages those - NOT the plugin's.)
- **=> STANDARD sec 3.9 is WRONG** ("the plugin's `config.toml` mcp_servers entries"). Correct: a distributed plugin registers MCP via a bundled `.mcp.json` referenced by the manifest `mcpServers` pointer.

## Locked design calls (recommended; maintainer to confirm)

- **Canonical = ONE `.mcp.json` at the plugin root** (the standard portable format, holding all servers as `{ "mcpServers": { name: {...} } }`). NOT per-server files (MCP differs from skills/subagents/commands - it is a single shared config). The native manifests reference it via the `mcpServers` pointer. Single-source: the `.mcp.json` is authored; the pointers are generated; never hand-edit a generated manifest.
- **Per-target emission = a `gen-manifest` extension, NOT a `gen-mcp.mjs`.** When a `.mcp.json` exists, `renderClaudeNativeManifest` + `renderCodexNativeManifest` each add `"mcpServers": "./.mcp.json"`. This is the manifest-pointer wiring `builder-pattern.md` describes - no new render engine (the spike SYNTHESIS). `manifest.generated.json` also indexes the servers.
- **`library.json components.mcpServers`** indexes the server NAMES (`{ name, version, tier, status }`; no per-server `path` since they share `.mcp.json` - or `path: ".mcp.json"` for all). S3 validates: each declared server name is a key in `.mcp.json`'s `mcpServers`, and vice versa.
- **No dogfood** (the toolkit has no MCP server; inventing one violates YAGNI). mcp-valid + component-S6 proven via golden/anti fixtures + the round-trip. (A real-repo dogfood would only happen if the toolkit ever needs an external tool.)
- **Round-trip verifies what is verifiable** (install succeeds; the install cache contains the `.mcp.json`; codex does not reject it) and cites #17360 for runtime registration (the CLI visibility bug means `codex mcp list` may not show plugin servers - do NOT treat its absence as a failure). Graceful-skip when codex absent.

## Architecture

### 1. Task A - re-verify + pin the round-trip (FIRST; the genuine unknown)
Re-verify `codex --version`. Build a probe plugin (`.codex-plugin/plugin.json` with `"mcpServers": "./.mcp.json"` + a `.mcp.json` with one stdio server, e.g. `{ "mcpServers": { "probe": { "command": "node", "args": ["-e", "process.exit(0)"] } } }`) + a local marketplace; `codex plugin marketplace add <path>`, `codex plugin add probe-plugin@<mp>`; confirm the install cache contains the plugin's `.mcp.json` and codex accepts the plugin (no load error). Pin the exact accepted `.mcp.json` shape + the manifest pointer in the spike note. (Per #17360, do not rely on `codex mcp list` showing the server; the install-cache `.mcp.json` presence + clean load is the headless ingestion signal, analogous to the 3B skill round-trip.)

### 2. STANDARD sec 3.9 + 10.1 correction
sec 3.9 CX registration: a distributed plugin registers MCP via a bundled `.mcp.json` (the standard `{ "mcpServers": {...} }` format) referenced by `plugin.json "mcpServers": "./.mcp.json"`; user-level `config.toml [mcp_servers.*]` is a separate, non-plugin path. sec 10.1 layout: add `.mcp.json` (plugin MCP servers, referenced by the native manifests); fix any line implying `.codex-plugin/config.toml` carries MCP. `standard` stays 0.8 (correction within the v0.8 contract).

### 3. ctx.mcpServers - load-plugin
Add `ctx.mcpServers`: parse the root `.mcp.json` (if present) into a list of `{ name, def }` from its `mcpServers` map. (One file, many servers - different from the per-file loaders; a small dedicated parse, not a `list*Files` helper.)

### 4. gen-manifest extension (the per-target wiring)
- `renderClaudeNativeManifest` / `renderCodexNativeManifest`: add `mcpServers: "./.mcp.json"` to the spine WHEN a `.mcp.json` exists at root (conditional - absent otherwise, so existing manifests are unaffected).
- `renderManifest` (`manifest.generated.json`): index the servers (`mcpServers: [{ name, transport, ... }]`).

### 5. mcp-valid check - scripts/checks/mcp-valid.mjs (NEW, Universal)
For each server in `.mcp.json` (sec 3.9): well-formed (a stdio server has `command`; an HTTP server has `url`); **no committed secret** (an inline value that looks like a credential rather than an `env`/`bearer_token_env_var` reference = error, sec 9); a referenced `command` SHOULD be resolvable (warn). Universal reqId (next free U-id). Conditional: [] when no `.mcp.json`.

### 6. Component-level per-target S6 - extend per-target-presence.mjs
The deferred-from-3C-2a item. For each declared MCP server (dual-target, plugin-distributable), per the plugin's `agent-targets`: each target's native manifest MUST carry the `mcpServers` pointer to the present `.mcp.json`. A missing per-target pointer (or a missing `.mcp.json` when servers are declared) = S6 ERROR. Keep the existing plugin-manifest presence logic. (MCP is the first real dual-target both-ingestible component, so this is its natural home.)

### 7. S3 + library.json - components-index
Add `components.mcpServers`; extend S3 to validate: each declared server name is a key in `.mcp.json`'s `mcpServers`, and each `.mcp.json` server is declared (mirrors the skills/subagents/commands branches, adapted to the one-file-many-servers shape).

### 8. build-mcp skill - skills/askit-build-mcp
`SKILL.md` (+ `references/authoring-mcp.md`), create/improve, mirrors `askit-build-command`, links `builder-pattern.md`:
- create: interview (server name, transport stdio|http, command/args or url, env via indirection) -> author/extend the root `.mcp.json` -> register the server in `library.json components.mcpServers` -> `gen-manifest --write` (wires the `mcpServers` pointer) -> evaluate to 0 errors.
- improve: consume evaluate findings (malformed server, a committed secret, a missing pointer, an undeclared server).

### 9. Required ingestion round-trip - tests/integration/codex-mcp-roundtrip.test.mjs
Install a probe plugin with a `.mcp.json` via the codex CLI and assert INGESTION (the install cache holds the `.mcp.json`; codex loads the plugin without rejecting it - per #17360 the runtime registers the server even though the UI may not list it). Graceful-skip when codex absent. The direct application of listing != ingestion to the MCP path.

## File structure (3C-2c deliverables)
```
STANDARD.md                                    MODIFY - sec 3.9/10.1 correction (plugin MCP = bundled .mcp.json)
scripts/lib/load-plugin.mjs                    MODIFY - ctx.mcpServers (parse root .mcp.json)
scripts/generators/gen-manifest.mjs            MODIFY - native manifests gain mcpServers pointer (conditional); manifest.generated.json indexes servers
scripts/checks/mcp-valid.mjs                   NEW - MCP validity (Universal; well-formed, no secrets, resolvable command)
scripts/checks/per-target-presence.mjs         MODIFY - S6 component-level (MCP pointer presence per target)
scripts/checks/components-index.mjs            MODIFY - S3 validates components.mcpServers vs .mcp.json
scripts/lib/registry.mjs                       MODIFY - register mcp-valid
skills/askit-build-mcp/SKILL.md + references/  NEW - the builder skill (create/improve)
templates/mcp.json                             NEW - the .mcp.json scaffold (one example server)
library.json                                   MODIFY - components.mcpServers (+ askit-build-mcp in components.skills); regen
tests/unit/{mcp-valid,per-target-presence,components-index,load-plugin,gen-manifest}.test.mjs  NEW/EXTEND
tests/integration/codex-mcp-roundtrip.test.mjs NEW - ingestion-verified, graceful skip
tests/fixtures/golden/mcp-fixture/             NEW - a plugin with a .mcp.json + the manifest pointers
tests/fixtures/anti/mcp-malformed/             NEW - a server missing command/url (mcp-valid)
tests/fixtures/anti/mcp-committed-secret/      NEW - inline credential instead of env (mcp-valid)
tests/fixtures/anti/missing-mcp-pointer/       NEW - .mcp.json present, a native manifest lacks the pointer (S6)
docs/reference/askit-build-mcp.md + how-to/build-an-mcp-server.md  NEW
docs/reference/silver-checks.md                UPDATE - S6 component-level row + the new Universal mcp-valid row
AGENTS.md / INDEX.md / CHANGELOG.md            UPDATE
```

## Self-validation impact
MCP is Universal-tier; the toolkit declares NO MCP server (no dogfood), so mcp-valid + component-level S6 are conditional-untriggered on the repo (proven by fixtures + round-trip). `tier-report` stays `{convergent, [universal,convergent], {}}`. No tag.

## Exit gate
Task A pinned the round-trip; sec 3.9/10.1 corrected; gen-manifest wires the pointer (conditional, unit-tested); mcp-valid (Universal) + component-level S6 registered + tested (golden + anti); S3 validates components.mcpServers; build-mcp passes evaluate; the ingestion round-trip verifies install + .mcp.json in cache (graceful skip); check + evaluate exit 0; tier-report convergent/empty-blocked; full suite green; docs + silver-checks + AGENTS/INDEX + CHANGELOG; no dashes.

## Deferred (to 3C-2d+)
build-hook (#16430 caveat), build-workflow (+ S4 workflow-step orphans + S5), build-chain-contract, build-agents-md, build-output-style. Gold / tier advanced - Phase 5.

## Risks
- **Round-trip verifiability (#17360).** The CLI may not surface plugin MCP servers in `codex mcp list`, so "is it ingested" is harder than the skill round-trip. Mitigation: verify install + `.mcp.json` in the install cache + clean load (the headless signal); cite #17360 for runtime registration; do NOT fail on `codex mcp list` absence. If Task A finds plugin MCP does NOT load at all (despite #17360), STOP and escalate (Option-A-style: MCP becomes documented-config, not plugin-shipped).
- **One-file-many-servers shape.** MCP differs from the per-component-file model (skills/subagents/commands). Mitigation: `ctx.mcpServers` + S3 adapt to the `.mcp.json` map; do not force a per-file abstraction.
- **gen-manifest conditional pointer.** Adding `mcpServers` to the native manifests must be conditional (only when `.mcp.json` exists) so the toolkit's own manifests (no MCP) are unaffected and U8 stays clean. Unit-test both states.
- **Codex fast-moving.** Re-verify `codex --version` at build start.
