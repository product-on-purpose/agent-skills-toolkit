import { loadPlugin } from "./lib/load-plugin.mjs";
import { runAllChecks } from "./lib/registry.mjs";
import { computeTierReport, humanLine } from "./tier-report.mjs";

export function runGate(root, ctx = loadPlugin(root)) {
  const findings = runAllChecks(ctx);
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.filter((f) => f.severity === "warn").length;
  return { findings, errorCount, warnCount, exitCode: errorCount > 0 ? 1 : 0 };
}

function format(findings) {
  return findings
    .map((f) => `  [${f.severity}] ${f.check}${f.reqId ? " (" + f.reqId + ")" : ""}: ${f.message}${f.file ? "  -> " + f.file : ""}`)
    .join("\n");
}

if (process.argv[1]?.endsWith("check.mjs")) {
  const root = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const ctx = loadPlugin(root);
  const r = runGate(root, ctx);
  if (r.findings.length) console.log(format(r.findings));
  console.log(`\n${humanLine(computeTierReport(root, ctx))}`);
  console.log(`\n${r.errorCount} error(s), ${r.warnCount} warning(s).`);
  process.exit(r.exitCode);
}
