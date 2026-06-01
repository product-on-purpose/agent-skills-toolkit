import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const meta = { id: "self-hosting", tier: "advanced", reqId: "G2" };

const GATE = /scripts\/check\.mjs/;

/**
 * G2 (Gold): the plugin ships self-hosting CI - a workflow under .github/workflows/ that runs
 * the conformance gate via the portable scripts (Standard sec 2.6 G2, sec 4). "Self-hosting" =
 * the plugin passes its own validators in CI. This is the structural half (a workflow exists and
 * invokes node scripts/check.mjs); whether the run is green is a GitHub runtime concern.
 * Advanced tier.
 */
export function check(ctx) {
  const wfDir = path.join(ctx.root, ".github", "workflows");
  let files = [];
  try {
    if (existsSync(wfDir) && statSync(wfDir).isDirectory()) {
      files = readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f));
    }
  } catch {
    files = [];
  }
  if (files.length === 0) {
    return [finding(meta.id, SEVERITY.ERROR, "no CI workflow under .github/workflows/; Gold requires self-hosting CI that runs the conformance gate (Standard sec 2.6 G2, sec 4).", { file: ".github/workflows/", reqId: meta.reqId })];
  }
  const runsGate = files.some((f) => {
    try {
      return GATE.test(readFileSync(path.join(wfDir, f), "utf8"));
    } catch {
      return false;
    }
  });
  if (!runsGate) {
    return [finding(meta.id, SEVERITY.ERROR, "a CI workflow is present but none runs the conformance gate (node scripts/check.mjs); Gold requires the plugin to pass its own validators in CI (Standard sec 2.6 G2).", { file: ".github/workflows/", reqId: meta.reqId })];
  }
  return [];
}
