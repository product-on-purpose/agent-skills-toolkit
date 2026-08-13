// what-it-is:   the structured evaluator behind askit-evaluate
// what-it-does: produces the one report object (terminal, --json) over a plugin's conformance, used by the askit-evaluate skill
// why:          a single report object keeps the terminal, JSON, and future MD/HTML renderers from diverging
// used-by:      run by the askit-evaluate skill and askit-build-docs improve mode
import path from "node:path";
import { existsSync, statSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { loadPlugin, loadSkill, looksLikePlugin } from "./lib/load-plugin.mjs";
import { detectMarketplaceScope, evaluateMarketplace, formatMarketplaceReport, marketplaceExitCode } from "./lib/marketplace/evaluate-marketplace.mjs";
import { runAllChecks, provenanceByReq, CHECKS } from "./lib/registry.mjs";
import { applyStandardDowngrade } from "./lib/standard-gate.mjs";
import { loadConfig, withGraderOptions } from "./lib/config.mjs";
import { PROFILES } from "./lib/profiles.mjs";
import { resolveFindings } from "./lib/resolve-config.mjs";
import { computeTierReport } from "./tier-report.mjs";
import { checkAgentskills } from "./checks/agentskills.mjs";
import { finding, SEVERITY } from "./lib/findings.mjs";
import { readJsonSafe, SKIP_DIRS, normalizeArgPath } from "./lib/fs-utils.mjs";
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
  const cfg = withGraderOptions(config, opts);
  const resolved = resolveFindings([...configFindings, ...checkAgentskills(ctx)], cfg, provenanceByReq());
  return { ...baseReport("component", target, resolved), profile: cfg.profile.value, mode: cfg.mode.value };
}

export function evaluate(target, opts = {}) {
  const hasLibrary = existsSync(path.join(target, "library.json"));
  const hasSkillMd = existsSync(path.join(target, "SKILL.md"));

  if (hasSkillMd && !hasLibrary) {
    return evaluateComponent(target, opts);
  }
  // ADR 0039: the third scope. Ordered BEFORE the plugin branch because a catalogue root can also
  // carry AGENTS.md or a skills/ directory of its own, which would otherwise make looksLikePlugin
  // claim it first. detectMarketplaceScope() declines anything U13 owns (the marketplace-of-skills
  // shape) and anything that is not a catalogue at all, so a plugin's scope never moves: the toolkit
  // and every fixture carry no marketplace.json, and a plugin that gains one keeps plugin scope
  // unless its entries catalogue other plugins.
  if (detectMarketplaceScope(target)) {
    return evaluateMarketplace(target, opts);
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
    const cfg = withGraderOptions(config, opts);
    const resolved = resolveFindings([...configFindings, ...downgraded], cfg, provenanceByReq());
    const t = computeTierReport(target, ctx, resolved);
    return {
      ...baseReport("plugin", target, resolved),
      tier: t.tier, satisfies: t.satisfies, blocked: t.blocked,
      profile: cfg.profile.value, mode: cfg.mode.value,
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
    lines.push(`  [${effSev(f)}] ${f.reqId ?? f.check}: ${f.message}${f.clampNotice ? " [clamped to warn: published-verdict]" : ""}${f.migrationNotice ? ` [${f.migrationNotice}]` : ""}${f.file ? "  -> " + f.file : ""}`);
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

// Returns true when any .md/.mdx file under target (excluding SKIP_DIRS) contains a ```mermaid fence.
// Used by buildConditional to decide whether U12 should show N/A (no diagrams = check is vacuously
// not applicable) vs PASS/FAIL (diagrams exist, so the check ran).
function targetHasMermaidBlocks(target) {
  if (!existsSync(target) || !statSync(target).isDirectory()) return false;
  const MERMAID_FENCE = /```mermaid/;
  function scan(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return false; }
    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue;
      const full = path.join(dir, name);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (scan(full)) return true;
      } else if (/\.(md|mdx)$/.test(name)) {
        try {
          if (MERMAID_FENCE.test(readFileSync(full, "utf8"))) return true;
        } catch { /* unreadable file - skip */ }
      }
    }
    return false;
  }
  return scan(target);
}

// Returns true when the target has an enumerating manifest: either library.json carries
// components.skills as an array (rung 1), or .claude-plugin/marketplace.json has plugins[]
// with at least one source under skills/ (rung 2). Mirrors the resolveRegistrationSource
// logic in checks/skill-registration.mjs so the conditional flag stays in sync with the check.
function targetHasEnumeratingManifest(target) {
  const lib = readJsonSafe(path.join(target, "library.json")).data;
  if (Array.isArray(lib?.components?.skills)) return true;
  try {
    const mp = JSON.parse(readFileSync(path.join(target, ".claude-plugin", "marketplace.json"), "utf8"));
    if (Array.isArray(mp?.plugins)) {
      return mp.plugins.some((p) => {
        const s = p?.source;
        if (typeof s !== "string") return false;
        const parts = s.replace(/^\.\//, "").split(/[\\/]/);
        const i = parts.indexOf("skills");
        return i >= 0 && Boolean(parts[i + 1]);
      });
    }
  } catch { /* no marketplace.json or parse error */ }
  return false;
}

// Builds the set of reqIds that should render N/A (not PASS) when no findings are present.
// The base set covers checks whose artifacts are always optional (G1 hooks, G6 deprecation,
// U11 managed-connector). U12 and U13 are added dynamically based on target content so a
// plugin that actually has diagrams or an enumerating manifest never silently shows N/A.
export function buildConditional(target) {
  const base = new Set(["G1", "G6", "U11"]);
  if (!target) return base;
  if (!targetHasMermaidBlocks(target)) base.add("U12");
  if (!targetHasEnumeratingManifest(target)) base.add("U13");
  return base;
}

// The options bag the pure renderer needs that is not on the bare report object: the subject identity,
// the live spine (so the ledger lists every requirement and the count is never hard-coded), the
// vacuous-pass set, the injected date, and the gate exit code. Built by the CLI so the renderer stays pure.
function optsFromTarget(target, exitCode, reportType = "conformance") {
  return {
    library: readJsonSafe(path.join(target, "library.json")).data ?? null,
    spine: CHECKS.map((m) => ({ reqId: m.meta.reqId, id: m.meta.id, tier: m.meta.tier })),
    conditional: buildConditional(target),
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
  const valueFlags = new Set(["--mode", "--out", "--format", "--report", "--target-tier", "--advisory", "--profile", "--members"]); // flags that consume the following arg
  const getFlag = (name) => {
    const eq = argv.find((a) => a.startsWith(name + "="));
    if (eq) return eq.slice(name.length + 1);
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  // Path-valued argv sites (positional target, --out, --advisory) are normalized through normalizeArgPath
  // so a Windows backslash path is not silently misread (the historical defect: docs/how-to/troubleshoot-the-gate.md).
  // Only the argv-sourced value is normalized; the process.cwd() default is left as the OS gave it.
  const normArg = (v) => (v === undefined ? v : normalizeArgPath(v));
  const rawTarget = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && valueFlags.has(argv[i - 1])));
  const target = normArg(rawTarget) ?? process.cwd();
  const mode = getFlag("--mode");
  const out = normArg(getFlag("--out"));
  const report = getFlag("--report") ?? "conformance";
  const targetTier = getFlag("--target-tier");
  const advisory = normArg(getFlag("--advisory"));
  const profile = getFlag("--profile");
  // --members: where to look for the local checkouts of a marketplace's members. Repeatable, and
  // normalized like every other path-valued argv site. Ignored outside marketplace scope, deliberately
  // rather than rejected: a wrapper script that always passes it should not fail on a plugin target.
  const memberRootArgs = argv.flatMap((a, i) => (a === "--members" && argv[i + 1] ? [argv[i + 1]] : a.startsWith("--members=") ? [a.slice("--members=".length)] : []));
  const searchRoots = memberRootArgs.map((v) => normalizeArgPath(v));
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
  // A marketplace target only has a conformance (collection) report. The migration and release reports
  // decorate a PLUGIN's conformance object with a plugin's own tier ladder and release-readiness state,
  // and the advisory reports project an LLM block onto one plugin; none of those have a defined meaning
  // over a catalogue. Refusing here with a clear message beats letting migrateReport() grade the
  // catalogue root as an empty plugin and print a confident, meaningless answer.
  if (report !== "conformance" && detectMarketplaceScope(target)) {
    console.error(`--report=${report} is not defined for a marketplace target; a catalogue has only the collection (conformance) report. Point --report=${report} at a member plugin instead.`);
    process.exit(2);
  }
  let r;
  if (report === "migration") r = (await import("./lib/migrate-report.mjs")).migrateReport(target, { mode, targetTier, profile });
  else if (report === "release") r = (await import("./lib/release-report.mjs")).releaseReport(target, { mode, profile });
  else if (report === "review" || report === "behavioral") {
    if (!advisory) {
      console.error(`--report=${report} requires --advisory <file.json> carrying the advisory ${report} block (it comes from an LLM layer, not the deterministic gate)`);
      process.exit(2);
    }
    r = applyAdvisory(evaluate(target, { mode, profile, searchRoots }), report, JSON.parse(readFileSync(advisory, "utf8")));
  } else r = evaluate(target, { mode, profile, searchRoots });
  // Honor the same declared-tier ceiling as check.mjs, gating on the RESOLVED effective severity so the
  // two CLIs agree on pass/fail. Plugin scope reads the declared tier; component/unknown have no ceiling.
  // Computed before rendering so a designed report carries the same exit code the process returns.
  //
  // Marketplace scope is the one exception, and it is not a special case bolted on: a collection has no
  // declared tier of its own to be a ceiling, and its verdict is defined by ADR 0039 as
  // self-consistency worst-member over member verdicts the gate already computed. Running the
  // tier-ceiling filter over collection findings would ask "what tier is a catalogue", a question the
  // Standard deliberately does not answer.
  const declared = r.scope === "plugin" ? readJsonSafe(path.join(target, "library.json")).data?.tier : undefined;
  let exitCode;
  if (r.scope === "marketplace") {
    exitCode = marketplaceExitCode(r);
  } else {
    const forGate = r.findings.filter((f) => !f.suppressed).map((f) => ({ ...f, severity: effSev(f) }));
    ({ exitCode } = gateExitFromFindings(forGate, declared));
  }

  let output;
  if (format === "json") {
    output = JSON.stringify(r, null, 2);
  } else if (format === "md" || format === "html") {
    // Load the renderer only when a designed format is requested, keeping the hot json/terminal path light.
    const { renderMarkdown, renderHtml } = await import("./lib/report-render.mjs");
    const opts = optsFromTarget(target, exitCode, r.scope === "marketplace" ? "marketplace" : report);
    output = format === "md" ? renderMarkdown(r, opts) : renderHtml(r, opts);
  } else {
    output = r.scope === "marketplace" ? formatMarketplaceReport(r) : formatReport(r);
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
