import path from "node:path";
import { readJsonSafe } from "../lib/fs-utils.mjs";
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "version-match", tier: "universal", reqId: "U9" };

/**
 * library.json is the version source of truth (Standard sec 5). When a package.json
 * exists with a version field, it MUST equal library.json's version, or the two
 * manifests disagree on the most basic fact about the plugin (the exact drift the
 * Standard exists to prevent, on the flagship plugin). Conditional: no package.json,
 * no version field, or no library version => not applicable.
 */
export function check(ctx) {
  const libVer = ctx.library?.data?.version;
  if (libVer === undefined || ctx.root === undefined) return [];
  const pkg = readJsonSafe(path.join(ctx.root, "package.json")).data;
  if (!pkg || pkg.version === undefined) return [];
  if (pkg.version !== libVer) {
    return [
      finding(
        meta.id,
        SEVERITY.ERROR,
        `package.json version (${pkg.version}) must equal library.json version (${libVer}); library.json is the version source of truth (Standard sec 5).`,
        { file: "package.json", reqId: meta.reqId }
      ),
    ];
  }
  return [];
}
