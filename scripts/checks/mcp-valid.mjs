// what-it-is:   the mcp-valid check (U11)
// what-it-does: MCP server definitions live in one portable .mcp.json at the plugin root (Standard sec 3.9)
// why:          enforces the Standard requirement U11 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "mcp-valid", tier: "universal", reqId: "U11", since: "0.x", provenance: "objective" };

// Inline values that look like a credential rather than an env/indirection reference.
const SECRETISH_KEY = /(token|secret|key|password|passwd|api[_-]?key|bearer)/i;
const LOOKS_LIKE_SECRET = /^[A-Za-z0-9_\-]{16,}$/;

function err(msg) {
  return finding(meta.id, SEVERITY.ERROR, msg, { file: ".mcp.json", reqId: meta.reqId });
}

/**
 * MCP server definitions live in one portable .mcp.json at the plugin root
 * (Standard sec 3.9). The check FAILS CLOSED: a present-but-broken .mcp.json is an
 * error, never silently treated as "no servers". For each server: well-formed
 * (a stdio server has a non-empty `command`; an http server has a valid http(s)
 * `url`); secrets MUST NOT be committed inline (env indirection / bearer_token_env_var,
 * sec 9). Conditional: no .mcp.json => not applicable.
 */
export function check(ctx) {
  if (ctx.mcpParseError) return [err(`.mcp.json is present but not valid JSON: ${ctx.mcpParseError}`)];
  if (ctx.mcpMalformed) return [err('.mcp.json is present but has no valid "mcpServers" object.')];

  const servers = ctx.mcpServers ?? [];
  if (servers.length === 0) return [];
  const out = [];
  for (const { name, def } of servers) {
    if (!def || typeof def !== "object") {
      out.push(err(`.mcp.json server "${name}" must be an object.`));
      continue;
    }
    const isStdio = typeof def.command === "string" && def.command.trim() !== "";
    let isHttp = false;
    let parsedUrl = null;
    if (typeof def.url === "string") {
      try {
        parsedUrl = new URL(def.url);
        isHttp = parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
      } catch {
        isHttp = false;
      }
    }
    if (!isStdio && !isHttp) {
      // A typed http server with an empty/absent url is the managed-connector pattern: the host
      // (e.g. Claude Cowork) supplies the endpoint at runtime. Anthropic's official knowledge-work
      // plugins ship gmail/google-calendar this way suite-wide, so it is a warning, not a tier-blocking
      // error (the U10 / ADR 0028 lesson: do not fail the platform author's own deliberate convention).
      // A genuinely underspecified server (no type, no command, no url) stays an error.
      const urlEmpty = def.url === "" || def.url == null;
      if (def.type === "http" && urlEmpty) {
        out.push(finding(meta.id, SEVERITY.WARN, `.mcp.json server "${name}" declares type "http" with no url; treated as a host-resolved managed connector. If it is meant to be self-contained, add a url.`, { file: ".mcp.json", reqId: meta.reqId }));
      } else {
        out.push(err(`.mcp.json server "${name}" must declare a non-empty "command" (stdio) or a valid http(s) "url" (http).`));
      }
    }
    // Secrets: an inline env value that looks like a credential is an error.
    const env = def.env;
    if (env && typeof env === "object") {
      for (const [k, v] of Object.entries(env)) {
        if (SECRETISH_KEY.test(k) && typeof v === "string" && LOOKS_LIKE_SECRET.test(v)) {
          out.push(err(`.mcp.json server "${name}" appears to inline a secret in env."${k}"; reference it from the environment instead (sec 9).`));
        }
      }
    }
    if (typeof def.bearer_token === "string" && LOOKS_LIKE_SECRET.test(def.bearer_token)) {
      out.push(err(`.mcp.json server "${name}" inlines a bearer token; use "bearer_token_env_var" instead (sec 9).`));
    }
    // A credential embedded in the URL (userinfo or a secretish query param) is committed plaintext.
    if (parsedUrl) {
      if (parsedUrl.username || parsedUrl.password) {
        out.push(err(`.mcp.json server "${name}" embeds credentials in its url; use env indirection instead (sec 9).`));
      }
      for (const [k, v] of parsedUrl.searchParams) {
        if (SECRETISH_KEY.test(k) && LOOKS_LIKE_SECRET.test(v)) {
          out.push(err(`.mcp.json server "${name}" embeds a secret in url query parameter "${k}"; use env indirection instead (sec 9).`));
        }
      }
    }
  }
  return out;
}
