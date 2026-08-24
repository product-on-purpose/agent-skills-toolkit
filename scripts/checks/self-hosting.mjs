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

// The SAME gate, reached the three ways a plugin can actually reach it. Before this, G2 recognised only
// GATE_PATH, which requires a VENDORED copy of this toolkit - so a plugin that installed the documented
// way (npm, or the plugin marketplace) had no scripts/ directory, the only command it could run in CI
// was refused, and Gold was unreachable for it. STANDARD.md sec 2.6 asks for CI that runs the check
// suite "via the portable scripts", and all three of these do: npx runs those scripts out of the
// published package, and the Action runs check.mjs out of its own checkout of this repository.
//
// This is E35 one level up - "a remediation naming a command its reader does not have" - fixed for
// gen-index at v1.13.0 and never swept into G2.
//
// Each pattern requires the gate to be INVOKED, never merely named: `npm install agent-skills-toolkit`
// installs and runs nothing, and must not count. Whole-line YAML comments are already stripped before
// any of these are applied, so a mention in a comment cannot pass either.
const NPX_GATE = /\bnpx\s+(?:-{1,2}[\w-]+(?:[= ][\w.-]+)?\s+)*agent-skills-toolkit(?:@[\w.^~><=+-]+)?(?![\w-])/;
const ACTION_GATE = /\buses:\s*["']?[\w.-]+\/agent-skills-toolkit@/;
// The installed bin invoked directly, but only where a `run:` key hands it the whole command, so the
// bare package name appearing inside an install line cannot match.
const BIN_GATE = /(?:^|[\r\n])\s*-?\s*run:\s*["'|>]?\s*agent-skills-toolkit(?![\w-])/;

/** Every spelling of "this workflow runs the conformance gate". */
const invokesGate = (text) =>
  GATE_PATH.test(text) || NPX_GATE.test(text) || ACTION_GATE.test(text) || BIN_GATE.test(text);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Drop whole-line YAML comments so a workflow that only MENTIONS the gate in a comment does not pass.
const stripComments = (text) => text.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).join("\n");

/** npm-script names whose package.json definition resolves to the gate (one level of indirection). */
function gateNpmScripts(root) {
  const pkg = readJsonSafe(path.join(root, "package.json")).data;
  const scripts = pkg && typeof pkg.scripts === "object" && pkg.scripts !== null ? pkg.scripts : {};
  return new Set(Object.entries(scripts).filter(([, cmd]) => typeof cmd === "string" && invokesGate(cmd)).map(([name]) => name));
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
    return invokesGate(text) || (npmRe !== null && npmRe.test(text));
  });
  if (!runsGate) {
    return [finding(meta.id, SEVERITY.ERROR, "a CI workflow is present but none runs the conformance gate; Gold requires the plugin to pass its own validators in CI (Standard sec 2.6 G2). Any of these counts: `npx agent-skills-toolkit .`, the `product-on-purpose/agent-skills-toolkit` Action, `node scripts/check.mjs` if you vendor the gate, or an npm script that runs one of them.", { file: ".github/workflows/", reqId: meta.reqId })];
  }
  return [];
}
