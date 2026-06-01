import { finding, SEVERITY } from "../lib/findings.mjs";
import { fileExists } from "../lib/fs-utils.mjs";
import path from "node:path";

export const meta = { id: "release-notes", tier: "advanced", reqId: "G5" };

/**
 * G5 (Gold): the plugin maintains a curated, user-facing RELEASE-NOTES.md at the root,
 * distinct from the full technical CHANGELOG.md (Standard sec 2.6 G5, sec 10.6).
 * Advanced tier, so it is a Gold burndown item for a plugin that has not declared advanced.
 */
export function check(ctx) {
  if (!fileExists(path.join(ctx.root, "RELEASE-NOTES.md"))) {
    return [finding(meta.id, SEVERITY.ERROR, "RELEASE-NOTES.md is missing at the repository root; Gold requires a curated, user-facing RELEASE-NOTES.md distinct from CHANGELOG.md (Standard sec 2.6 G5, sec 10.6).", { file: "RELEASE-NOTES.md", reqId: meta.reqId })];
  }
  return [];
}
