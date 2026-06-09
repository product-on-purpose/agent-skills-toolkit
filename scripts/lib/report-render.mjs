// what-it-is:   the evaluation-report renderer
// what-it-does: turns the one evaluate.mjs report object into Markdown or a self-contained HTML page, matching the designed IA
// why:          MD (PR review / agents), HTML (non-engineers), JSON, and terminal all derive from one object so they never diverge (E1)
// used-by:      scripts/evaluate.mjs (--format), the askit-evaluate skill
import { metaFor } from "./report-meta.mjs";

// --- tier display vocabulary (universal/convergent/advanced -> Bronze/Silver/Gold) ---
const TIER_NAME = { universal: "Bronze", convergent: "Silver", advanced: "Gold" };
const TIER_SUB = { universal: "Universal", convergent: "Convergent", advanced: "Advanced" };
const TIER_CLASS = { universal: "bronze", convergent: "silver", advanced: "gold" };
const TIER_ORDER = ["universal", "convergent", "advanced"];

const effSev = (f) => f.effectiveSeverity ?? f.severity;

/** The single status decision, shared by MD and HTML so they never disagree. */
function statusFor(reqId, report, conditional) {
  const live = (report.byRule?.[reqId] ?? []).filter((f) => !f.suppressed && effSev(f) !== "off");
  if (live.some((f) => effSev(f) === "error")) return "FAIL";
  if (live.some((f) => effSev(f) === "warn")) return "WARN";
  return conditional?.has(reqId) ? "N/A" : "PASS";
}

function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
// Neutralize the two characters that break a Markdown table cell: a literal pipe (adds a column) and a newline (ends the row).
function escapeMd(s) {
  return String(s ?? "").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}
const basename = (p) => String(p ?? "").split(/[\\/]/).filter(Boolean).pop() ?? String(p ?? "");

// Build one view-model from the report object + opts, so both renderers project the same numbers.
function deriveModel(report, opts = {}) {
  const conditional = opts.conditional ?? new Set();
  const spine = opts.spine ?? [];
  const lib = opts.library ?? null;
  const isPlugin = report.scope === "plugin" && report.tier !== undefined;

  const rows = spine.map(({ reqId, id, tier }) => {
    const status = statusFor(reqId, report, conditional);
    const live = (report.byRule?.[reqId] ?? []).filter((f) => !f.suppressed && effSev(f) !== "off");
    const lead = live.find((f) => effSev(f) === "error") ?? live.find((f) => effSev(f) === "warn") ?? live[0] ?? null;
    const module = "checks/" + (lead?.check ?? id) + ".mjs";
    let evidence;
    if (status === "PASS") evidence = "Requirement satisfied; no finding raised.";
    else if (status === "N/A") evidence = "Nothing to validate for this subject (vacuous pass).";
    else evidence = lead?.message ?? "Finding raised.";
    return { reqId, id, tier, tierName: TIER_NAME[tier] ?? tier, status, evidence, module, file: lead?.file ?? null, why: metaFor(reqId).why };
  });

  const tiers = TIER_ORDER.map((tier) => {
    const tierRows = rows.filter((r) => r.tier === tier);
    const count = (s) => tierRows.filter((r) => r.status === s).length;
    const fail = count("FAIL");
    return {
      tier, name: TIER_NAME[tier], sub: TIER_SUB[tier], cls: TIER_CLASS[tier],
      rows: tierRows, total: tierRows.length, pass: count("PASS"), warn: count("WARN"), fail, na: count("N/A"),
      satisfied: tierRows.length - fail,
    };
  }).filter((t) => t.total > 0);

  const counts = {
    total: rows.length,
    pass: rows.filter((r) => r.status === "PASS").length,
    warn: rows.filter((r) => r.status === "WARN").length,
    fail: rows.filter((r) => r.status === "FAIL").length,
    na: rows.filter((r) => r.status === "N/A").length,
  };
  counts.passedHeadline = counts.total - counts.fail; // non-failing checks (warn and N/A count as not-blocking)

  // The climb: the immediate next tier's blockers (tier-report only fills the next tier).
  const nextTier = Object.keys(report.blocked ?? {})[0] ?? null;
  const blockers = (report.blocked?.[nextTier] ?? []).map((s) => {
    const idx = s.indexOf(": ");
    const reqId = idx > 0 ? s.slice(0, idx) : s;
    const message = idx > 0 ? s.slice(idx + 2) : "";
    return { reqId, message, effort: metaFor(reqId).effort };
  });

  // Improvement cards: one per non-PASS finding row (FAIL then WARN), with the fix prompt component-substituted.
  const improvements = rows
    .filter((r) => r.status === "FAIL" || r.status === "WARN")
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "FAIL" ? -1 : 1))
    .map((r) => {
      const m = metaFor(r.reqId);
      const fixPrompt = r.file ? m.fixPrompt.replace(/<component>/g, r.file) : m.fixPrompt;
      return { reqId: r.reqId, id: r.id, status: r.status, message: r.evidence, file: r.file, fixPrompt, effort: m.effort, priority: r.status === "FAIL" ? "High" : "Medium" };
    });

  return {
    scope: report.scope, isPlugin,
    subject: lib?.name ?? basename(report.target),
    version: lib?.version ?? null,
    declaredTier: lib?.tier ?? (isPlugin ? report.tier : null),
    agentTargets: lib?.["agent-targets"] ?? null,
    prefix: lib?.prefix ?? null,
    standard: lib?.standard ?? null,
    components: lib?.components ?? null,
    tierEarned: isPlugin ? report.tier : null,
    tierEarnedName: isPlugin ? (TIER_NAME[report.tier] ?? report.tier) : null,
    satisfies: report.satisfies ?? [],
    profile: report.profile ?? null,
    mode: report.mode ?? null,
    date: opts.date ?? "",
    exitCode: opts.exitCode ?? 0,
    reportType: report.reportType ?? opts.reportType ?? "conformance",
    migration: report.migration ?? null,
    release: report.release ?? null,
    rows, tiers, counts, blockers, improvements,
    nextTier, nextTierName: nextTier ? TIER_NAME[nextTier] : null,
    insights: Array.isArray(report.insights) ? report.insights : null,
    summary: report.summary ?? { errors: counts.fail, warns: counts.warn },
  };
}

// ============================ MARKDOWN ============================

function mdTable(headers, rows) {
  const line = (cells) => "| " + cells.map((c) => escapeMd(c)).join(" | ") + " |";
  return [line(headers), "| " + headers.map(() => "---").join(" | ") + " |", ...rows.map(line)].join("\n");
}

function renderMarkdown(report, opts = {}) {
  const m = deriveModel(report, opts);
  const out = [];
  const gradeLine = m.isPlugin ? `earns ${m.tierEarnedName}` : "is a single component (graded by rule, no tier)";

  out.push(`# ${m.subject} - Skill Library Evaluation`);
  out.push("");
  out.push(`> Whole-library tier-compliance evaluation of ${m.subject}${m.version ? " v" + m.version : ""} against the Advanced Skill Library Standard. Rendered from the one deterministic report object; the verdict is the gate's, not the renderer's.`);
  out.push("");
  out.push("**How to read this report.** Read top to bottom. Each section opens with a one-line summary, then the detail. The verdict is decided by one layer only: the deterministic conformance gate (section 04). Status markers: PASS, FAIL, WARN, N/A.");
  out.push("");

  // 01 Masthead
  out.push("## 01 Masthead / verdict");
  out.push("");
  if (m.reportType === "release" && m.release) {
    out.push(`**Summary: ${m.subject}${m.version ? " v" + m.version : ""} is a ${m.release.goNoGo.toUpperCase()} for release. Gate exit ${m.release.gateExit}, release notes ${m.release.notesPresent ? "present" : "missing"}, versions ${m.release.versionConsistency.ok ? "consistent" : "inconsistent"}.**`);
  } else if (m.reportType === "migration" && m.migration) {
    const tb = m.migration.stages.reduce((n, s) => n + s.blockers.length, 0);
    out.push(`**Summary: migration of ${m.subject} from ${TIER_NAME[m.migration.currentTier] ?? m.migration.currentTier} to ${TIER_NAME[m.migration.targetTier] ?? m.migration.targetTier}: ${m.migration.stages.length} stage(s), ${tb} blocker(s) to close.**`);
  } else if (m.isPlugin) {
    out.push(`**Summary: ${m.subject}${m.version ? " v" + m.version : ""} ${gradeLine}. ${m.counts.passedHeadline} of ${m.counts.total} checks pass, ${m.counts.fail} block${m.nextTierName ? " " + m.nextTierName : ""}, ${m.counts.warn} advisory warning${m.counts.warn === 1 ? "" : "s"}, gate exit code ${m.exitCode}.**`);
  } else {
    out.push(`**Summary: ${m.subject} ${gradeLine}. ${m.counts.fail} error${m.counts.fail === 1 ? "" : "s"}, ${m.counts.warn} warning${m.counts.warn === 1 ? "" : "s"}.**`);
  }
  out.push("");
  const mhRows = [
    ["Subject", m.subject],
    ["Version", m.version ?? "(unspecified)"],
    ["Report type", m.reportType === "migration" ? "Migration assessment (gap-by-tier)" : m.reportType === "release" ? "Release-readiness assessment" : "Whole-library tier-compliance evaluation"],
    ["Evaluated", m.date],
    ["Standard", m.standard ? "v" + m.standard : "(unspecified)"],
    ["Spine", `${m.counts.total} checks`],
  ];
  if (m.isPlugin) {
    mhRows.push(["Declared tier", `${TIER_SUB[m.declaredTier] ?? m.declaredTier} (${TIER_NAME[m.declaredTier] ?? m.declaredTier})`]);
    mhRows.push(["Grade earned", `${m.tierEarnedName} (${TIER_SUB[m.tierEarned] ?? m.tierEarned})`]);
    if (m.nextTierName) mhRows.push(["Climb", `${m.counts.fail} blocker(s) remain to ${m.nextTierName}`]);
  }
  out.push(mdTable(["Field", "Value"], mhRows));
  out.push("");

  // Release readiness (release reports only): a prominent go / no-go right after the masthead.
  if (m.reportType === "release" && m.release) {
    out.push("## Release readiness");
    out.push("");
    out.push(`**Verdict: ${m.release.goNoGo.toUpperCase()} for release.**`);
    out.push("");
    out.push(mdTable(["Gate", "Result"], [
      ["Go / no-go", m.release.goNoGo.toUpperCase()],
      ["Gate exit code", `${m.release.gateExit}${m.release.gateExit === 0 ? " (clean)" : " (fails)"}`],
      ["Version consistency", `${m.release.versionConsistency.ok ? "OK" : "MISMATCH"}: ${m.release.versionConsistency.detail}`],
      ["Release notes", m.release.notesPresent ? "present" : "missing"],
      ["Notes summary", m.release.summary ?? "(none)"],
    ]));
    out.push("");
  }

  // 02 Executive summary
  out.push("## 02 Executive summary");
  out.push("");
  out.push(`**Summary: a derived, plain-language read of the deterministic result. ${m.isPlugin ? m.subject + " " + gradeLine + "." : "Component-level findings only."}**`);
  out.push("");
  if (m.isPlugin) {
    out.push(`${m.subject} declares the ${TIER_NAME[m.declaredTier] ?? m.declaredTier} (${TIER_SUB[m.declaredTier] ?? m.declaredTier}) tier and ${gradeLine}. Of the ${m.counts.total} checks in the spine, ${m.counts.passedHeadline} do not fail (${m.counts.pass} pass, ${m.counts.warn} warn, ${m.counts.na} not applicable) and ${m.counts.fail} fail. The deterministic gate exits ${m.exitCode}.`);
    out.push("");
    if (m.blockers.length) {
      out.push(`${m.blockers.length} requirement(s) block ${m.nextTierName}: ${m.blockers.map((b) => b.reqId).join(", ")}. Section 06 orders the climb and section 07 gives a copy-paste fix prompt for each gap that drives the matching askit builder and re-runs the gate.`);
    } else {
      out.push(`No requirement blocks the declared tier; the library satisfies its claimed grade outright.`);
    }
    out.push("");
    if (m.counts.warn) {
      out.push(`${m.counts.warn} advisory warning(s) surfaced (${m.rows.filter((r) => r.status === "WARN").map((r) => r.reqId).join(", ")}); they do not gate but are worth folding in.`);
      out.push("");
    }
  } else {
    out.push(`${m.subject} is a single component, so it is graded by rule rather than by tier. ${m.counts.fail} error(s) and ${m.counts.warn} warning(s) were found across the component-level checks.`);
    out.push("");
  }

  // 03 What was evaluated
  out.push("## 03 What was evaluated");
  out.push("");
  out.push("**Summary: the subject identity, then the component inventory.**");
  out.push("");
  const idRows = [["Subject", m.subject], ["Version", m.version ?? "(unspecified)"]];
  if (m.isPlugin) idRows.push(["Declared tier", `${TIER_SUB[m.declaredTier] ?? m.declaredTier} (${TIER_NAME[m.declaredTier] ?? m.declaredTier})`]);
  if (m.agentTargets) idRows.push(["Agent targets", m.agentTargets.join(", ")]);
  if (m.prefix) idRows.push(["Prefix", m.prefix]);
  if (m.profile) idRows.push(["Grading profile", m.profile]);
  out.push(mdTable(["Property", "Value"], idRows));
  out.push("");
  const inv = componentInventory(m.components);
  if (inv.length) {
    out.push(mdTable(["Component", "Type", "Version"], inv.map((c) => [c.name, c.type, c.version ?? ""])));
    out.push("");
  }

  // 04 Methodology
  out.push("## 04 Methodology and scope");
  out.push("");
  out.push("**Summary: three layers, kept separate so the verdict stays honest. Only the deterministic gate decides the tier.**");
  out.push("");
  out.push("Layer 1, deterministic conformance, decides the tier. The portable Node gate runs every check with a real exit code and no model in the loop; re-running it reproduces the result exactly. Layer 2 (behavioral) and Layer 3 (review) are advisory: they surface evidence and never move the grade.");
  out.push("");
  out.push(mdTable(["Marker", "Meaning"], [
    ["PASS", "The requirement is satisfied."],
    ["FAIL", "The requirement is not satisfied and blocks the tier that owns the check."],
    ["WARN", "Advisory finding; does not block the declared tier."],
    ["N/A", "Vacuous pass; the thing being checked does not exist in this subject."],
  ]));
  out.push("");
  const naRows = m.rows.filter((r) => r.status === "N/A").map((r) => r.reqId);
  if (naRows.length) {
    out.push(`Vacuous passes here: ${naRows.join(", ")}. A vacuous pass means there was nothing to validate, not that a feature was exercised.`);
    out.push("");
  }

  // 05 + 06 are tier-specific (plugin only)
  if (m.isPlugin) {
    out.push("## 05 Tier compliance - evidence ledger");
    out.push("");
    out.push(`**Summary: one row per requirement, all ${m.counts.total} itemized, grouped by tier. Every non-pass carries a why-it-matters note.**`);
    out.push("");
    for (const t of m.tiers) {
      out.push(`### ${t.name} / ${t.sub} (${t.total} checks) - ${t.satisfied} of ${t.total} satisfied`);
      out.push("");
      out.push(mdTable(["Req", "Status", "Evidence"], t.rows.map((r) => [`${r.reqId} ${r.id}`, r.status, `${r.evidence} Module: ${r.module}.`])));
      out.push("");
      for (const r of t.rows.filter((x) => x.status !== "PASS" && x.status !== "N/A")) {
        out.push(`> Why ${r.reqId} matters: ${r.why}`);
        out.push("");
      }
    }

    out.push("## 06 The climb / burndown");
    out.push("");
    if (m.reportType === "migration" && m.migration) {
      out.push(`**Summary: the staged ladder from ${TIER_NAME[m.migration.currentTier] ?? m.migration.currentTier} to ${TIER_NAME[m.migration.targetTier] ?? m.migration.targetTier}.**`);
      out.push("");
      for (const s of m.migration.stages) {
        out.push(`### To ${TIER_NAME[s.tier] ?? s.tier}`);
        out.push("");
        out.push(s.blockers.length ? mdTable(["Blocker", "Check", "Effort"], s.blockers.map((b) => [b.message, b.reqId, b.effort])) : "No blockers at this stage.");
        out.push("");
      }
    } else if (m.blockers.length) {
      out.push(`**Summary: ${m.blockers.length} requirement(s) stand between ${m.tierEarnedName} and ${m.nextTierName}.**`);
      out.push("");
      out.push(mdTable(["Order", "Blocker", "Check", "Effort"], m.blockers.map((b, i) => [String(i + 1), b.message, b.reqId, b.effort])));
      out.push("");
    } else {
      out.push("**Summary: no blockers; the declared tier is satisfied.**");
      out.push("");
    }
  }

  // 07 Improvement path
  out.push("## 07 Improvement path");
  out.push("");
  if (m.reportType === "migration" && m.migration) {
    out.push("**Summary: the staged plan, one copy-paste prompt per blocker, ordered by stage.**");
    out.push("");
    for (const s of m.migration.stages) {
      out.push(`### Stage: reach ${TIER_NAME[s.tier] ?? s.tier}`);
      out.push("");
      if (!s.blockers.length) {
        out.push("Nothing blocks this stage.");
        out.push("");
        continue;
      }
      for (const b of s.blockers) {
        out.push(`- **${b.reqId}** (${b.effort}): ${b.message}`);
        if (b.fixPrompt) {
          out.push("");
          out.push("```text");
          out.push(b.fixPrompt);
          out.push("```");
          out.push("");
        }
      }
    }
  } else {
    out.push("**Summary: one card per gap: the issue, the fix priority and effort, and a copy-paste prompt that drives the matching askit builder and re-runs the gate.**");
    out.push("");
    if (m.improvements.length) {
      for (const c of m.improvements) {
        out.push(`### ${c.reqId} - ${c.id} (${c.status === "FAIL" ? "blocker" : "advisory warning"})`);
        out.push("");
        out.push(`- Issue: ${c.message}`);
        out.push(`- Priority: ${c.priority}${c.status === "FAIL" ? " (blocks the tier)" : " (advisory)"}.`);
        if (c.effort) out.push(`- Effort: ${c.effort}.`);
        out.push("");
        if (c.fixPrompt) {
          out.push("```text");
          out.push(c.fixPrompt);
          out.push("```");
          out.push("");
        }
      }
    } else {
      out.push("No action required; nothing failed or warned.");
      out.push("");
    }
  }

  // 08 Insights
  out.push("## 08 Insights");
  out.push("");
  if (m.insights && m.insights.length) {
    out.push("**Summary: qualitative observations from the advisory review layer.**");
    out.push("");
    m.insights.forEach((s, i) => out.push(`${i + 1}. ${s}`));
    out.push("");
  } else {
    out.push("**Summary: none. Insights are produced by the advisory review layer (askit-reviewer), which a deterministic conformance report does not run.**");
    out.push("");
    out.push("Run `askit-evaluate` in review mode to populate this section; a conformance report does not fabricate qualitative notes.");
    out.push("");
  }

  // 09 Evidence and sources
  out.push("## 09 Evidence and sources");
  out.push("");
  out.push("**Summary: every finding is grounded in a check module, a Standard clause, or a subject file.**");
  out.push("");
  const firedModules = [...new Set(m.rows.filter((r) => r.status === "FAIL" || r.status === "WARN").map((r) => r.module))];
  const srcRows = [["CHECK", "scripts/check.mjs - the portable deterministic gate (node scripts/check.mjs .); exit code drives the verdict."]];
  for (const mod of firedModules) srcRows.push(["MODULE", `${mod} - the check behind a non-pass row above.`]);
  if (m.standard) srcRows.push(["CLAUSE", `Advanced Skill Library Standard v${m.standard} - the ${m.counts.total}-check spine and the Bronze / Silver / Gold tier definitions this report grades against.`]);
  srcRows.push(["FILE", `library.json - declares the subject identity (name, version, tier, agent-targets, prefix).`]);
  out.push(mdTable(["Kind", "Source"], srcRows));
  out.push("");

  // 10 Report metadata
  out.push("## 10 Report metadata");
  out.push("");
  out.push("**Summary: provenance for this evaluation, plus the legend.**");
  out.push("");
  const metaRows = [
    ["Subject", `${m.subject}${m.version ? " v" + m.version : ""}`],
    ["Standard version", m.standard ? "v" + m.standard : "(unspecified)"],
    ["Spine", `${m.counts.total} checks`],
  ];
  if (m.isPlugin) {
    metaRows.push(["Declared tier", m.declaredTier]);
    metaRows.push(["Grade earned", `${m.tierEarnedName} (${TIER_SUB[m.tierEarned] ?? m.tierEarned})`]);
  }
  if (m.profile) metaRows.push(["Grading profile", m.profile]);
  if (m.mode) metaRows.push(["Verdict mode", m.mode]);
  metaRows.push(["Evaluator", "askit-evaluate (deterministic gate, renderer)"]);
  metaRows.push(["Gate exit code", String(m.exitCode)]);
  metaRows.push(["Evaluated", m.date]);
  metaRows.push(["Checks", `${m.counts.pass} PASS, ${m.counts.fail} FAIL, ${m.counts.warn} WARN, ${m.counts.na} N/A`]);
  out.push(mdTable(["Field", "Value"], metaRows));
  out.push("");
  out.push("The conformance layer is deterministic and reproducible: re-run `node scripts/check.mjs .` to reproduce every row above. This report adds no judgment and does not change the verdict.");
  out.push("");

  return out.join("\n");
}

function componentInventory(components) {
  if (!components || typeof components !== "object") return [];
  const out = [];
  for (const [kind, list] of Object.entries(components)) {
    if (!Array.isArray(list)) continue;
    const type = kind.replace(/s$/, "");
    for (const c of list) out.push({ name: c.name ?? "(unnamed)", type, version: c.version ?? null });
  }
  return out;
}

// ============================ HTML ============================

const STYLE = `
  :root{
    --bg:#eef1f6; --surface:#fff; --surface-2:#f6f8fb; --surface-3:#eef2f7;
    --ink:#0f1726; --ink-soft:#3d4759; --ink-faint:#6b7688; --ink-ghost:#9aa3b2;
    --line:#e1e6ee; --line-2:#d3dae5; --line-3:#c2cad8;
    --brand:#5c7cfa; --brand-deep:#3f57c9; --brand-wash:#eef2ff;
    --bronze:#a97142; --bronze-bg:#f7efe6; --bronze-line:#e6d3bd;
    --silver:#6b7a84; --silver-bg:#eef1f4; --silver-line:#d4dde2;
    --gold:#b8901f; --gold-bg:#fbf4dc; --gold-line:#ecdca2;
    --pass:#18794e; --pass-bg:#e6f4ec; --pass-line:#bce0cb;
    --fail:#b42318; --fail-bg:#fbeae7; --fail-line:#f1c6bd;
    --warn:#8a5a00; --warn-bg:#fbf1d8; --warn-line:#ecd8a0;
    --na:#6b7688; --na-bg:#eef0f4; --na-line:#d8dde6;
    --sans:system-ui,-apple-system,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif;
    --mono:ui-monospace,"Cascadia Code","SF Mono",Menlo,Consolas,"Liberation Mono",monospace;
    --maxw:1280px; --rail:264px; --ink-panel:#11182a;
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:15.5px;line-height:1.6;font-weight:400;-webkit-font-smoothing:antialiased}
  a{color:var(--brand-deep);text-underline-offset:2px}
  h1,h2,h3,h4{font-family:var(--sans);font-weight:600;letter-spacing:0;text-wrap:balance}
  p{text-wrap:pretty;margin:0 0 13px}
  ul,ol{margin:0 0 14px;padding-left:20px} li{margin:4px 0}
  code,.mono{font-family:var(--mono);font-size:.86em;background:var(--surface-3);padding:1px 5px;border-radius:4px;color:#28324a;overflow-wrap:anywhere}
  .shell{display:grid;grid-template-columns:var(--rail) minmax(0,1fr)}
  .rail{position:sticky;top:0;align-self:start;height:100vh;overflow-y:auto;background:var(--ink-panel);color:#c9d2e3;border-right:1px solid #0a0f1c;padding:24px 18px 30px}
  .rail .mark{display:flex;align-items:center;gap:10px;margin-bottom:22px}
  .rail .glyph{width:30px;height:30px;border-radius:8px;flex:none;background:linear-gradient(135deg,var(--brand),var(--brand-deep));display:grid;place-items:center;color:#fff;font-weight:700;font-size:15px}
  .rail .mark .nm{font-size:13px;font-weight:650;color:#fff;line-height:1.15}
  .rail .mark .nm small{display:block;font-family:var(--mono);font-size:10px;color:#7d88a0;font-weight:400;letter-spacing:.08em;margin-top:2px}
  .rail .railhead{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#6b7693;margin:18px 6px 8px;font-weight:500}
  .rail nav a{display:flex;gap:9px;align-items:baseline;text-decoration:none;color:#aab3c7;padding:6px 10px;border-radius:7px;font-size:13px;line-height:1.3;border-left:2px solid transparent}
  .rail nav a .ix{font-family:var(--mono);font-size:10.5px;color:#6b7693;min-width:18px}
  .rail nav a:hover{background:rgba(92,124,250,.16);color:#fff}
  .rail nav a.active{background:rgba(92,124,250,.22);color:#fff;border-left-color:var(--brand)}
  .rail .railnote{margin-top:22px;padding-top:16px;border-top:1px solid rgba(255,255,255,.09);font-size:11px;line-height:1.55;color:#7d88a0}
  .content{min-width:0}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 40px}
  section{padding:44px 0 6px}
  .seclabel{display:flex;align-items:center;gap:12px;margin:0 0 14px}
  .seclabel .num{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--brand-deep);background:var(--brand-wash);border:1px solid #d6ddff;border-radius:6px;padding:3px 8px}
  h2.sec{font-size:25px;margin:0;line-height:1.16;font-weight:650}
  .lead{color:var(--ink-soft);font-size:16.5px;margin:4px 0 22px;max-width:76ch;font-weight:400;text-wrap:balance}
  h3{font-size:16px;margin:26px 0 10px;font-weight:650}
  .masthead{background:radial-gradient(90% 130% at 92% -20%,rgba(92,124,250,.30),transparent 60%),radial-gradient(70% 120% at 0% 120%,rgba(63,87,201,.22),transparent 55%),var(--ink-panel);color:#eef1f8;padding:38px 0 34px;border-bottom:1px solid #0a0f1c}
  .mh-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px}
  .chip{font-family:var(--mono);font-size:11px;letter-spacing:.04em;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#c7cfe4;font-weight:500}
  .chip.live{color:#bff0d2;border-color:rgba(120,220,160,.35);background:rgba(40,160,90,.16)}
  .mh-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:34px;align-items:stretch}
  .mh-id h1{font-size:38px;line-height:1.06;margin:0 0 8px;color:#fff;font-weight:750;letter-spacing:-.01em}
  .mh-id .vv{font-family:var(--mono);font-size:14px;color:#aeb9ff}
  .mh-id .desc{color:#b9c2d8;font-size:15.5px;margin:12px 0 0;max-width:56ch}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:26px}
  .kpi{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.13);border-radius:12px;padding:14px 16px}
  .kpi .k{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8b96b3;font-weight:500}
  .kpi .v{font-size:26px;font-weight:750;color:#fff;line-height:1.05;margin-top:6px;letter-spacing:-.01em;white-space:nowrap}
  .kpi .v small{font-size:14px;font-weight:600;color:#9fa9c4}
  .kpi .n{font-size:11.5px;color:#9aa4bd;margin-top:3px}
  .kpi.accent-pass .v{color:#8ce6ad} .kpi.accent-fail .v{color:#ff9f93} .kpi.accent-warn .v{color:#f4cf7a}
  .verdictcard{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:20px 22px;display:flex;flex-direction:column;gap:14px}
  .lockup{display:flex;align-items:center;gap:16px}
  .seal{width:74px;height:74px;border-radius:14px;flex:none;display:grid;place-items:center;text-align:center;background:linear-gradient(160deg,#8e9ba6,#5d6c77);color:#fff}
  .seal.bronze{background:linear-gradient(160deg,#c79a6b,#9a6634)} .seal.silver{background:linear-gradient(160deg,#9aa6ad,#69767f)} .seal.gold{background:linear-gradient(160deg,#e0bb55,#b8901f)}
  .seal .tier{font-size:19px;font-weight:760;line-height:1;letter-spacing:-.01em}
  .seal .tlbl{font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;margin-top:4px;opacity:.92;font-weight:600}
  .lockup .vtext .ve{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9fb0ff;font-weight:600}
  .lockup .vtext .vg{font-size:22px;font-weight:700;color:#fff;line-height:1.12}
  .lockup .vtext .vsub{font-size:13px;color:#b9c2d8;margin-top:2px}
  .climb{font-size:13px;color:#cdd5e6;background:rgba(184,144,31,.16);border:1px solid rgba(184,144,31,.4);border-radius:9px;padding:10px 12px;line-height:1.45}
  .climb b{color:#f4d77a}
  .meters{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin:4px 0 0}
  .meter{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.13);border-radius:12px;padding:14px 16px}
  .meter .mtop{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
  .meter .mname{font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:8px;color:#dfe5f1}
  .meter .dotc{width:9px;height:9px;border-radius:50%}
  .meter .dotc.bronze{background:var(--bronze)} .meter .dotc.silver{background:var(--silver)} .meter .dotc.gold{background:var(--gold)}
  .meter .mfrac{font-family:var(--mono);font-size:12.5px;font-weight:650;white-space:nowrap;color:#dfe5f1}
  .track{height:9px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
  .fill{height:100%;border-radius:999px}
  .fill.bronze{background:var(--bronze)} .fill.silver{background:var(--silver)} .fill.gold{background:var(--gold)}
  .matrixzone{background:var(--surface);border-bottom:1px solid var(--line);padding:26px 0 30px}
  .matrixzone .barhead{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:4px}
  .matrixzone h2{font-size:17px;margin:0;font-weight:650}
  .matrixzone .barhead .hint{font-size:12.5px;color:var(--ink-faint)}
  .mx-legend{display:flex;flex-wrap:wrap;gap:8px 16px;margin:10px 0 18px;font-size:12px;color:var(--ink-soft)}
  .mx-legend span{display:inline-flex;align-items:center;gap:6px}
  .swatch{width:11px;height:11px;border-radius:3px;display:inline-block;border:1px solid rgba(0,0,0,.08)}
  .sw-pass{background:var(--pass)} .sw-fail{background:var(--fail)} .sw-warn{background:var(--warn)} .sw-na{background:var(--na)}
  .mx-tier{margin-top:16px}
  .mx-tier .th{display:flex;align-items:center;gap:10px;margin:0 0 10px;flex-wrap:wrap}
  .mx-tier .th .badge-tier{font-family:var(--mono);font-size:11px;font-weight:650;letter-spacing:.04em;padding:3px 9px;border-radius:6px;text-transform:uppercase}
  .badge-tier.bronze{color:var(--bronze);background:var(--bronze-bg);border:1px solid var(--bronze-line)}
  .badge-tier.silver{color:var(--silver);background:var(--silver-bg);border:1px solid var(--silver-line)}
  .badge-tier.gold{color:var(--gold);background:var(--gold-bg);border:1px solid var(--gold-line)}
  .mx-tier .th .tname{font-size:13.5px;font-weight:600} .mx-tier .th .tcount{font-family:var(--mono);font-size:12px;color:var(--ink-faint)}
  .mx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
  .cell{border-radius:9px;padding:9px 12px 9px 14px;border:1px solid var(--line-2);background:var(--surface-2);display:flex;flex-direction:column;gap:3px;text-decoration:none;color:inherit;position:relative}
  .cell::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:9px 0 0 9px}
  .cell .cid{font-family:var(--mono);font-size:12px;font-weight:650;letter-spacing:.02em}
  .cell .cnm{font-size:11.5px;color:var(--ink-faint);line-height:1.3;overflow-wrap:anywhere;hyphens:none}
  .cell .cst{position:absolute;top:8px;right:9px;width:8px;height:8px;border-radius:50%}
  .cell.s-pass{background:var(--pass-bg);border-color:var(--pass-line)} .cell.s-pass::before{background:var(--pass)} .cell.s-pass .cst{background:var(--pass)}
  .cell.s-fail{background:var(--fail-bg);border-color:var(--fail-line)} .cell.s-fail::before{background:var(--fail)} .cell.s-fail .cst{background:var(--fail)}
  .cell.s-warn{background:var(--warn-bg);border-color:var(--warn-line)} .cell.s-warn::before{background:var(--warn)} .cell.s-warn .cst{background:var(--warn)}
  .cell.s-na{background:var(--na-bg);border-color:var(--na-line)} .cell.s-na::before{background:var(--na)} .cell.s-na .cst{background:var(--na)}
  .idstrip{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 22px}
  .idstrip .ic{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:11px 14px}
  .idstrip .ick{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);font-weight:500}
  .idstrip .icv{font-size:14.5px;font-weight:600;margin-top:4px;overflow-wrap:anywhere}
  .aside{background:var(--brand-wash);border:1px solid #d6ddff;border-left:4px solid var(--brand);border-radius:0 10px 10px 0;padding:14px 18px;margin:0 0 20px}
  .aside h4{color:var(--brand-deep);margin:0 0 6px;font-size:13.5px} .aside p{margin:0;font-size:14px;color:var(--ink-soft)}
  .guarantees{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:6px 0 4px}
  .gtile{border:1px solid var(--line);border-radius:11px;padding:14px 16px;background:var(--surface)}
  .gtile.bronze{border-top:3px solid var(--bronze)} .gtile.silver{border-top:3px solid var(--silver)} .gtile.gold{border-top:3px solid var(--gold)}
  .gtile .gt{font-size:13.5px;font-weight:650} .gtile p{font-size:13px;color:var(--ink-soft);margin:8px 0 0}
  .tablecard{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface)}
  table{width:100%;border-collapse:collapse;font-size:14px}
  thead th{text-align:left;padding:11px 14px;background:var(--surface-2);border-bottom:1px solid var(--line-2);font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-faint);font-weight:600}
  tbody td{padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}
  tbody tr:last-child td{border-bottom:0} tbody tr:hover{background:var(--surface-2)}
  td .cn{font-family:var(--mono);font-size:13px;font-weight:600}
  .badge{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10.5px;font-weight:650;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:6px;border:1px solid transparent;white-space:nowrap}
  .b-pass{color:var(--pass);background:var(--pass-bg);border-color:var(--pass-line)}
  .b-fail{color:var(--fail);background:var(--fail-bg);border-color:var(--fail-line)}
  .b-warn{color:var(--warn);background:var(--warn-bg);border-color:var(--warn-line)}
  .b-na{color:var(--na);background:var(--na-bg);border-color:var(--na-line)}
  .dot{width:7px;height:7px;border-radius:50%} .dot.pass{background:var(--pass)} .dot.fail{background:var(--fail)} .dot.warn{background:var(--warn)} .dot.na{background:var(--na)}
  .tierbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:26px 0 12px;padding:13px 16px;border-radius:11px;border:1px solid var(--line-2)}
  .tierbar.bronze{background:var(--bronze-bg);border-color:var(--bronze-line)} .tierbar.silver{background:var(--silver-bg);border-color:var(--silver-line)} .tierbar.gold{background:var(--gold-bg);border-color:var(--gold-line)}
  .tierbar .ts{font-size:16px;font-weight:700}
  .tierbar.bronze .ts{color:var(--bronze)} .tierbar.silver .ts{color:var(--silver)} .tierbar.gold .ts{color:var(--gold)}
  .tierbar .tv{font-size:14px;color:var(--ink-soft)} .tierbar .tfrac{margin-left:auto;font-family:var(--mono);font-size:13px;font-weight:650;color:var(--ink-soft);white-space:nowrap}
  .ledger{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface);margin-bottom:10px}
  .lrow{display:grid;grid-template-columns:200px 1fr;border-bottom:1px solid var(--line)} .lrow:last-child{border-bottom:0}
  .lrow .lst{padding:13px 14px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:8px;align-items:flex-start;background:var(--surface-2)}
  .lrow .lst .rid{font-family:var(--mono);font-size:11.5px;color:var(--ink-faint)}
  .lrow .lst .rname{font-family:var(--mono);font-size:12.5px;font-weight:650;color:var(--ink);overflow-wrap:anywhere}
  .lrow .lbody{padding:12px 16px;min-width:0} .lrow .ev{font-size:13.5px;color:var(--ink-soft);margin:0;line-height:1.55}
  .lrow .ev .src{font-family:var(--mono);font-size:12px;color:var(--brand-deep);background:var(--brand-wash);padding:1px 5px;border-radius:4px;overflow-wrap:anywhere}
  .lrow.is-fail .lst{background:var(--fail-bg)} .lrow.is-warn .lst{background:var(--warn-bg)} .lrow.is-na .lst{background:var(--na-bg)}
  .why{margin-top:9px;font-size:13px;padding:9px 12px;border-left:3px solid var(--fail);background:var(--surface-2);border-radius:0 7px 7px 0;color:var(--ink-soft);line-height:1.55}
  .why.warn{border-left-color:var(--warn)}
  .why b{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint);display:block;margin-bottom:2px;font-weight:600}
  .worklist{counter-reset:wl;display:grid;gap:12px}
  .wlitem{display:grid;grid-template-columns:40px 1fr auto;gap:14px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:11px;padding:14px 16px}
  .wlitem .ord{counter-increment:wl;font-family:var(--mono);font-weight:750;font-size:16px;color:var(--brand-deep);width:34px;height:34px;border-radius:8px;background:var(--brand-wash);display:grid;place-items:center}
  .wlitem .ord::before{content:counter(wl)}
  .wlitem .wmeta h4{margin:0 0 3px;font-size:14.5px} .wlitem .wmeta .wd{font-size:13px;color:var(--ink-soft);line-height:1.55}
  .wlitem .wmeta .wid{font-family:var(--mono);font-size:11px;color:var(--fail);background:var(--fail-bg);border:1px solid var(--fail-line);padding:1px 6px;border-radius:5px;margin-right:6px}
  .wlitem .eff{font-family:var(--mono);font-size:12px;color:var(--ink-soft);text-align:right;white-space:nowrap} .wlitem .eff small{display:block;font-size:10px;color:var(--ink-ghost);text-transform:uppercase;letter-spacing:.08em}
  .imp{border:1px solid var(--line-2);border-radius:13px;padding:18px 20px;margin:0 0 16px;background:var(--surface)}
  .imp .top{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:9px}
  .imp h4{font-size:15.5px;flex:1 1 auto;font-weight:650;margin:0}
  .imp .rtag{font-family:var(--mono);font-size:11px;font-weight:650;padding:2px 7px;border-radius:5px}
  .imp .rtag.gold{color:var(--gold);background:var(--gold-bg);border:1px solid var(--gold-line)} .imp .rtag.warn{color:var(--warn);background:var(--warn-bg);border:1px solid var(--warn-line)}
  .pill{font-family:var(--mono);font-size:10px;letter-spacing:.03em;text-transform:uppercase;padding:2px 8px;border-radius:6px;border:1px solid var(--line-2);color:var(--ink-soft);background:var(--surface-2);white-space:nowrap}
  .pill.p-high{color:var(--fail);border-color:var(--fail-line);background:var(--fail-bg)} .pill.p-med{color:var(--warn);border-color:var(--warn-line);background:var(--warn-bg)}
  .imp .ifgrid{font-size:13.5px;color:var(--ink-soft);margin:2px 0 13px;line-height:1.6} .imp .ifgrid b{color:var(--ink);font-weight:650}
  .prompt{position:relative;background:#0c1322;color:#e7ecf7;border:1px solid #1c2538;border-radius:10px;padding:30px 16px 15px;font-family:var(--mono);font-size:12.5px;line-height:1.62;white-space:pre-wrap;overflow-wrap:anywhere}
  .prompt .lbl{position:absolute;top:9px;left:14px;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#6f7da6;font-weight:600}
  .copy{position:absolute;top:8px;right:9px;background:rgba(255,255,255,.07);color:#cdd6ec;border:1px solid rgba(255,255,255,.16);border-radius:6px;font-family:var(--mono);font-size:11px;padding:4px 10px;cursor:pointer;transition:.12s}
  .copy:hover{background:var(--brand);border-color:var(--brand);color:#fff} .copy.ok{background:var(--pass);border-color:var(--pass);color:#fff}
  .insight{display:grid;grid-template-columns:34px 1fr;gap:13px;padding:14px 16px;border:1px solid var(--line);border-left:3px solid var(--brand);border-radius:0 10px 10px 0;margin:0 0 12px;background:var(--surface)}
  .insight .ic{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--brand-deep);background:var(--brand-wash);border-radius:8px;width:32px;height:32px;display:grid;place-items:center}
  .insight h4{margin:0 0 3px;font-size:14.5px} .insight p{margin:0;font-size:13.5px;color:var(--ink-soft)}
  .refs{font-size:13.5px;list-style:none;padding:0;margin:0}
  .refs li{display:grid;grid-template-columns:96px 1fr;gap:12px;padding:9px 0;border-bottom:1px solid var(--line)} .refs li:last-child{border-bottom:0}
  .refs .tag{font-family:var(--mono);font-size:11px;color:var(--ink-faint)} .refs .ck{font-family:var(--mono);color:var(--brand-deep);overflow-wrap:anywhere}
  .meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0 32px;font-size:14px}
  .meta-grid div{padding:9px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:14px}
  .meta-grid .mk{color:var(--ink-faint)} .meta-grid .mv{font-weight:600;font-family:var(--mono);font-size:12.5px;text-align:right;overflow-wrap:anywhere}
  .panel{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-bottom:18px}
  .legend{display:flex;flex-wrap:wrap;gap:9px 18px;margin:14px 0;font-size:13px;color:var(--ink-soft)} .legend span{display:inline-flex;align-items:center;gap:7px}
  .toolbar{position:fixed;top:14px;right:18px;z-index:20;display:flex;gap:8px}
  .toolbar button{font-family:var(--mono);font-size:12px;background:var(--surface);border:1px solid var(--line-3);border-radius:8px;padding:8px 13px;cursor:pointer;color:var(--ink-soft);box-shadow:0 2px 8px rgba(15,23,38,.12);font-weight:600}
  .toolbar button:hover{border-color:var(--brand);color:var(--brand-deep)}
  .footnote{color:var(--ink-faint);font-size:12.5px;padding:30px 0 60px;line-height:1.6}
  @media (max-width:1080px){.mh-grid{grid-template-columns:1fr}}
  @media (max-width:900px){.shell{grid-template-columns:1fr}.rail{position:static;height:auto;overflow:visible;border-right:0;border-bottom:1px solid #0a0f1c;padding:18px 20px}.rail nav{columns:2;column-gap:14px}.wrap{padding:0 22px}.lrow{grid-template-columns:1fr}.lrow .lst{border-right:0;border-bottom:1px solid var(--line);flex-direction:row;align-items:center;gap:12px;flex-wrap:wrap}.wlitem{grid-template-columns:36px 1fr}.toolbar{top:auto;bottom:14px;right:14px}}
  @media print{.rail,.toolbar,.copy{display:none!important}.shell{grid-template-columns:1fr}body{background:#fff;font-size:10.5pt}.wrap{max-width:none;padding:0 8mm}.masthead,.matrixzone{-webkit-print-color-adjust:exact;print-color-adjust:exact}.masthead{background:var(--ink-panel)!important}.prompt{background:#0c1322!important}section{break-inside:avoid}.imp,.lrow,.ledger,.wlitem,.cell,.kpi,.meter,.gtile{break-inside:avoid}a{color:var(--ink)}}
`;

const SCRIPT = `
  (function(){
    var links=Array.prototype.slice.call(document.querySelectorAll('#toc a'));
    var map={};links.forEach(function(a){var id=a.getAttribute('href').slice(1);var el=document.getElementById(id);if(el)map[id]=a;});
    var targets=Object.keys(map).map(function(id){return document.getElementById(id);});
    function setActive(id){links.forEach(function(a){a.classList.remove('active');});if(map[id])map[id].classList.add('active');}
    if('IntersectionObserver' in window){
      var visible={};
      var obs=new IntersectionObserver(function(entries){
        entries.forEach(function(e){if(e.isIntersecting)visible[e.target.id]=e.boundingClientRect.top;else delete visible[e.target.id];});
        var ids=Object.keys(visible);if(ids.length){ids.sort(function(a,b){return visible[a]-visible[b];});setActive(ids[0]);}
      },{rootMargin:'-12% 0px -70% 0px',threshold:0});
      targets.forEach(function(t){obs.observe(t);});
    }else{
      window.addEventListener('scroll',function(){var best=null,bestTop=-Infinity;targets.forEach(function(t){var top=t.getBoundingClientRect().top;if(top<120&&top>bestTop){bestTop=top;best=t.id;}});if(best)setActive(best);},{passive:true});
    }
  })();
  (function(){
    var buttons=document.querySelectorAll('.imp .copy');
    Array.prototype.forEach.call(buttons,function(btn){
      btn.addEventListener('click',function(){
        var card=btn.closest('.prompt');var textEl=card?card.querySelector('.ptext'):null;var text=textEl?textEl.textContent:'';
        function done(){var prev=btn.textContent;btn.textContent='Copied';btn.classList.add('ok');setTimeout(function(){btn.textContent=prev;btn.classList.remove('ok');},1600);}
        if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,function(){fallback(text,done);});}else{fallback(text,done);}
      });
    });
    function fallback(text,done){var ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='absolute';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch(e){}document.body.removeChild(ta);}
  })();
`;

const statusClass = (s) => "s-" + (s === "N/A" ? "na" : s.toLowerCase());
const badgeClass = (s) => "b-" + (s === "N/A" ? "na" : s.toLowerCase());
const badgeLabel = (s) => (s === "N/A" ? "N/A" : s.charAt(0) + s.slice(1).toLowerCase());

function htmlMatrix(m) {
  const tiers = m.tiers.map((t) => {
    const cells = t.rows.map((r) =>
      `<a class="cell ${statusClass(r.status)}" href="#row-${r.reqId}"><span class="cst"></span><span class="cid">${escapeHtml(r.reqId)}</span><span class="cnm">${escapeHtml(r.id)}</span></a>`
    ).join("\n");
    const counts = [`${t.total} checks`, `${t.pass} pass`, t.warn ? `${t.warn} warn` : null, t.fail ? `${t.fail} fail` : null, t.na ? `${t.na} n/a` : null].filter(Boolean).join(" / ");
    return `<div class="mx-tier"><div class="th"><span class="badge-tier ${t.cls}">${t.name}</span><span class="tname">${t.sub}</span><span class="tcount">${counts}</span></div><div class="mx-grid">${cells}</div></div>`;
  }).join("\n");
  return `<section class="matrixzone" id="matrix"><div class="wrap"><div class="barhead"><h2>${m.counts.total}-check status matrix</h2><span class="hint">Whole-library state at a glance. The itemized evidence ledger follows in section 05.</span></div>
  <div class="mx-legend"><span><i class="swatch sw-pass"></i> Pass</span><span><i class="swatch sw-fail"></i> Fail (blocks its tier)</span><span><i class="swatch sw-warn"></i> Warn (advisory)</span><span><i class="swatch sw-na"></i> N/A (vacuous pass)</span></div>
  ${tiers}</div></section>`;
}

function htmlLedger(m) {
  return m.tiers.map((t) => {
    const bar = `<div class="tierbar ${t.cls}"><span class="ts">${t.name}</span><span class="tv">${t.fail ? `${t.satisfied} satisfied, ${t.fail} block the tier` : "Tier satisfied"}.</span><span class="tfrac">${t.satisfied} / ${t.total}</span></div>`;
    const rows = t.rows.map((r) => {
      const cls = r.status === "FAIL" ? " is-fail" : r.status === "WARN" ? " is-warn" : r.status === "N/A" ? " is-na" : "";
      const why = (r.status === "FAIL" || r.status === "WARN")
        ? `<div class="why${r.status === "WARN" ? " warn" : ""}"><b>Why it matters</b>${escapeHtml(r.why)}</div>` : "";
      const fileBit = r.file ? ` <span class="src">${escapeHtml(r.file)}</span>` : "";
      return `<div class="lrow${cls}" id="row-${r.reqId}"><div class="lst"><span class="rid">${escapeHtml(r.reqId)}</span><span class="rname">${escapeHtml(r.id)}</span><span class="badge ${badgeClass(r.status)}"><span class="dot ${r.status === "N/A" ? "na" : r.status.toLowerCase()}"></span>${badgeLabel(r.status)}</span></div><div class="lbody"><p class="ev">${escapeHtml(r.evidence)}${fileBit} <span class="src">${escapeHtml(r.module)}</span></p>${why}</div></div>`;
    }).join("\n");
    return `${bar}<div class="ledger">${rows}</div>`;
  }).join("\n");
}

function htmlSection(id, num, title, lead, body) {
  return `<section id="${id}"><div class="seclabel"><span class="num">${num}</span><h2 class="sec">${escapeHtml(title)}</h2></div><p class="lead">${escapeHtml(lead)}</p>${body}</section>`;
}

// Release readiness band (release reports): a prominent go / no-go right after the masthead.
function htmlReleaseReadiness(m) {
  const rel = m.release;
  const rows = [
    ["Go / no-go", rel.goNoGo.toUpperCase()],
    ["Gate exit code", `${rel.gateExit}${rel.gateExit === 0 ? " (clean)" : " (fails)"}`],
    ["Version consistency", `${rel.versionConsistency.ok ? "OK" : "MISMATCH"}: ${rel.versionConsistency.detail}`],
    ["Release notes", rel.notesPresent ? "present" : "missing"],
    ["Notes summary", rel.summary ?? "(none)"],
  ];
  return `<section class="matrixzone" id="readiness"><div class="wrap"><div class="barhead"><h2>Release readiness: ${escapeHtml(rel.goNoGo.toUpperCase())}</h2><span class="hint">A deterministic go / no-go: a clean gate, version consistency across the manifests, and release notes present.</span></div><div class="panel"><div class="meta-grid">${rows.map(([k, v]) => `<div><span class="mk">${escapeHtml(k)}</span><span class="mv">${escapeHtml(v)}</span></div>`).join("")}</div></div></div></section>`;
}

// Migration ladder (section 06 body for migration reports): each stage and its blockers.
function htmlMigrationLadderBody(m) {
  return m.migration.stages.map((s) => {
    const tn = TIER_NAME[s.tier] ?? s.tier;
    const body = s.blockers.length
      ? `<div class="ledger">${s.blockers.map((b) => `<div class="lrow is-fail"><div class="lst"><span class="rid">${escapeHtml(b.reqId)}</span><span class="badge b-fail"><span class="dot fail"></span>${escapeHtml(b.effort || "")}</span></div><div class="lbody"><p class="ev">${escapeHtml(b.message)}</p></div></div>`).join("")}</div>`
      : `<p>No blockers at this stage.</p>`;
    return `<h3>To ${escapeHtml(tn)}</h3>${body}`;
  }).join("");
}

// Migration plan (section 07 body for migration reports): a copy-paste card per blocker, grouped by stage.
function htmlMigrationPlanBody(m) {
  return m.migration.stages.map((s) => {
    const tn = TIER_NAME[s.tier] ?? s.tier;
    const cards = s.blockers.length
      ? s.blockers.map((b) => `<div class="imp"><div class="top"><span class="rtag gold">${escapeHtml(b.reqId)}</span><h4>Reach ${escapeHtml(tn)}</h4>${b.effort ? `<span class="pill">${escapeHtml(b.effort)}</span>` : ""}</div><div class="ifgrid"><b>Issue:</b> ${escapeHtml(b.message)}</div>${b.fixPrompt ? `<div class="prompt"><span class="lbl">Copy-paste prompt</span><button class="copy" type="button">Copy</button><span class="ptext">${escapeHtml(b.fixPrompt)}</span></div>` : ""}</div>`).join("")
      : `<p>Nothing blocks this stage.</p>`;
    return `<h3>Stage: reach ${escapeHtml(tn)}</h3>${cards}`;
  }).join("");
}

function renderHtml(report, opts = {}) {
  const m = deriveModel(report, opts);
  const sealCls = m.isPlugin ? (TIER_CLASS[m.tierEarned] ?? "") : "";
  const chips = [
    `<span class="chip">Skill Library Evaluation</span>`,
    m.standard ? `<span class="chip">Standard v${escapeHtml(m.standard)}</span>` : "",
    m.date ? `<span class="chip">Evaluated ${escapeHtml(m.date)}</span>` : "",
    `<span class="chip ${m.exitCode === 0 ? "live" : ""}">Gate exit ${escapeHtml(String(m.exitCode))}</span>`,
  ].filter(Boolean).join("\n");

  const kpis = m.isPlugin ? `<div class="kpis">
    <div class="kpi accent-pass"><div class="k">Checks passed</div><div class="v">${m.counts.passedHeadline}<small>/${m.counts.total}</small></div><div class="n">non-failing checks</div></div>
    <div class="kpi"><div class="k">Tier earned</div><div class="v">${escapeHtml(m.tierEarnedName)}</div><div class="n">${escapeHtml(TIER_SUB[m.tierEarned] ?? "")}</div></div>
    <div class="kpi accent-fail"><div class="k">Blockers</div><div class="v">${m.counts.fail}</div><div class="n">${m.blockers.map((b) => escapeHtml(b.reqId)).join(", ") || "none"}</div></div>
    <div class="kpi accent-warn"><div class="k">Advisory warnings</div><div class="v">${m.counts.warn}</div><div class="n">${m.rows.filter((r) => r.status === "WARN").map((r) => escapeHtml(r.reqId)).join(", ") || "none"}</div></div>
    <div class="kpi ${m.exitCode === 0 ? "accent-pass" : "accent-fail"}"><div class="k">Gate exit code</div><div class="v">${m.exitCode}</div><div class="n">${m.exitCode === 0 ? "declared tier satisfied" : "gate fails"}</div></div>
  </div>` : "";

  const meters = m.isPlugin ? `<div class="meters">${m.tiers.map((t) => `<div class="meter"><div class="mtop"><span class="mname"><span class="dotc ${t.cls}"></span>${t.name}</span><span class="mfrac">${t.satisfied} / ${t.total}</span></div><div class="track"><div class="fill ${t.cls}" style="width:${Math.round((t.satisfied / t.total) * 100)}%"></div></div></div>`).join("")}</div>` : "";

  const climb = m.isPlugin
    ? `<div class="climb">${m.blockers.length ? `<b>Climb to ${escapeHtml(m.nextTierName)}:</b> ${m.blockers.length} requirement(s) remain - ${m.blockers.map((b) => `<b>${escapeHtml(b.reqId)}</b>`).join(", ")}. See the burndown in section 06.` : `<b>No blockers:</b> the declared tier is fully satisfied.`}</div>`
    : "";

  const verdict = m.isPlugin ? `<div class="verdictcard">
    <div class="lockup"><div class="seal ${sealCls}"><div><div class="tier">${escapeHtml(m.tierEarnedName)}</div><div class="tlbl">${escapeHtml(TIER_SUB[m.tierEarned] ?? "")}</div></div></div>
    <div class="vtext"><div class="ve">Verdict</div><div class="vg">Earns ${escapeHtml(m.tierEarnedName)}</div><div class="vsub">Declared ${escapeHtml(TIER_SUB[m.declaredTier] ?? m.declaredTier)}; ${m.tierEarned === m.declaredTier ? "matches its declared tier" : "graded against its declared tier"}.</div></div></div>
    ${climb}${meters}</div>` : `<div class="verdictcard"><div class="lockup"><div class="seal"><div><div class="tier" style="font-size:13px">Component</div></div></div><div class="vtext"><div class="ve">Scope</div><div class="vg">Single component</div><div class="vsub">Graded by rule; a lone component has no tier.</div></div></div></div>`;

  const masthead = `<header class="masthead" id="s01"><div class="wrap">
    <div class="mh-top">${chips}</div>
    <div class="mh-grid">
      <div class="mh-id"><h1>${escapeHtml(m.subject)}</h1><div class="vv">${m.version ? "version " + escapeHtml(m.version) : "version unspecified"}${m.isPlugin ? " &nbsp;/&nbsp; declared tier: " + escapeHtml(m.declaredTier) : ""}</div>
      <p class="desc">Whole-library tier-compliance evaluation against the Advanced Skill Library Standard. Rendered from the one deterministic report object; the verdict is the gate's.</p>${kpis}</div>
      ${verdict}
    </div></div></header>`;

  // 02 exec
  const execBody = m.isPlugin
    ? `<div class="aside"><h4>How to read this report</h4><p>The colored matrix above is the whole verdict in one glance: every check is a chip, color-coded pass / fail / warn / not-applicable, grouped by tier. The tier is decided by a deterministic gate with a real exit code, not by opinion. Everything below expands that picture.</p></div>
      <p>${escapeHtml(m.subject)} declares the <b>${escapeHtml(TIER_NAME[m.declaredTier] ?? m.declaredTier)} (${escapeHtml(TIER_SUB[m.declaredTier] ?? m.declaredTier)})</b> tier and earns <b>${escapeHtml(m.tierEarnedName)}</b>. Of the ${m.counts.total} checks in the spine, ${m.counts.passedHeadline} do not fail (${m.counts.pass} pass, ${m.counts.warn} warn, ${m.counts.na} not applicable) and ${m.counts.fail} fail. The deterministic gate exits ${m.exitCode}.</p>
      <p>${m.blockers.length ? `${m.blockers.length} requirement(s) block ${escapeHtml(m.nextTierName)}: ${m.blockers.map((b) => escapeHtml(b.reqId)).join(", ")}. Section 06 orders the climb; section 07 gives a copy-paste fix for each.` : "No requirement blocks the declared tier; the library satisfies its claimed grade outright."}</p>
      ${m.counts.warn ? `<p>${m.counts.warn} advisory warning(s) surfaced (${m.rows.filter((r) => r.status === "WARN").map((r) => escapeHtml(r.reqId)).join(", ")}); they do not gate but are worth folding in.</p>` : ""}`
    : `<p>${escapeHtml(m.subject)} is a single component, graded by rule rather than by tier. ${m.counts.fail} error(s) and ${m.counts.warn} warning(s) were found across the component-level checks.</p>`;

  // 03 what was evaluated
  const idCells = [["Subject", m.subject], ["Version", m.version ?? "(unspecified)"]];
  if (m.isPlugin) idCells.push(["Declared tier", `${TIER_SUB[m.declaredTier] ?? m.declaredTier} (${TIER_NAME[m.declaredTier] ?? m.declaredTier})`]);
  if (m.agentTargets) idCells.push(["Agent targets", m.agentTargets.join(", ")]);
  if (m.prefix) idCells.push(["Prefix", m.prefix]);
  if (m.profile) idCells.push(["Grading profile", m.profile]);
  const idstrip = `<div class="idstrip">${idCells.map(([k, v]) => `<div class="ic"><div class="ick">${escapeHtml(k)}</div><div class="icv">${escapeHtml(v)}</div></div>`).join("")}</div>`;
  const inv = componentInventory(m.components);
  const invTable = inv.length
    ? `<div class="tablecard"><table><thead><tr><th>Component</th><th style="width:120px">Type</th><th style="width:120px">Version</th></tr></thead><tbody>${inv.map((c) => `<tr><td><span class="cn">${escapeHtml(c.name)}</span></td><td>${escapeHtml(c.type)}</td><td>${escapeHtml(c.version ?? "")}</td></tr>`).join("")}</tbody></table></div>`
    : `<p>No component inventory was provided on the report object.</p>`;

  // 04 methodology
  const methodBody = `<div class="guarantees">
    <div class="gtile bronze"><div class="gt">Layer 1 - Conformance</div><p><b>Decides the tier.</b> The portable Node gate runs every check with a real exit code, no model in the loop. Re-run <code>node scripts/check.mjs .</code> to reproduce it.</p></div>
    <div class="gtile silver"><div class="gt">Layer 2 - Behavioral</div><p><b>Advisory only.</b> A skill is run against its eval set; results are evidence and never decide a gate result.</p></div>
    <div class="gtile gold"><div class="gt">Layer 3 - Review</div><p><b>Advisory only.</b> A qualitative pass over scoping and design; it informs the insights, it does not move the badge.</p></div></div>
    <h3>Status legend</h3>
    <div class="legend"><span><span class="badge b-pass"><span class="dot pass"></span>Pass</span> requirement met</span><span><span class="badge b-fail"><span class="dot fail"></span>Fail</span> blocks the tier</span><span><span class="badge b-warn"><span class="dot warn"></span>Warn</span> advisory</span><span><span class="badge b-na"><span class="dot na"></span>N/A</span> vacuous pass</span></div>
    <div class="aside" style="margin-top:18px"><h4>Confidence and limitations</h4><p>Conformance findings are exact and reproducible: the same gate on the same commit yields the same result. ${m.rows.filter((r) => r.status === "N/A").length ? `Vacuous passes (${m.rows.filter((r) => r.status === "N/A").map((r) => escapeHtml(r.reqId)).join(", ")}) mean there was nothing to validate, not that a feature was exercised.` : ""}</p></div>`;

  // 05 ledger + 06 climb (plugin only)
  const ledgerSection = m.isPlugin
    ? htmlSection("s05", "05", "Tier compliance - evidence ledger", `One row per requirement, all ${m.counts.total} itemized and grouped by tier. Every non-pass carries a why-it-matters note.`, htmlLedger(m))
    : htmlSection("s05", "05", "Tier compliance", "A single component is graded by rule, not by tier; the per-tier ledger does not apply.", `<p>Component-level findings appear in the improvement path below.</p>`);

  const climbBody = m.isPlugin && m.blockers.length
    ? `<div class="worklist">${m.blockers.map((b) => `<div class="wlitem"><div class="ord"></div><div class="wmeta"><h4><span class="wid">${escapeHtml(b.reqId)}</span>${escapeHtml(metaFor(b.reqId).why ? b.message.split(";")[0] : b.message)}</h4><div class="wd">${escapeHtml(b.message)}</div></div><div class="eff"><small>Effort</small>${escapeHtml(b.effort || "")}</div></div>`).join("")}</div><p style="margin-top:14px;font-size:13.5px;color:var(--ink-soft)">After these, re-run <code>node scripts/check.mjs .</code>; the ${escapeHtml(m.nextTierName ?? "next")} tier should clear.</p>`
    : `<p>No blockers: the declared tier is satisfied. There is nothing to climb.</p>`;
  const climbSection = (m.reportType === "migration" && m.migration)
    ? htmlSection("s06", "06", "The climb / burndown", `The staged ladder from ${TIER_NAME[m.migration.currentTier] ?? m.migration.currentTier} to ${TIER_NAME[m.migration.targetTier] ?? m.migration.targetTier}.`, htmlMigrationLadderBody(m))
    : m.isPlugin
    ? htmlSection("s06", "06", "The climb / burndown", m.blockers.length ? `Exactly what blocks ${m.nextTierName}, ordered as a worklist.` : "No blockers; the declared tier is satisfied.", climbBody)
    : htmlSection("s06", "06", "The climb / burndown", "Not applicable to a single component.", `<p>A component carries no tier, so there is no climb.</p>`);

  // 07 improvement
  const impLead = (m.reportType === "migration" && m.migration)
    ? "The staged plan, one copy-paste prompt per blocker, ordered by stage."
    : "One card per gap: the issue, priority and effort, and a copy-paste prompt that drives the matching askit builder and re-runs the gate.";
  const impBody = (m.reportType === "migration" && m.migration)
    ? htmlMigrationPlanBody(m)
    : m.improvements.length
    ? m.improvements.map((c) => `<div class="imp"><div class="top"><span class="rtag ${c.status === "FAIL" ? "gold" : "warn"}">${escapeHtml(c.reqId)}</span><h4>${escapeHtml(c.id)}</h4><span class="pill ${c.status === "FAIL" ? "p-high" : "p-med"}">Priority ${c.priority.toLowerCase()}</span>${c.effort ? `<span class="pill">${escapeHtml(c.effort)}</span>` : ""}</div><div class="ifgrid"><b>Issue:</b> ${escapeHtml(c.message)}</div>${c.fixPrompt ? `<div class="prompt"><span class="lbl">Copy-paste prompt</span><button class="copy" type="button">Copy</button><span class="ptext">${escapeHtml(c.fixPrompt)}</span></div>` : ""}</div>`).join("")
    : `<p>No action required; nothing failed or warned.</p>`;

  // 08 insights
  const insBody = m.insights && m.insights.length
    ? m.insights.map((s, i) => `<div class="insight"><div class="ic">${String(i + 1).padStart(2, "0")}</div><div><p>${escapeHtml(s)}</p></div></div>`).join("")
    : `<div class="aside"><h4>No insights in a conformance report</h4><p>Insights are produced by the advisory review layer (askit-reviewer), which a deterministic conformance report does not run. Run review mode to populate this section; a conformance report does not fabricate qualitative notes.</p></div>`;
  const insLead = m.insights && m.insights.length ? "Qualitative observations from the advisory review layer." : "None for a deterministic conformance report.";

  // 09 sources
  const firedModules = [...new Set(m.rows.filter((r) => r.status === "FAIL" || r.status === "WARN").map((r) => r.module))];
  const refItems = [`<li><span class="tag">CHECK</span><span><span class="ck">scripts/check.mjs</span> - the portable deterministic gate (<code>node scripts/check.mjs .</code>); its exit code drives the verdict.</span></li>`];
  for (const mod of firedModules) refItems.push(`<li><span class="tag">MODULE</span><span><span class="ck">${escapeHtml(mod)}</span> - the check behind a non-pass row above.</span></li>`);
  if (m.standard) refItems.push(`<li><span class="tag">CLAUSE</span><span><span class="ck">Standard v${escapeHtml(m.standard)}</span> - the ${m.counts.total}-check spine and the Bronze / Silver / Gold tier definitions.</span></li>`);
  refItems.push(`<li><span class="tag">FILE</span><span><span class="ck">library.json</span> - the subject identity (name, version, tier, agent-targets, prefix).</span></li>`);

  // 10 metadata
  const metaItems = [
    ["Subject", `${m.subject}${m.version ? " v" + m.version : ""}`],
    ["Standard version", m.standard ? "v" + m.standard : "(unspecified)"],
    ["Spine", `${m.counts.total} checks`],
  ];
  if (m.isPlugin) { metaItems.push(["Declared tier", m.declaredTier]); metaItems.push(["Grade earned", `${m.tierEarnedName} (${TIER_SUB[m.tierEarned] ?? m.tierEarned})`]); }
  if (m.profile) metaItems.push(["Grading profile", m.profile]);
  if (m.mode) metaItems.push(["Verdict mode", m.mode]);
  metaItems.push(["Evaluator", "askit-evaluate (renderer)"]);
  metaItems.push(["Gate exit code", String(m.exitCode)]);
  metaItems.push(["Evaluated", m.date]);
  metaItems.push(["Checks", `${m.counts.pass} PASS / ${m.counts.fail} FAIL / ${m.counts.warn} WARN / ${m.counts.na} N/A`]);
  const metaBody = `<div class="panel"><div class="meta-grid">${metaItems.map(([k, v]) => `<div><span class="mk">${escapeHtml(k)}</span><span class="mv">${escapeHtml(v)}</span></div>`).join("")}</div></div>
    <h3>Status legend</h3><div class="legend"><span><span class="badge b-pass"><span class="dot pass"></span>Pass</span> requirement met</span><span><span class="badge b-fail"><span class="dot fail"></span>Fail</span> blocks the tier</span><span><span class="badge b-warn"><span class="dot warn"></span>Warn</span> advisory</span><span><span class="badge b-na"><span class="dot na"></span>N/A</span> vacuous pass</span></div>
    <p class="footnote">Generated by the askit-evaluate report renderer. The conformance layer is deterministic and reproducible; re-run <code>node scripts/check.mjs .</code> to reproduce every finding. This report adds no judgment and does not change the verdict.</p>`;

  const toc = `<nav id="toc">
    <a href="#s01"><span class="ix">01</span><span>Verdict</span></a>
    <a href="#matrix"><span class="ix">--</span><span>Status matrix</span></a>
    <a href="#s02"><span class="ix">02</span><span>Executive summary</span></a>
    <a href="#s03"><span class="ix">03</span><span>What was evaluated</span></a>
    <a href="#s04"><span class="ix">04</span><span>Methodology and scope</span></a>
    <a href="#s05"><span class="ix">05</span><span>Tier compliance ledger</span></a>
    <a href="#s06"><span class="ix">06</span><span>The climb / burndown</span></a>
    <a href="#s07"><span class="ix">07</span><span>Improvement path</span></a>
    <a href="#s08"><span class="ix">08</span><span>Insights</span></a>
    <a href="#s09"><span class="ix">09</span><span>Evidence and sources</span></a>
    <a href="#s10"><span class="ix">10</span><span>Report metadata</span></a>
  </nav>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(m.subject)}${m.version ? " " + escapeHtml(m.version) : ""} - Skill Library Evaluation</title>
<style>${STYLE}</style>
</head>
<body>
<div class="toolbar"><button onclick="window.print()" title="Print or save as PDF">Print / Save PDF</button></div>
<div class="shell">
  <aside class="rail">
    <div class="mark"><div class="glyph">AS</div><div class="nm">agent-skills-toolkit<small>askit-evaluate</small></div></div>
    <div class="railhead">Report Sections</div>
    ${toc}
    <div class="railnote">Conformance is deterministic and reproducible; re-run the gate to confirm. This renderer adds no judgment.</div>
  </aside>
  <main class="content">
    ${masthead}
    ${m.reportType === "release" && m.release ? htmlReleaseReadiness(m) : ""}${htmlMatrix(m)}
    <div class="wrap">
      ${htmlSection("s02", "02", "Executive summary", "A derived, plain-language read of the deterministic result.", execBody)}
      ${htmlSection("s03", "03", "What was evaluated", "The subject identity, then the component inventory.", idstrip + invTable)}
      ${htmlSection("s04", "04", "Methodology and scope", "Three layers, kept separate so the verdict stays honest. Only the deterministic gate decides the tier.", methodBody)}
      ${ledgerSection}
      ${climbSection}
      ${htmlSection("s07", "07", "Improvement path", impLead, impBody)}
      ${htmlSection("s08", "08", "Insights", insLead, insBody)}
      ${htmlSection("s09", "09", "Evidence and sources", "Citations grounding the findings: the check module, Standard clause, or subject file.", `<ul class="refs">${refItems.join("")}</ul>`)}
      ${htmlSection("s10", "10", "Report metadata", "Provenance for this evaluation, plus the legend.", metaBody)}
    </div>
  </main>
</div>
<script>${SCRIPT}</script>
</body>
</html>
`;
}

export { renderMarkdown, renderHtml };
