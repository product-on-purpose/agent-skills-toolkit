// what-it-is:   the self-hosting check (G2)
// what-it-does: asserts a workflow under .github/workflows/ runs the conformance gate, so the plugin passes its own validators in CI
// why:          enforces the Standard requirement G2 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { readJsonSafe } from "../lib/fs-utils.mjs";

export const meta = { id: "self-hosting", tier: "advanced", reqId: "G2", since: "0.x", provenance: "house" };

// The gate entrypoint, anchored so a longer filename (scripts/check.mjsx, .mjs.bak) does not match.
const GATE_PATH = /scripts\/check\.mjs(?![\w.])/;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Drop whole-line YAML comments so a workflow that only MENTIONS the gate in a comment does not pass.
const stripComments = (text) => text.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).join("\n");

/** npm-script names whose package.json definition resolves to the gate (one level of indirection). */
function gateNpmScripts(root) {
  const pkg = readJsonSafe(path.join(root, "package.json")).data;
  const scripts = pkg && typeof pkg.scripts === "object" && pkg.scripts !== null ? pkg.scripts : {};
  return new Set(Object.entries(scripts).filter(([, cmd]) => typeof cmd === "string" && GATE_PATH.test(cmd)).map(([name]) => name));
}

/**
 * G2 (Gold): the plugin ships self-hosting CI - a workflow under .github/workflows/ that runs the
 * conformance gate, directly (node scripts/check.mjs) or via an npm script that resolves to it
 * (npm run <script> / npm test). YAML comments are stripped first so a mere mention does not count.
 * "Self-hosting" = the plugin passes its own validators in CI; whether the run is green is a GitHub
 * runtime concern. Standard sec 2.6 G2, sec 4. Advanced tier.
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
  const gateScripts = gateNpmScripts(ctx.root);
  const npmPatterns = [];
  for (const name of gateScripts) {
    npmPatterns.push(`npm\\s+run\\s+${escapeRe(name)}\\b`);
    if (name === "test") npmPatterns.push("npm\\s+test\\b");
  }
  const npmRe = npmPatterns.length ? new RegExp(npmPatterns.join("|")) : null;

  const runsGate = files.some((f) => {
    let text;
    try {
      text = stripComments(readFileSync(path.join(wfDir, f), "utf8"));
    } catch {
      return false;
    }
    return GATE_PATH.test(text) || (npmRe !== null && npmRe.test(text));
  });
  if (!runsGate) {
    return [finding(meta.id, SEVERITY.ERROR, "a CI workflow is present but none runs the conformance gate (node scripts/check.mjs, directly or via an npm script that resolves to it); Gold requires the plugin to pass its own validators in CI (Standard sec 2.6 G2).", { file: ".github/workflows/", reqId: meta.reqId })];
  }
  return [];
}
