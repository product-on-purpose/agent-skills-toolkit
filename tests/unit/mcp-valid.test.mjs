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

test("present-but-invalid .mcp.json fails closed (U11 error)", () => {
  const r = check({ mcpPath: ".mcp.json", mcpParseError: "Unexpected token", mcpServers: [] });
  assert.ok(r.some((f) => f.severity === "error" && /not valid JSON/.test(f.message)));
});

test("present .mcp.json with no mcpServers object fails closed", () => {
  const r = check({ mcpPath: ".mcp.json", mcpMalformed: true, mcpServers: [] });
  assert.ok(r.some((f) => f.severity === "error" && /no valid .mcpServers/.test(f.message)));
});

test("empty/whitespace command is not well-formed (U11 error)", () => {
  assert.ok(check({ mcpServers: [{ name: "e", def: { command: "   " } }] }).some((f) => f.severity === "error"));
});

test("non-http(s) or unparseable url is not well-formed", () => {
  assert.ok(check({ mcpServers: [{ name: "u", def: { url: "not a url" } }] }).some((f) => f.severity === "error"));
  assert.ok(check({ mcpServers: [{ name: "f", def: { url: "ftp://x.test/" } }] }).some((f) => f.severity === "error"));
});

test("credentials embedded in the url are a secret error", () => {
  assert.ok(check({ mcpServers: [{ name: "c", def: { url: "https://user:pass@x.test/mcp" } }] }).some((f) => /secret|credential/i.test(f.message)));
  assert.ok(check({ mcpServers: [{ name: "q", def: { url: "https://x.test/mcp?api_key=AKIA1234567890ABCDEF" } }] }).some((f) => /secret/i.test(f.message)));
});

test("managed connector (type http, empty url) is a warning not an error (U11)", () => {
  const r = check({ mcpServers: [{ name: "gmail", def: { type: "http", url: "" } }] });
  assert.equal(r.filter((f) => f.severity === "error").length, 0);
  assert.ok(r.some((f) => f.severity === "warn" && f.reqId === "U11"));
});

test("type http with a present-but-invalid url stays an error (U11)", () => {
  assert.ok(check({ mcpServers: [{ name: "x", def: { type: "http", url: "not a url" } }] }).some((f) => f.severity === "error"));
});
