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
//
// NPX_GATE gives every token between `npx` and the package name exactly ONE reading, which is what keeps
// it linear on a line that does not match: a dash-led token is a flag (a word character must follow the
// dashes, so a bare `--` is only the end-of-options separator), a `=` glues a value to its flag, and a
// space-separated value never starts with a dash. The previous pattern let `-{1,2}` and `[\w-]+` split the
// dashes between them AND let a dash-led token be read as either a flag or the previous flag's value, so a
// failing match explored every combination: `npx --a --a ... nope` with 40 flags never finished. It also
// refused a real value holding `/` or `:` (`--registry=https://x`). tests/unit/self-hosting-npx-pattern.test.mjs.
const NPX_GATE = /\bnpx\s+(?:-{1,2}[\w][\w-]*(?:=\S+| [^\s-]\S*)?\s+|--\s+)*agent-skills-toolkit(?:@[\w.^~><=+-]+)?(?![\w-])/;
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


// Shell connectors after which a NEW command begins. Used to split a run script into command segments.
const CONNECTOR = /\s*(?:&&|\|\||;|\|)\s*/;
// Commands that PRINT their arguments rather than executing them. A gate spelling inside one of these is
// text, not an invocation - which is E56's whole defect.
const PRINTERS = /^(?:echo|printf|print)\b/;

/**
 * RS-B3 / E56: reduce a workflow to the text that could actually EXECUTE something.
 *
 * G2 accepted five spellings of the gate ANYWHERE in a run script, so
 * a run line that merely ECHOED the npx invocation satisfied a Gold check (the exact survivor is pinned
 * verbatim in tests/unit/self-hosting-invocation.test.mjs; it is paraphrased here because the
 * remediation-command scanner reads a bare word after the package name in prose as a subcommand, and a
 * guard firing on the text that explains it is a false positive this repository has met before). Comments were
 * already stripped; what was missing is that nothing looked at what a `run:` line DOES with the text.
 *
 * Three reductions, in order, each preserving line structure so the existing `run:`-anchored pattern
 * still sees the key it anchors to:
 *   1. Unwrap a fully-quoted YAML scalar (`run: "node scripts/check.mjs"`), because that quote is YAML
 *      syntax rather than shell string-building. Only when the value opens and closes with the same
 *      quote and contains no other copy of it, so a composite line is never mis-unwrapped.
 *   2. Drop any command segment whose first word PRINTS (echo/printf/print).
 *
 * A THIRD reduction was written and REMOVED, and the removal is the useful record. It blanked the
 * contents of every remaining quoted run, on the theory that those are argument quoting. Measured against
 * the six family members, it moved `product-lifecycle-templates` from passing to FAILING - and that
 * member's CI is correct. Its gate step reads
 * `node "$RUNNER_TEMP/toolkit/scripts/check.mjs" "$GITHUB_WORKSPACE"`, where the quotes exist because the
 * path holds a shell variable. Blanking them erased a real invocation. Quoted paths are ubiquitous in CI,
 * so that rule broke correct plugins to catch a contrived one, and the guard's first reported defect was
 * its own false positive. The printer rule alone closes E56's documented survivor.
 *
 * KNOWN LIMITS, stated rather than implied (the check-release-counts precedent). This is a line-wise
 * tokenizer, NOT a shell parser, and deliberately does not handle: heredocs (an `<<EOF` body is read as
 * ordinary lines), backslash line continuations, `$(...)` and backtick substitution, variable
 * indirection (`CMD=npx; $CMD agent-skills-toolkit`), a printer reached through an alias or wrapper, or a
 * gate spelling inside a NON-printer's quoted argument (`node -e "console.log('npx agent-skills-toolkit')"`).
 * That last one is a deliberate trade, not an oversight: the only rule that caught it also erased genuine
 * quoted invocations, and a false FAIL against a correct plugin costs more than a contrived false PASS.
 * Each can still produce a false PASS. This closes the documented survivor and the classes adjacent to
 * it; it does not claim to close the category, and claiming otherwise would be the unfalsifiable promise
 * this repository grades other tools on.
 */
export function executableText(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^(\s*-?\s*run:\s*)(.*)$/.exec(line);
    const prefix = m ? m[1] : "";
    let value = m ? m[2] : line;

    const t = value.trim();
    const q = t[0];
    if ((q === '"' || q === "'") && t.length > 1 && t.endsWith(q) && t.slice(1, -1).indexOf(q) === -1) {
      value = t.slice(1, -1);
    }

    const kept = value
      .split(CONNECTOR)
      .filter((seg) => !PRINTERS.test(seg.trim()))
      .join(" && ");
    out.push(prefix + kept);
  }
  return out.join("\n");
}

// RS-B3, Standard 0.16. Unlike the v1.16.1 widening - which could only move a plugin from failing to
// PASSING - this narrowing can move a passing plugin to FAILING. So it ships warn-capped and graduates at
// 0.17: the revision that introduces a requirement is never the one that enforces it (ADR 0056 / E51).
// Activation-neutral wording: under --strict nothing binds and this text is still visible in --json.
//
// It caps ONLY the "present but runs no gate" finding. The "no workflow at all" finding above is not a
// tightening - it has always been an error and nothing about it changed - so capping it would hand every
// workflow-less plugin a free pass for a revision.
const G2_MENTION_MIGRATION = Object.freeze({
  capAt: "warn",
  until: "0.17",
  reason: "G2 credits an executed gate rather than a mention from Standard 0.16, and gates at 0.17",
});
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
      text = executableText(stripComments(readFileSync(path.join(wfDir, f), "utf8")));
    } catch {
      return false;
    }
    return invokesGate(text) || (npmRe !== null && npmRe.test(text));
  });
  if (!runsGate) {
    return [finding(meta.id, SEVERITY.ERROR, "a CI workflow is present but none runs the conformance gate; Gold requires the plugin to pass its own validators in CI (Standard sec 2.6 G2). Any of these counts: `npx agent-skills-toolkit .`, the installed bin invoked directly on a `run:` line, an `agent-skills-toolkit` GitHub Action (any owner - a fork runs the same gate, and the vendored form has never checked provenance either), `node scripts/check.mjs` if you vendor the gate, or an npm script that runs any of them.", { file: ".github/workflows/", reqId: meta.reqId, migration: G2_MENTION_MIGRATION })];
  }
  return [];
}
