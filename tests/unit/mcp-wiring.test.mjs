import { test } from "node:test";
import assert from "node:assert/strict";
import { renderClaudeNativeManifest, renderCodexNativeManifest, renderManifest } from "../../scripts/generators/gen-manifest.mjs";
import { check as componentsIndex } from "../../scripts/checks/components-index.mjs";
import { check as perTarget } from "../../scripts/checks/per-target-presence.mjs";

const baseLib = { name: "x", version: "0.1.0", tier: "universal" };

test("gen-manifest adds the mcpServers pointer only when .mcp.json exists", () => {
  const withMcp = JSON.parse(renderClaudeNativeManifest({ library: { data: baseLib }, mcpPath: ".mcp.json" }));
  assert.equal(withMcp.mcpServers, "./.mcp.json");
  const withoutMcp = JSON.parse(renderClaudeNativeManifest({ library: { data: baseLib } }));
  assert.equal(withoutMcp.mcpServers, undefined);
  const codex = JSON.parse(renderCodexNativeManifest({ library: { data: baseLib }, mcpPath: ".mcp.json" }));
  assert.equal(codex.mcpServers, "./.mcp.json");
});

test("renderManifest indexes servers with transport when present", () => {
  const ctx = {
    root: ".",
    library: { data: baseLib },
    skills: [],
    commands: [],
    mcpServers: [{ name: "p", def: { command: "node" } }, { name: "h", def: { url: "https://x.test" } }],
  };
  const m = JSON.parse(renderManifest(ctx));
  assert.deepEqual(m.mcpServers, [{ name: "p", transport: "stdio" }, { name: "h", transport: "http" }]);
});

test("S3 flags an .mcp.json server not declared in components.mcpServers", () => {
  const ctx = {
    library: { data: { components: { mcpServers: [] } } },
    skills: [], commands: [], subagents: [],
    mcpServers: [{ name: "p", def: { command: "node" } }],
  };
  assert.ok(componentsIndex(ctx).some((f) => f.reqId === "S3" && /not declared/.test(f.message)));
});

test("S3 passes when declared and on-disk MCP servers match", () => {
  const ctx = {
    library: { data: { components: { mcpServers: [{ name: "p" }] } } },
    skills: [], commands: [], subagents: [],
    mcpServers: [{ name: "p", def: { command: "node" } }],
  };
  assert.equal(componentsIndex(ctx).length, 0);
});

test("S6 flags a native manifest missing the mcpServers pointer when servers ship", () => {
  const ctx = {
    root: ".",
    library: { data: { "agent-targets": ["claude"] } },
    mcpServers: [{ name: "p", def: { command: "node" } }],
    claudeManifest: { name: "x" },
    codexManifest: null,
  };
  assert.ok(perTarget(ctx).some((f) => f.reqId === "S6" && /mcpServers/.test(f.message)));
});
