// what-it-is:   the aggregate conformance gate entry point
// what-it-does: loads the plugin, runs every registered check, prints the tier and findings, and exits with a real status code
// why:          the deterministic, model-free gate is what lets a plugin prove itself in CI rather than rely on an opinion
// used-by:      invoked by contributors and by .github/workflows/ci.yml; the self-hosting (G2) target
import { loadPlugin } from "./lib/load-plugin.mjs";
import { runAllChecks } from "./lib/registry.mjs";
import { applyStandardDowngrade } from "./lib/standard-gate.mjs";
import { computeTierReport, humanLine } from "./tier-report.mjs";
import { TIER_ORDER, tierForReq, ceilingIndex } from "./lib/tier.mjs";

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

export function runGate(root, ctx = loadPlugin(root), { strict = false } = {}) {
  const raw = runAllChecks(ctx);
  // ADR 0027: honor the plugin's pinned Standard by downgrading post-pin errors to warn, unless --strict
  // (which grades against the full live spine, for authors validating the Standard itself).
  const findings = strict ? raw : applyStandardDowngrade(raw, ctx?.library?.data?.standard);
  const { errorCount, exitCode } = gateExitFromFindings(findings, ctx?.library?.data?.tier);
  const warnCount = findings.filter((f) => f.severity === "warn").length;
  return { findings, errorCount, warnCount, exitCode };
}

function format(findings) {
  return findings
    .map((f) => `  [${f.severity}] ${f.check}${f.reqId ? " (" + f.reqId + ")" : ""}: ${f.message}` +
      `${f.downgraded ? ` [downgraded: introduced in Standard ${f.since}, after pinned ${f.pinned}]` : ""}` +
      `${f.file ? "  -> " + f.file : ""}`)
    .join("\n");
}

if (process.argv[1]?.endsWith("check.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const strict = process.argv.includes("--strict");
  const ctx = loadPlugin(root);
  const r = runGate(root, ctx, { strict });
  if (r.findings.length) console.log(format(r.findings));
  console.log(`\n${humanLine(computeTierReport(root, ctx, r.findings))}`);
  console.log(`\n${r.errorCount} error(s), ${r.warnCount} warning(s).`);
  process.exit(r.exitCode);
}
