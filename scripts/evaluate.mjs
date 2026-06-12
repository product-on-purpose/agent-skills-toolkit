// what-it-is:   the structured evaluator behind askit-evaluate
// what-it-does: produces the one report object (terminal, --json) over a plugin's conformance, used by the askit-evaluate skill
// why:          a single report object keeps the terminal, JSON, and future MD/HTML renderers from diverging
// used-by:      run by the askit-evaluate skill and askit-build-docs improve mode
import path from "node:path";
import { existsSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { loadPlugin, loadSkill } from "./lib/load-plugin.mjs";
import { runAllChecks, provenanceByReq, CHECKS } from "./lib/registry.mjs";
import { applyStandardDowngrade } from "./lib/standard-gate.mjs";
import { loadConfig } from "./lib/config.mjs";
import { PROFILES } from "./lib/profiles.mjs";
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

const effSev = (f) => f.effectiveSeverity ?? f.severity; // resolved findings carry effectiveSeverity; unknown-scope findings fall back

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

function evaluateComponent(target, opts = {}) {
  const skill = loadSkill(target);
  // The skill directory is the one root for BOTH the finding paths and the config, mirroring plugin
  // scope (root = the thing you graded). Rooting findings at the parent while loading config from the
  // skill dir would break file-scoped suppressions: a "SKILL.md" glob can never match "<dir>/SKILL.md".
  const ctx = { root: target, skills: [skill] };
  // ADR 0034: component scope runs the same config resolution as plugin scope, so --profile / --mode
  // are honored instead of silently dropped (a third-party single skill graded under plain-plugin
  // must not be held to the house checks). Same precedence: file config, then CLI overrides.
  const { config, findings: configFindings } = loadConfig(target);
  const cfg = { ...config, ...(opts.mode ? { mode: opts.mode } : {}), ...(opts.profile ? { profile: opts.profile } : {}) };
  const resolved = resolveFindings([...configFindings, ...checkAgentskills(ctx)], cfg, provenanceByReq());
  return { ...baseReport("component", target, resolved), profile: cfg.profile, mode: cfg.mode };
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
    return evaluateComponent(target, opts);
  }
  if (looksLikePlugin(target)) {
    const ctx = loadPlugin(target);
    // F1 (ADR 0027): downgrade post-pin errors to warn so the report reflects the pinned Standard.
    const downgraded = applyStandardDowngrade(runAllChecks(ctx), ctx.library?.data?.standard);
    // F3: resolve config (profile + per-rule override + suppressions + published-verdict clamp), so the
    // report object, summary, dispositions split, and --json all reflect the consumer's grading config.
    const { config, findings: configFindings } = loadConfig(target);
    // CLI --mode / --profile override the file (so a third-party plugin can be graded under a chosen
    // profile without writing askit.config.json into its tree); an explicit per-rule override still wins.
    const cfg = { ...config, ...(opts.mode ? { mode: opts.mode } : {}), ...(opts.profile ? { profile: opts.profile } : {}) };
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

// The options bag the pure renderer needs that is not on the bare report object: the subject identity,
// the live spine (so the ledger lists every requirement and the count is never hard-coded), the
// vacuous-pass set, the injected date, and the gate exit code. Built by the CLI so the renderer stays pure.
function optsFromTarget(target, exitCode, reportType = "conformance") {
  return {
    library: readJsonSafe(path.join(target, "library.json")).data ?? null,
    spine: CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier })),
    conditional: new Set(["G1", "G6", "U11"]), // checks that pass vacuously when their artifact is absent
    date: new Date().toISOString().slice(0, 10),
    exitCode,
    reportType,
  };
}

// Merge an advisory block (review / behavioral) onto the deterministic conformance object, allowlisting ONLY
// the advisory's own namespaced keys. The advisory comes from a non-deterministic LLM layer and is untrusted:
// spreading the whole object would let a stray top-level tier/findings/byRule key overwrite the gate verdict.
// This mirrors the migrate/release decorators (base first, then one namespaced key) so the advisory can never
// move the deterministic grade, the ledger, or the gate exit code.
export function applyAdvisory(base, report, adv = {}) {
  if (report === "review") return { ...base, reportType: "review", review: adv.review, insights: adv.insights };
  if (report === "behavioral") return { ...base, reportType: "behavioral", behavioral: adv.behavioral };
  return base;
}

// Run the CLI as an async function (not a top-level await), so evaluate.mjs finishes evaluating before the
// lazily-imported migrate-report / release-report modules import it back (avoids a cyclic top-level-await deadlock).
async function runCli() {
  const argv = process.argv.slice(2);
  const valueFlags = new Set(["--mode", "--out", "--format", "--report", "--target-tier", "--advisory", "--profile"]); // flags that consume the following arg
  const getFlag = (name) => {
    const eq = argv.find((a) => a.startsWith(name + "="));
    if (eq) return eq.slice(name.length + 1);
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const target = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && valueFlags.has(argv[i - 1]))) ?? process.cwd();
  const mode = getFlag("--mode");
  const out = getFlag("--out");
  const report = getFlag("--report") ?? "conformance";
  const targetTier = getFlag("--target-tier");
  const advisory = getFlag("--advisory");
  const profile = getFlag("--profile");
  const format = getFlag("--format") ?? (argv.includes("--json") ? "json" : "text"); // --json stays an alias
  if (mode !== undefined && mode !== "local" && mode !== "published-verdict") {
    console.error(`invalid --mode '${mode}'; expected 'local' or 'published-verdict'`);
    process.exit(2);
  }
  if (!["text", "json", "md", "html"].includes(format)) {
    console.error(`invalid --format '${format}'; expected 'text', 'json', 'md', or 'html'`);
    process.exit(2);
  }
  if (!["conformance", "migration", "release", "review", "behavioral"].includes(report)) {
    console.error(`invalid --report '${report}'; expected 'conformance', 'migration', 'release', 'review', or 'behavioral'`);
    process.exit(2);
  }
  if (targetTier !== undefined && !["universal", "convergent", "advanced"].includes(targetTier)) {
    console.error(`invalid --target-tier '${targetTier}'; expected 'universal', 'convergent', or 'advanced'`);
    process.exit(2);
  }
  if (profile !== undefined && !Object.prototype.hasOwnProperty.call(PROFILES, profile)) {
    console.error(`invalid --profile '${profile}'; expected one of ${Object.keys(PROFILES).join(", ")}`);
    process.exit(2);
  }
  // Build the chosen report object. migration/release decorate the conformance object deterministically; load
  // them lazily. review/behavioral merge an advisory block produced by an LLM layer (askit-reviewer /
  // askit-quality-grader) supplied via --advisory <file.json>; the renderer projects whatever it is given and
  // never lets the advisory move the gate verdict.
  let r;
  if (report === "migration") r = (await import("./lib/migrate-report.mjs")).migrateReport(target, { mode, targetTier, profile });
  else if (report === "release") r = (await import("./lib/release-report.mjs")).releaseReport(target, { mode, profile });
  else if (report === "review" || report === "behavioral") {
    if (!advisory) {
      console.error(`--report=${report} requires --advisory <file.json> carrying the advisory ${report} block (it comes from an LLM layer, not the deterministic gate)`);
      process.exit(2);
    }
    r = applyAdvisory(evaluate(target, { mode, profile }), report, JSON.parse(readFileSync(advisory, "utf8")));
  } else r = evaluate(target, { mode, profile });
  // Honor the same declared-tier ceiling as check.mjs, gating on the RESOLVED effective severity so the
  // two CLIs agree on pass/fail. Plugin scope reads the declared tier; component/unknown have no ceiling.
  // Computed before rendering so a designed report carries the same exit code the process returns.
  const declared = r.scope === "plugin" ? readJsonSafe(path.join(target, "library.json")).data?.tier : undefined;
  const forGate = r.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: effSev(f) }));
  const { exitCode } = gateExitFromFindings(forGate, declared);

  let output;
  if (format === "json") {
    output = JSON.stringify(r, null, 2);
  } else if (format === "md" || format === "html") {
    // Load the renderer only when a designed format is requested, keeping the hot json/terminal path light.
    const { renderMarkdown, renderHtml } = await import("./lib/report-render.mjs");
    const opts = optsFromTarget(target, exitCode, report);
    output = format === "md" ? renderMarkdown(r, opts) : renderHtml(r, opts);
  } else {
    output = formatReport(r);
  }

  if (out) {
    writeFileSync(out, output);
    console.error(`Wrote ${out}`); // confirmation to stderr so --out plus stdout redirection stays clean
  } else {
    console.log(output);
  }
  // Rendering a report is orthogonal to the gate verdict: the exit code always reflects the gate, never the format.
  process.exit(exitCode);
}

if (process.argv[1]?.endsWith("evaluate.mjs")) runCli();
