import { test } from "node:test";
import assert from "node:assert/strict";
import { check, meta } from "../../scripts/checks/mcp-valid.mjs";

test("meta declares U11 universal", () => {
  assert.equal(meta.reqId, "U11");
  assert.equal(meta.tier, "universal");
});

test("no .mcp.json - not applicable (no error)", () => {
  assert.equal(check({ mcpServers: [] }).length, 0);
  assert.equal(check({}).length, 0);
});

test("well-formed stdio and http servers - no error", () => {
  const ctx = {
    mcpServers: [
      { name: "a", def: { command: "node", args: ["x.mjs"], env: { SOME_TOKEN: "" } } },
      { name: "b", def: { url: "https://example.test/mcp", bearer_token_env_var: "B_TOKEN" } },
    ],
  };
  assert.equal(check(ctx).length, 0);
});

test("server with neither command nor url - U11 error", () => {
  const r = check({ mcpServers: [{ name: "bad", def: {} }] });
  const err = r.find((f) => f.severity === "error");
  assert.ok(err);
  assert.equal(err.reqId, "U11");
});

test("inline secret in env - U11 error", () => {
  const r = check({ mcpServers: [{ name: "s", def: { command: "x", env: { API_KEY: "AKIA1234567890ABCDEF" } } }] });
  assert.ok(r.some((f) => f.severity === "error" && /secret/i.test(f.message)));
});

test("env var reference (empty value) is not a secret", () => {
  const r = check({ mcpServers: [{ name: "s", def: { command: "x", env: { API_KEY: "" } } }] });
  assert.equal(r.length, 0);
});
