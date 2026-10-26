// what-it-is:   the structured evaluator behind askit-evaluate
// what-it-does: produces the one report object (terminal, --json) over a plugin's conformance, used by the askit-evaluate skill
// why:          a single report object keeps the terminal, JSON, and future MD/HTML renderers from diverging
// used-by:      run by the askit-evaluate skill and askit-build-docs improve mode
import path from "node:path";
import { existsSync, statSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { loadPlugin, loadSkill, looksLikePlugin } from "./lib/load-plugin.mjs";
import { detectMarketplaceScope, evaluateMarketplace, formatMarketplaceReport, marketplaceExitCode } from "./lib/marketplace/evaluate-marketplace.mjs";
import { runAllChecks, provenanceByReq, CHECKS } from "./lib/registry.mjs";
import { SINCE_BY_REQ } from "./lib/standard-gate.mjs";
import { loadConfig, withGraderOptions } from "./lib/config.mjs";
import { PROFILES } from "./lib/profiles.mjs";
import { resolveFindings } from "./lib/resolve-config.mjs";
import { computeTierReport } from "./tier-report.mjs";
import { checkAgentskills } from "./checks/agentskills.mjs";
import { finding, SEVERITY, isOperatorFinding } from "./lib/findings.mjs";
import { readJsonSafe, SKIP_DIRS, normalizeArgPath } from "./lib/fs-utils.mjs";
import { gateExitFromFindings, newerStandardNotice, computeAdvisoryLayer } from "./check.mjs";
import { shippedStandardEdition } from "./lib/shipped-standard.mjs";

function groupByRule(findings) {
  const byRule = {};
  for (const f of findings) {
    const key = f.reqId ?? f.check;
    (byRule[key] ??= []).push(f);
  }
  return byRule;
}

const effSev = (f) => f.effectiveSeverity ?? f.severity; // resolved findings carry effectiveSeverity; unknown-scope findings fall back

// ADR 0063 sec 1: `advisoryLayer`/`advisoryFindings` default to "the layer did not run" (off/null)
// rather than "on/empty", because baseReport() is also used for the "unknown" scope (not a plugin or a
// skill), where there is no ctx to run a module against at all - "ran and found nothing" would be a
// claim this function never made true. evaluate() and evaluateComponent() below compute the REAL
// advisory result via computeAdvisoryLayer() and pass it in explicitly for plugin and component scope.
function baseReport(scope, target, findings, advisory = { advisoryLayer: "off", advisoryFindings: null }) {
  return {
    scope,
    target,
    findings,
    byRule: groupByRule(findings),
    summary: {
      errors: findings.filter((f) => effSev(f) === "error" && !f.suppressed).length,
      warns: findings.filter((f) => effSev(f) === "warn" && !f.suppressed).length,
    },
    // Namespaced and never merged into `findings`/`byRule` above - the identical partition runGate()
    // keeps in scripts/check.mjs, for the identical reason (ADR 0063 sec 1: `reqId: null` does not
    // protect a verdict path on its own; only the separate array does).
    advisoryLayer: advisory.advisoryLayer,
    advisoryFindings: advisory.advisoryFindings,
  };
}

// F3: split the resolved findings into portable "real issues" (objective + vendor-cited errors that
// survive config) vs askit "profile conformance" (house errors + profile/override downgrades), plus the
// suppressed count and the published-verdict clamp count. A clamped finding (an objective/vendor check a
// subject tried to disable, surfaced at warn) is its OWN disposition, never folded into profile conformance.
export function dispositions(resolved) {
  // An ORDERED, EXHAUSTIVE partition with exact predicates: FIRST MATCH WINS, and the five buckets sum
  // to the finding count.
  //
  // They did not before. A live non-house error reduced by config was counted in BOTH realIssues and
  // profileConformance, and a warn reduced from error was in both warns and profileConformance - so
  // "the buckets sum" was never true of the old code either, which is what everyone assumed they could
  // do. Under first-match each finding lands in exactly one bucket, so profileConformance and warns both
  // SHRINK. That is the cost of a partition consumers can actually sum, and it is a public meaning
  // change recorded in ADR 0044 rather than slipped in.
  //
  // `warns` is the RESIDUAL rather than "every live warning", which is what makes the partition
  // satisfiable at all: a grader-profile-reduced U4 warn belongs to profileConformance and would
  // otherwise also be a live warning, making the two buckets provably non-exclusive.
  const counts = { realIssues: 0, profileConformance: 0, suppressed: 0, clamped: 0, warns: 0 };
  const byProvenance = {};
  // ORTHOGONAL to the partition and deliberately excluded from its sum: ONE finding can both have its
  // severity raised and its suppression cleared, so these cannot be buckets. They exist because
  // narrowing the clampNotice mirror costs an AGGREGATE signal - automation watching
  // `dispositions.clamped` to detect an ATTEMPTED disabling would now silently read zero, and a
  // per-finding trustNotice does not replace a counter.
  const trustActions = { raised: 0, suppressionsCleared: 0 };

  for (const f of resolved) {
    if (f.trust?.raised) trustActions.raised++;
    if (f.trust?.suppressionCleared) trustActions.suppressionsCleared++;

    if (f.suppressed) { counts.suppressed++; continue; }
    byProvenance[f.provenance] = (byProvenance[f.provenance] ?? 0) + 1;
    if (f.clampNotice != null) { counts.clamped++; continue; }
    if (f.effectiveSeverity === "error" && f.provenance !== "house") { counts.realIssues++; continue; }
    // An unreduced house error stays here, exactly as today. `configReduced` rather than
    // `downgradedFrom != null`: the latter also catches a ceiling-lowered finding, filing pin-driven
    // Standard debt under "profile conformance" - which it is not, and which standardDebtLine and the
    // `ceiling` field already report. It also catches a subject INCREASE, which is not conformance at all.
    if ((f.effectiveSeverity === "error" && f.provenance === "house") || f.configReduced) { counts.profileConformance++; continue; }
    counts.warns++;
  }
  return { ...counts, byProvenance, trustActions };
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
  // Component scope has no library.json and therefore no pin: `pinned` stays undefined, so every version
  // constraint is inert and a single skill grades at full strength, exactly as it does today.
  const resolved = resolveFindings([...configFindings, ...checkAgentskills(ctx)], cfg, provenanceByReq(), { sinceByReq: SINCE_BY_REQ });
  // ADR 0063: component scope runs the advisory layer too, honoring --no-advisory and the resolved
  // profile's off-set exactly as plugin scope does (computeAdvisoryLayer is the one shared
  // implementation - see its docblock in scripts/check.mjs).
  const advisory = computeAdvisoryLayer(ctx, { noAdvisory: opts.noAdvisory, profile: cfg.profile.value, advisoryModules: opts.advisoryModules });
  return { ...baseReport("component", target, resolved, advisory), profile: cfg.profile.value, mode: cfg.mode.value };
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
    // F1 (ADR 0027), now ADR 0044: the pin is honoured by a ceiling applied last inside resolveFindings,
    // so a consumer's own `rules` override can no longer beat it (E26).
    const raw = runAllChecks(ctx);
    // F3: resolve config (profile + per-rule override + suppressions + published-verdict clamp), so the
    // report object, summary, dispositions split, and --json all reflect the consumer's grading config.
    const { config, findings: configFindings } = loadConfig(target);
    // CLI --mode / --profile override the file (so a third-party plugin can be graded under a chosen
    // profile without writing askit.config.json into its tree); an explicit per-rule override still wins.
    const cfg = withGraderOptions(config, opts);
    const resolved = resolveFindings([...configFindings, ...raw], cfg, provenanceByReq(), { pinned: ctx.library?.data?.standard, sinceByReq: SINCE_BY_REQ });
    const t = computeTierReport(target, ctx, resolved);
    // ADR 0063: the same shared advisory computation runGate() uses (scripts/check.mjs), so
    // --no-advisory and a profile's house-provenance off-set behave IDENTICALLY whether a plugin is
    // graded through check.mjs or through evaluate.mjs.
    const advisory = computeAdvisoryLayer(ctx, { noAdvisory: opts.noAdvisory, profile: cfg.profile.value, advisoryModules: opts.advisoryModules });
    return {
      ...baseReport("plugin", target, resolved, advisory),
      tier: t.tier, satisfies: t.satisfies, blocked: t.blocked,
      profile: cfg.profile.value, mode: cfg.mode.value,
      dispositions: dispositions(resolved),
      // E77: the same presentation-only notice check.mjs's buildJsonReport carries, read directly from
      // the DECLARED pin (never the ceiling-only `pinned` resolveFindings used above) against this
      // toolkit's own shipped STANDARD.md edition. null when it does not apply - see newerStandardNotice.
      standardEditionNotice: newerStandardNotice(ctx.library?.data?.standard, shippedStandardEdition()) || null,
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
    // F-011: an operator finding is about askit.config.json, the grader's rubric file. It is labelled
    // here for the same reason check.mjs gives it its own block: printed as `[error] config: ...` in the
    // same stream as U1 and G4, it reads as a conformance defect of the plugin, which it is not.
    if (isOperatorFinding(f)) {
      lines.push(`  [operator/${effSev(f)}] ${f.message} (your grader configuration, not the plugin; it does not affect the tier)${f.file ? "  -> " + f.file : ""}`);
      continue;
    }
    lines.push(`  [${effSev(f)}] ${f.reqId ?? f.check}: ${f.message}${f.clampNotice && !f.trustNotice ? " [clamped to warn: published-verdict]" : ""}${f.trustNotice ? ` [${f.trustNotice}]` : ""}${f.migrationNotice ? ` [${f.migrationNotice}]` : ""}${f.file ? "  -> " + f.file : ""}`);
  }
  if (r.tier !== undefined) lines.push(`Tier: ${r.tier}`);
  lines.push(`${r.summary.errors} error(s), ${r.summary.warns} warning(s).`);
  if (r.dispositions) {
    const d = r.dispositions;
    lines.push(`Real issues (objective + vendor-cited errors): ${d.realIssues}`);
    lines.push(`Profile conformance (house conventions, profile downgrades): ${d.profileConformance}   suppressed: ${d.suppressed}`);
    // Only the findings the DEPRECATED mechanism is the sole explanation for. A finding carrying both
    // clampNotice and trustNotice is ONE event, and printing "Clamped: 1" beside "Trust actions: 1
    // severity restored" describes it twice and makes the retired mechanism look current.
    // `dispositions.clamped` is unchanged in the machine data, where compatibility requires it.
    const clampedOnly = r.findings.filter((x) => x.clampNotice != null && !x.trustNotice && !x.suppressed).length;
    if (clampedOnly > 0) lines.push(`Clamped (objective/vendor checks this config tried to disable, surfaced at warn): ${clampedOnly}`);
    // The aggregate a per-finding notice cannot replace. Without it, a published verdict that failed
    // BECAUSE the subject's own configuration was overruled looks identical to one that failed on an
    // ordinary finding, and automation watching for an attempted disabling reads nothing at all.
    if (d.trustActions.raised > 0 || d.trustActions.suppressionsCleared > 0) {
      lines.push(
        `Trust actions (published-verdict: the subject's own settings overruled): ` +
        `${d.trustActions.raised} severity restored, ${d.trustActions.suppressionsCleared} suppression(s) cleared`
      );
    }
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

// Returns true when library.json declares at least one component entry in any of its component lists.
// That is STRICTER than G6's own early return, which is `if (!lib || typeof lib.components !== "object"
// || lib.components === null) return []` (checks/deprecation.mjs:21) - object-ness, never entry count.
// Measured 2026-09-18: a library.json carrying `"components": {}` makes this return false, so the report
// says N/A, while deprecation.mjs does NOT early-return - it iterates an empty map and returns [].
// Deliberately NOT "a deprecated entry exists": G6 validates the `status` of EVERY entry, so an
// all-active plugin has had its statuses read and passed.
function targetHasComponentEntries(target) {
  const components = readJsonSafe(path.join(target, "library.json")).data?.components;
  if (!components || typeof components !== "object" || Array.isArray(components)) return false;
  return Object.values(components).some((list) => Array.isArray(list) && list.length > 0);
}

// Builds the set of reqIds that render N/A (not PASS) when no findings are present.
//
// N/A means the check had nothing of its own to examine. Every entry is derived from the subject on
// disk and APPROXIMATES the check's not-applicable case; it is NOT the module's early-return expression,
// and the two can diverge. Measured 2026-09-18: `"components": {}` puts G6 in this set while
// deprecation.mjs does not early-return, and a `.mcp.json` holding `{"mcpServers": {}}` keeps U11 OUT of
// it while mcp-valid.mjs returns early on `servers.length === 0`. Each line below says what is tested
// here, which is the only thing the report can claim.
//
// This replaces a FIXED base set of G1, G6 and U11 "whose artifacts are always optional", which was
// F-007 of the 2026-09-04 audit: those three were N/A on every subject, including one that has the
// artifact. This repository ships hooks/hooks.json and declares 35 components, and its own report
// read `G1 hook-documentation | N/A | Nothing to validate for this subject (vacuous pass).` for a
// hook G1 had examined and passed - while docs/explanation/validation-and-improvement.md said the
// Gold checks "grade real artifacts (a real hook, ...), not empty placeholders". Both could not be
// true. Reproduced and guarded in tests/unit/evaluate-conditional.test.mjs.
export function buildConditional(target) {
  // No subject: no precondition can be evaluated, so nothing may be reported as examined.
  if (!target) return new Set(["U11", "U12", "U13", "G1", "G6"]);
  const conditional = new Set();
  // U11 (mcp-valid): no .mcp.json on disk - the module's own docblock says "Conditional: no .mcp.json
  // => not applicable". A PRESENT .mcp.json declaring no servers stays out of this set even though
  // mcp-valid.mjs returns early on it; see the divergence noted above.
  if (!existsSync(path.join(target, ".mcp.json"))) conditional.add("U11");
  // U12 (mermaid-valid): no fenced mermaid block anywhere, so there is no diagram to parse.
  if (!targetHasMermaidBlocks(target)) conditional.add("U12");
  // U13 (skill-registration): no enumerating manifest, so there is nothing to reconcile against disk.
  if (!targetHasEnumeratingManifest(target)) conditional.add("U13");
  // G1 (hook-documentation): `if (!isFile(hooksPath)) return []` - checks/hook-documentation.mjs.
  if (!existsSync(path.join(target, "hooks", "hooks.json"))) conditional.add("G1");
  // G6 (deprecation): library.json declares no component entry, so there is no entry to read a `status` from.
  if (!targetHasComponentEntries(target)) conditional.add("G6");
  return conditional;
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
// ADR 0063 sec 1 / sec 6: evaluate.mjs had no --help at all before this, so `agent-skills-toolkit
// evaluate --help` (the bin dispatches "evaluate"'s own flags straight through, bin/agent-skills-
// toolkit.mjs) silently fell through runCli()'s own argv parsing: "--help" matches no known flag, so
// `rawTarget` stayed undefined and the CLI graded `process.cwd()` instead of printing anything - the
// gap this text exists to close. The sentence distinguishing --no-advisory from --advisory <file.json>
// is required by ADR 0063's Implementation sites ("the CLI... help says that --no-advisory and
// --advisory <file.json> are unrelated"): the two flags share a word and nothing else - one is this
// file's OWN switch for the deterministic ADV1-ADV4 layer, the other supplies an LLM's review/behavioral
// block, and both can appear on one command line.
function helpText() {
  return `scripts/evaluate.mjs - the structured evaluator behind askit-evaluate

Usage:
  node scripts/evaluate.mjs [path] [flags]

[path] defaults to the current directory.

Flags:
  --mode <local|published-verdict>   verdict mode (ADR 0044); default local
  --profile <name>                   named severity profile (askit-library, plain-plugin, house-style)
  --report <conformance|migration|release|review|behavioral>   which report object to build; default conformance
  --target-tier <universal|convergent|advanced>   for --report=migration; default advanced
  --format <text|json|md|html>       output format (--json is an alias for --format=json); default text
  --out <file>                       write the rendered output to a file instead of stdout
  --members <dir>                    (repeatable) a local checkout root to search for marketplace members
  --no-advisory                      turn off the ADR 0063 deterministic ADV1-ADV4 advisory layer
  --advisory <file.json>             supply the LLM-produced review/behavioral block for --report=review|behavioral
  --help, -h                         show this help

--no-advisory and --advisory <file.json> are UNRELATED flags that happen to share a word. --no-advisory
turns off this file's own deterministic advisory layer (ADV1-ADV4, computed by this process, never a
model); --advisory <file.json> supplies a SEPARATE, model-produced review or behavioral block for
--report=review or --report=behavioral. Both may appear on the same command line at once.`;
}

// Run the CLI as an async function (not a top-level await), so evaluate.mjs finishes evaluating before the
// lazily-imported migrate-report / release-report modules import it back (avoids a cyclic top-level-await deadlock).
async function runCli() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(helpText());
    return;
  }
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
  // ADR 0063 sec 1: this file's OWN flag for the deterministic ADV1-ADV4 layer - see helpText() above
  // for why it is unrelated to --advisory <file.json>.
  const noAdvisory = argv.includes("--no-advisory");
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
  if (report === "migration") r = (await import("./lib/migrate-report.mjs")).migrateReport(target, { mode, targetTier, profile, noAdvisory });
  else if (report === "release") r = (await import("./lib/release-report.mjs")).releaseReport(target, { mode, profile, noAdvisory });
  else if (report === "review" || report === "behavioral") {
    if (!advisory) {
      console.error(`--report=${report} requires --advisory <file.json> carrying the advisory ${report} block (it comes from an LLM layer, not the deterministic gate)`);
      process.exit(2);
    }
    r = applyAdvisory(evaluate(target, { mode, profile, searchRoots, noAdvisory }), report, JSON.parse(readFileSync(advisory, "utf8")));
  } else r = evaluate(target, { mode, profile, searchRoots, noAdvisory });
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
    // F-011, and the SAME rule check.mjs applies, because two CLIs disagreeing about one directory is
    // the defect. An operator finding carries a null reqId, which tierForReq buckets as `universal`, so
    // a trailing comma in askit.config.json gated above as though it were a Universal conformance
    // failure. Once computeTierReport stopped counting it toward the tier, that produced the
    // contradiction outright: `Tier: universal` printed beside exit 1, with no universal conformance
    // error in the list to justify it (measured on a clone of golden/minimal-skill).
    //
    // The correction is this ONE line and deliberately not also a filter on `forGate` above. A filter
    // there would be unreachable: it can only ever remove an error-severity operator finding, and
    // whenever one of those exists this line overrides the result anyway, so no input reaches the gate
    // differently because of it. An unreachable guard is a false claim about what is protecting you -
    // it cannot be shown failing, so it is not written.
    //
    // Exit 2, not 0: excluding the finding from the GRADE must not make a broken rubric read green,
    // which would be a clean verdict computed against a rubric nobody selected.
    if (r.findings.some((f) => isOperatorFinding(f) && effSev(f) === "error" && !f.suppressed)) exitCode = 2;
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
  // Set as process.exitCode rather than process.exit(): a pipe is written asynchronously on POSIX, and exiting
  // right after console.log(output) cut a large report at one pipe buffer (65536 bytes) whenever stdout was
  // piped. runCli() is the last thing this module does, so the process ends on its own once stdout has
  // drained (tests/unit/cli-stdout-drain.test.mjs covers the same defect for both CLIs).
  process.exitCode = exitCode;
}

if (process.argv[1]?.endsWith("evaluate.mjs")) runCli();
