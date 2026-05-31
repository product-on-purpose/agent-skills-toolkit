import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "mcp-valid", tier: "universal", reqId: "U11" };

// Inline values that look like a credential rather than an env/indirection reference.
const SECRETISH_KEY = /(token|secret|key|password|passwd|api[_-]?key|bearer)/i;
const LOOKS_LIKE_SECRET = /^[A-Za-z0-9_\-]{16,}$/;

/**
 * MCP server definitions live in one portable .mcp.json at the plugin root
 * (Standard sec 3.9). For each server: it MUST be well-formed (a stdio server has a
 * `command`; an http server has a `url`); secrets MUST NOT be committed inline (use
 * `env` indirection / `bearer_token_env_var`, Standard sec 9). Conditional: no
 * .mcp.json => not applicable.
 */
export function check(ctx) {
  const servers = ctx.mcpServers ?? [];
  if (servers.length === 0) return [];
  const out = [];
  for (const { name, def } of servers) {
    if (!def || typeof def !== "object") {
      out.push(finding(meta.id, SEVERITY.ERROR, `.mcp.json server "${name}" must be an object.`, { file: ".mcp.json", reqId: meta.reqId }));
      continue;
    }
    const isHttp = typeof def.url === "string";
    const isStdio = typeof def.command === "string";
    if (!isHttp && !isStdio) {
      out.push(finding(meta.id, SEVERITY.ERROR, `.mcp.json server "${name}" must declare a "command" (stdio) or a "url" (http).`, { file: ".mcp.json", reqId: meta.reqId }));
    }
    // Secrets: an inline env VALUE that looks like a credential is an error; the
    // value should be an empty string or a reference resolved from the environment.
    const env = def.env;
    if (env && typeof env === "object") {
      for (const [k, v] of Object.entries(env)) {
        if (SECRETISH_KEY.test(k) && typeof v === "string" && LOOKS_LIKE_SECRET.test(v)) {
          out.push(finding(meta.id, SEVERITY.ERROR, `.mcp.json server "${name}" appears to inline a secret in env."${k}"; reference it from the environment instead (Standard sec 9).`, { file: ".mcp.json", reqId: meta.reqId }));
        }
      }
    }
    // An http server should reference its bearer token via an env var name, not inline.
    if (isHttp && typeof def.bearer_token === "string" && LOOKS_LIKE_SECRET.test(def.bearer_token)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `.mcp.json server "${name}" inlines a bearer token; use "bearer_token_env_var" instead (Standard sec 9).`, { file: ".mcp.json", reqId: meta.reqId }));
    }
  }
  return out;
}
