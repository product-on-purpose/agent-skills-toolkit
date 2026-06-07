// what-it-is:   the structured evaluator behind askit-evaluate
// what-it-does: produces the one report object (terminal, --json) over a plugin's conformance, used by the askit-evaluate skill
// why:          a single report object keeps the terminal, JSON, and future MD/HTML renderers from diverging
// used-by:      run by the askit-evaluate skill and askit-build-docs improve mode
import path from "node:path";
import { existsSync, statSync } from "node:fs";
import { loadPlugin, loadSkill } from "./lib/load-plugin.mjs";
import { runAllChecks, provenanceByReq } from "./lib/registry.mjs";
import { applyStandardDowngrade } from "./lib/standard-gate.mjs";
import { loadConfig } from "./lib/config.mjs";
import { resolveFindings } from "./lib/resolve-config.mjs";
import { computeTierReport } from "./tier-report.mjs";
import { checkAgentskills } from "./checks/agentskills.mjs";
import { finding, SEVERITY } from "./lib/findings.mjs";
import { readJsonSafe } from "./lib/fs-utils.mjs";
import { gateExitFromFindings } from "./check.mjs";

function groupByRule(findings) {
  const byRule = {};
  for (const f of findings) {
    const key = f.reqId ?? f.check;
    (byRule[key] ??= []).push(f);
  }
  return byRule;
}

const effSev = (f) => f.effectiveSeverity ?? f.severity; // resolved findings carry effectiveSeverity; component findings fall back

function baseReport(scope, target, findings) {
  return {
    scope,
    target,
    findings,
    byRule: groupByRule(findings),
    summary: {
      errors: findings.filter((f) => effSev(f) === "error" && !f.suppressed).length,
      warns: findings.filter((f) => effSev(f) === "warn" && !f.suppressed).length,
    },
  };
}

// F3: split the resolved findings into portable "real issues" (objective + vendor-cited errors that
// survive config) vs askit "profile conformance" (house errors + profile/override downgrades), plus the
// suppressed count and the published-verdict clamp count. A clamped finding (an objective/vendor check a
// subject tried to disable, surfaced at warn) is its OWN disposition, never folded into profile conformance.
function dispositions(resolved) {
  const live = resolved.filter((f) => !f.suppressed);
  const byProvenance = {};
  for (const f of live) byProvenance[f.provenance] = (byProvenance[f.provenance] ?? 0) + 1;
  return {
    realIssues: live.filter((f) => f.effectiveSeverity === "error" && f.provenance !== "house").length,
    profileConformance: live.filter((f) => f.clampNotice == null && ((f.effectiveSeverity === "error" && f.provenance === "house") || f.downgradedFrom != null)).length,
    suppressed: resolved.filter((f) => f.suppressed).length,
    clamped: live.filter((f) => f.clampNotice != null).length,
    warns: live.filter((f) => f.effectiveSeverity === "warn").length,
    byProvenance,
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

export function evaluate(target, opts = {}) {
  const hasLibrary = existsSync(path.join(target, "library.json"));
  const hasSkillMd = existsSync(path.join(target, "SKILL.md"));

  if (hasSkillMd && !hasLibrary) {
    return evaluateComponent(target);
  }
  if (looksLikePlugin(target)) {
    const ctx = loadPlugin(target);
    // F1 (ADR 0027): downgrade post-pin errors to warn so the report reflects the pinned Standard.
    const downgraded = applyStandardDowngrade(runAllChecks(ctx), ctx.library?.data?.standard);
    // F3: resolve config (profile + per-rule override + suppressions + published-verdict clamp), so the
    // report object, summary, dispositions split, and --json all reflect the consumer's grading config.
    const { config, findings: configFindings } = loadConfig(target);
    const cfg = opts.mode ? { ...config, mode: opts.mode } : config;
    const resolved = resolveFindings([...configFindings, ...downgraded], cfg, provenanceByReq());
    const t = computeTierReport(target, ctx, resolved);
    return {
      ...baseReport("plugin", target, resolved),
      tier: t.tier, satisfies: t.satisfies, blocked: t.blocked,
      profile: cfg.profile, mode: cfg.mode,
      dispositions: dispositions(resolved),
    };
  }
  const f = finding("scope-detection", SEVERITY.ERROR, "not a plugin or skill: expected a library.json (plugin) or a SKILL.md (component) at " + target);
  return baseReport("unknown", target, [f]);
}

export function formatReport(r) {
  const lines = [];
  lines.push(`Evaluating (${r.scope}): ${r.target}`);
  for (const f of r.findings) {
    if (f.suppressed || effSev(f) === "off") continue; // disabled/waived findings are summarized in the split, not listed here
    lines.push(`  [${effSev(f)}] ${f.reqId ?? f.check}: ${f.message}${f.clampNotice ? " [clamped to warn: published-verdict]" : ""}${f.file ? "  -> " + f.file : ""}`);
  }
  if (r.tier !== undefined) lines.push(`Tier: ${r.tier}`);
  lines.push(`${r.summary.errors} error(s), ${r.summary.warns} warning(s).`);
  if (r.dispositions) {
    const d = r.dispositions;
    lines.push(`Real issues (objective + vendor-cited errors): ${d.realIssues}`);
    lines.push(`Profile conformance (house conventions, profile downgrades): ${d.profileConformance}   suppressed: ${d.suppressed}`);
    if (d.clamped > 0) lines.push(`Clamped (objective/vendor checks this config tried to disable, surfaced at warn): ${d.clamped}`);
  }
  return lines.join("\n");
}

if (process.argv[1]?.endsWith("evaluate.mjs")) {
  const argv = process.argv.slice(2);
  const target = argv.find((a, i) => !a.startsWith("--") && (i === 0 || argv[i - 1] !== "--mode")) ?? process.cwd();
  let mode;
  const mi = argv.indexOf("--mode");
  if (mi >= 0) mode = argv[mi + 1];
  const eq = argv.find((a) => a.startsWith("--mode="));
  if (eq) mode = eq.slice("--mode=".length);
  if (mode !== undefined && mode !== "local" && mode !== "published-verdict") {
    console.error(`invalid --mode '${mode}'; expected 'local' or 'published-verdict'`);
    process.exit(2);
  }
  const r = evaluate(target, { mode });
  console.log(argv.includes("--json") ? JSON.stringify(r, null, 2) : formatReport(r));
  // Honor the same declared-tier ceiling as check.mjs, gating on the RESOLVED effective severity so the
  // two CLIs agree on pass/fail. Plugin scope reads the declared tier; component/unknown have no ceiling.
  const declared = r.scope === "plugin" ? readJsonSafe(path.join(target, "library.json")).data?.tier : undefined;
  const forGate = r.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: effSev(f) }));
  const { exitCode } = gateExitFromFindings(forGate, declared);
  process.exit(exitCode);
}
