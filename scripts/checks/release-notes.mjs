// what-it-is:   the release-notes check (G5)
// what-it-does: G5 (Gold): the plugin maintains a curated, user-facing RELEASE-NOTES.md at the root, distinct from the full technical CHANGELOG.md (Standard sec 2.6 G5, sec 10.6)
// why:          enforces the Standard requirement G5 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const meta = { id: "release-notes", tier: "advanced", reqId: "G5", since: "0.x" };

function isFile(p) { return existsSync(p) && statSync(p).isFile(); }

/**
 * G5 (Gold): the plugin maintains a curated, user-facing RELEASE-NOTES.md at the root, distinct
 * from the full technical CHANGELOG.md (Standard sec 2.6 G5, sec 10.6). Enforces presence,
 * non-emptiness, and distinctness (a RELEASE-NOTES.md byte-identical to CHANGELOG.md is not a
 * curated, user-facing companion). Advanced tier.
 */
export function check(ctx) {
  const rn = path.join(ctx.root, "RELEASE-NOTES.md");
  if (!isFile(rn)) {
    return [finding(meta.id, SEVERITY.ERROR, "RELEASE-NOTES.md is missing at the repository root; Gold requires a curated, user-facing RELEASE-NOTES.md distinct from CHANGELOG.md (Standard sec 2.6 G5, sec 10.6).", { file: "RELEASE-NOTES.md", reqId: meta.reqId })];
  }
  let notes;
  try {
    notes = readFileSync(rn, "utf8");
  } catch (e) {
    return [finding(meta.id, SEVERITY.ERROR, `RELEASE-NOTES.md could not be read: ${e.message}`, { file: "RELEASE-NOTES.md", reqId: meta.reqId })];
  }
  if (notes.trim().length === 0) {
    return [finding(meta.id, SEVERITY.ERROR, "RELEASE-NOTES.md is empty; Gold requires a curated, user-facing RELEASE-NOTES.md (Standard sec 2.6 G5, sec 10.6).", { file: "RELEASE-NOTES.md", reqId: meta.reqId })];
  }
  const cl = path.join(ctx.root, "CHANGELOG.md");
  if (isFile(cl)) {
    let changelog = "";
    try {
      changelog = readFileSync(cl, "utf8");
    } catch {
      changelog = "";
    }
    if (changelog.trim().length > 0 && notes.trim() === changelog.trim()) {
      return [finding(meta.id, SEVERITY.ERROR, "RELEASE-NOTES.md is byte-identical to CHANGELOG.md; the two MUST be distinct (curated user-facing notes vs the full technical history; Standard sec 10.6).", { file: "RELEASE-NOTES.md", reqId: meta.reqId })];
    }
  }
  return [];
}
