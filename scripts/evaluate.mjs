import path from "node:path";
import { existsSync, statSync } from "node:fs";
import { loadPlugin, loadSkill } from "./lib/load-plugin.mjs";
import { runAllChecks } from "./lib/registry.mjs";
import { computeTierReport } from "./tier-report.mjs";
import { checkAgentskills } from "./checks/agentskills.mjs";
import { finding, SEVERITY } from "./lib/findings.mjs";

function groupByRule(findings) {
  const byRule = {};
  for (const f of findings) {
    const key = f.reqId ?? f.check;
    (byRule[key] ??= []).push(f);
  }
  return byRule;
}

function baseReport(scope, target, findings) {
  return {
    scope,
    target,
    findings,
    byRule: groupByRule(findings),
    summary: {
      errors: findings.filter((f) => f.severity === "error").length,
      warns: findings.filter((f) => f.severity === "warn").length,
    },
  };
}

function evaluateComponent(target) {
  const skill = loadSkill(target);
  const ctx = { root: path.dirname(target), skills: [skill] };
  return baseReport("component", target, checkAgentskills(ctx));
}

function isDir(p) { return existsSync(p) && statSync(p).isDirectory(); }

function looksLikePlugin(target) {
  // A directory looks like a plugin if it has library.json, AGENTS.md, or a skills/ subdir.
  return (
    existsSync(path.join(target, "library.json")) ||
    existsSync(path.join(target, "AGENTS.md")) ||
    isDir(path.join(target, "skills"))
  );
}

export function evaluate(target) {
  const hasLibrary = existsSync(path.join(target, "library.json"));
  const hasSkillMd = existsSync(path.join(target, "SKILL.md"));

  if (hasSkillMd && !hasLibrary) {
    return evaluateComponent(target);
  }
  if (looksLikePlugin(target)) {
    const ctx = loadPlugin(target);
    const findings = runAllChecks(ctx);
    const t = computeTierReport(target, ctx, findings);
    return { ...baseReport("plugin", target, findings), tier: t.tier, satisfies: t.satisfies, blocked: t.blocked };
  }
  const f = finding("scope-detection", SEVERITY.ERROR, "not a plugin or skill: expected a library.json (plugin) or a SKILL.md (component) at " + target);
  return baseReport("unknown", target, [f]);
}

export function formatReport(r) {
  const lines = [];
  lines.push(`Evaluating (${r.scope}): ${r.target}`);
  for (const f of r.findings) {
    lines.push(`  [${f.severity}] ${f.reqId ?? f.check}: ${f.message}${f.file ? "  -> " + f.file : ""}`);
  }
  if (r.tier !== undefined) lines.push(`Tier: ${r.tier}`);
  lines.push(`${r.summary.errors} error(s), ${r.summary.warns} warning(s).`);
  return lines.join("\n");
}

if (process.argv[1]?.endsWith("evaluate.mjs")) {
  const target = process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? process.cwd();
  const r = evaluate(target);
  console.log(process.argv.includes("--json") ? JSON.stringify(r, null, 2) : formatReport(r));
  process.exit(r.summary.errors > 0 ? 1 : 0);
}
