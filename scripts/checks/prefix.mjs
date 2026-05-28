import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "prefix", tier: "convergent", reqId: "S2" };

const KEBAB_DASH = /^[a-z0-9]+(?:-[a-z0-9]+)*-$/;

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return [];
  const p = lib.prefix;
  if (p === undefined) {
    return [finding(meta.id, SEVERITY.ERROR, "library.json is missing \"prefix\" (REQUIRED at Convergent+; Standard sec 8.2).", { file: "library.json", reqId: meta.reqId })];
  }
  if (typeof p !== "string" || !KEBAB_DASH.test(p)) {
    return [finding(meta.id, SEVERITY.ERROR, `library.json "prefix" must be lowercase kebab-case ending in "-" (got ${JSON.stringify(p)}); Standard sec 8.2.`, { file: "library.json", reqId: meta.reqId })];
  }
  return [];
}
