// what-it-is:   the aggregate conformance gate entry point
// what-it-does: loads the plugin, runs every registered check, prints the tier and findings, and exits with a real status code
// why:          the deterministic, model-free gate is what lets a plugin prove itself in CI rather than rely on an opinion
// used-by:      invoked by contributors and by .github/workflows/ci.yml; the self-hosting (G2) target
import { loadPlugin } from "./lib/load-plugin.mjs";
import { runAllChecks, provenanceByReq } from "./lib/registry.mjs";
import { applyStandardDowngrade } from "./lib/standard-gate.mjs";
import { loadConfig } from "./lib/config.mjs";
import { PROFILES } from "./lib/profiles.mjs";
import { resolveFindings, gatingFindings } from "./lib/resolve-config.mjs";
import { computeTierReport, humanLine } from "./tier-report.mjs";
import { TIER_ORDER, tierForReq, ceilingIndex } from "./lib/tier.mjs";
import { compareStandard } from "./lib/standard-version.mjs";
import { normalizeArgPath } from "./lib/fs-utils.mjs";

/** Filter error severity by declared-tier ceiling. Exported for unit testing. */
export function gateExitFromFindings(findings, declaredTier) {
  const ceiling = ceilingIndex(declaredTier);
  const gatedErrors = findings.filter(
    (f) => f.severity === "error" && TIER_ORDER.indexOf(tierForReq(f.reqId)) <= ceiling
  );
  return {
    errorCount: gatedErrors.length,
    exitCode: gatedErrors.length > 0 ? 1 : 0,
  };
}

export function runGate(root, ctx = loadPlugin(root), { strict = false, mode, profile } = {}) {
  const raw = runAllChecks(ctx);
  // F1 (ADR 0027): honor the plugin's pinned Standard by downgrading post-pin errors to warn, unless
  // --strict (which grades against the full live spine, for authors validating the Standard itself).
  const downgraded = strict ? raw : applyStandardDowngrade(raw, ctx?.library?.data?.standard);
  // F3: load askit.config.json and resolve severities (profile + per-rule override + suppressions +
  // published-verdict clamp). With no config this is a no-op: effectiveSeverity === severity, nothing
  // suppressed, configFindings empty, so the gate exit equals the pre-F3 behavior (test G-BC).
  const { config, findings: configFindings } = loadConfig(root);
  const effectiveConfig = { ...config, ...(mode ? { mode } : {}), ...(profile ? { profile } : {}) }; // CLI --mode / --profile override the file
  const resolved = resolveFindings([...configFindings, ...downgraded], effectiveConfig, provenanceByReq());
  // Project effectiveSeverity onto .severity so gateExitFromFindings (the tier ceiling) is UNCHANGED.
  const forGate = gatingFindings(resolved).map((f) => ({ ...f, severity: f.effectiveSeverity }));
  const { errorCount, exitCode } = gateExitFromFindings(forGate, ctx?.library?.data?.tier);
  const warnCount = resolved.filter((f) => f.effectiveSeverity === "warn" && !f.suppressed).length;
  return { findings: resolved, errorCount, warnCount, exitCode, config: effectiveConfig };
}

/**
 * Split the printable findings into the ones that can affect the grade (at or below the declared-tier
 * ceiling, the same filter gateExitFromFindings applies) and the above-tier ones that structurally
 * cannot. Suppressed and `off` findings belong to neither. PRESENTATION ONLY: no severity, no count,
 * and no exit code is derived from this split. (PSR-7, ADR 0036 - three independent assessors misread
 * a run in one day because above-tier `[error]` lines printed ahead of a "0 error(s)" summary.)
 * Exported for unit testing.
 */
export function sectionFindings(findings, declaredTier) {
  const ceiling = ceilingIndex(declaredTier);
  const grading = [];
  const aboveTier = [];
  for (const f of findings) {
    if ((f.effectiveSeverity ?? f.severity) === "off" || f.suppressed) continue;
    (TIER_ORDER.indexOf(tierForReq(f.reqId)) <= ceiling ? grading : aboveTier).push(f);
  }
  return { grading, aboveTier };
}

/**
 * The one-line Standard-debt indicator, or "" when the pin is holding nothing back. A plugin pinned to
 * an older Standard prints "no blockers detected" with exit 0 while carrying post-pin findings that all
 * become gate-failing the moment it re-pins; this states that latent debt next to the verdict instead of
 * leaving it to be inferred from the warning stream. The due-at version is the HIGHEST `since` among the
 * held-back findings, compared numerically so 0.10 outranks 0.9. (PSR-6, ADR 0036.)
 * Exported for unit testing.
 */
export function standardDebtLine(findings) {
  const held = findings.filter((f) => f.downgraded && !f.suppressed);
  if (held.length === 0) return "";
  const dueAt = held.reduce((hi, f) => (compareStandard(f.since, hi) > 0 ? f.since : hi), held[0].since);
  return `Standard debt: ${held.length} finding(s) held back by your pinned Standard ${held[0].pinned}; ` +
    `all of them become gate-failing errors at Standard ${dueAt} or later.`;
}

function findingLine(f) {
  const sev = f.effectiveSeverity ?? f.severity;
  return `  [${sev}] ${f.check}${f.reqId ? " (" + f.reqId + ")" : ""}: ${f.message}` +
    `${f.downgraded ? ` [downgraded: introduced in Standard ${f.since}, after pinned ${f.pinned}]` : ""}` +
    `${f.clampNotice ? ` [clamped to warn: published-verdict, ${f.provenance}]` : ""}` +
    `${f.file ? "  -> " + f.file : ""}`;
}

export function format(findings, declaredTier) {
  const { grading, aboveTier } = sectionFindings(findings, declaredTier);
  const parts = [];
  if (grading.length) parts.push(grading.map(findingLine).join("\n"));
  if (aboveTier.length) {
    parts.push(
      "\n  Above your declared tier (informational; these cannot affect the grade or the exit code):\n" +
      aboveTier.map(findingLine).join("\n")
    );
  }
  return parts.join("\n");
}

/**
 * Parse the CLI: the first non-flag token is the root (normalized through normalizeArgPath, so a
 * Windows backslash path is not silently misread - the historical defect); --strict and --mode <val>
 * (or --mode=<val>) are flags. Exported for unit testing (tests/unit/argv-path-normalization.test.mjs).
 */
export function parseArgs(argv) {
  let root, mode, profile, strict = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--strict") strict = true;
    else if (a === "--mode") mode = argv[++i];
    else if (a.startsWith("--mode=")) mode = a.slice("--mode=".length);
    else if (a === "--profile") profile = argv[++i];
    else if (a.startsWith("--profile=")) profile = a.slice("--profile=".length);
    else if (!a.startsWith("--") && root === undefined) root = normalizeArgPath(a);
  }
  return { root: root ?? process.cwd(), mode, profile, strict };
}

if (process.argv[1]?.endsWith("check.mjs")) {
  const { root, mode, profile, strict } = parseArgs(process.argv.slice(2));
  if (mode !== undefined && mode !== "local" && mode !== "published-verdict") {
    console.error(`invalid --mode '${mode}'; expected 'local' or 'published-verdict'`);
    process.exit(2);
  }
  if (profile !== undefined && !Object.prototype.hasOwnProperty.call(PROFILES, profile)) {
    console.error(`invalid --profile '${profile}'; expected one of ${Object.keys(PROFILES).join(", ")}`);
    process.exit(2);
  }
  const ctx = loadPlugin(root);
  const r = runGate(root, ctx, { strict, mode, profile });
  if (r.findings.length) {
    const out = format(r.findings, ctx?.library?.data?.tier);
    if (out) console.log(out);
  }
  console.log(`\n${humanLine(computeTierReport(root, ctx, r.findings))}`);
  console.log(`\n${r.errorCount} error(s), ${r.warnCount} warning(s).`);
  const debt = standardDebtLine(r.findings);
  if (debt) console.log(debt);
  process.exit(r.exitCode);
}
