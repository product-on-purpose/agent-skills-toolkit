import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "agent-targets", tier: "convergent", reqId: "S1" };

const VALID = new Set(["claude", "codex"]);

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return []; // U1 owns missing library.json
  const out = [];
  const t = lib["agent-targets"];
  if (t === undefined) {
    out.push(finding(meta.id, SEVERITY.ERROR, "library.json is missing \"agent-targets\" (REQUIRED at Convergent+; Standard sec 5.1, sec 2.2).", { file: "library.json", reqId: meta.reqId }));
    return out;
  }
  if (!Array.isArray(t) || t.length === 0) {
    out.push(finding(meta.id, SEVERITY.ERROR, "library.json \"agent-targets\" must be a non-empty array of \"claude\" and/or \"codex\".", { file: "library.json", reqId: meta.reqId }));
    return out;
  }
  for (const v of t) {
    if (!VALID.has(v)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json "agent-targets" contains invalid value "${v}"; allowed: claude, codex (Standard sec 5.1).`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  return out;
}
