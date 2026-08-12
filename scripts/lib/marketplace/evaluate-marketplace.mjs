// what-it-is:   the marketplace scope orchestrator (ADR 0039), the third branch of evaluate()
// what-it-does: grades every locally-resolvable member of a .claude-plugin/marketplace.json catalogue at
//               ITS OWN declared tier and ITS OWN Standard pin, runs the cross-member analyses, and
//               aggregates the result as self-consistency worst-member into one collection report object
// why:          a catalogue is graded by hand today, one member at a time, so a collection can read
//               healthy while it is undeliverable. The verdict here is a pure function of per-member
//               verdicts the gate already computes plus deterministic comparisons over data the resolve
//               step already loaded - no new per-member semantics, no model, no network
// used-by:      scripts/evaluate.mjs (the marketplace branch); scripts/lib/report-render.mjs renders it
import path from "node:path";
import { existsSync, statSync } from "node:fs";
import { loadPlugin } from "../load-plugin.mjs";
import { listCommandFiles } from "../fs-utils.mjs";
import { runGate } from "../../check.mjs";
import { computeTierReport } from "../../tier-report.mjs";
import { finding, SEVERITY } from "../findings.mjs";
import { readMarketplaceManifest, looksLikeMarketplaceOfSkills, MANIFEST_REL } from "./manifest.mjs";
import { resolveMembers, loadMemberMap, MEMBER_MAP_FILENAME } from "./resolve.mjs";
import {
  MARKETPLACE_CHECKS,
  duplicateCatalogueNames,
  renameCollisions,
  versionAgreement,
  skillCollisions,
  commandCollisions,
  agentRestrictedFields,
  triggerSurfaceOverlap,
  commandSkillDivergence,
  contentLineage,
} from "./analyze.mjs";

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();

/**
 * True iff the target ships plugin components of its OWN, or carries the manifest that makes a
 * directory a plugin. Deliberately NOT `looksLikePlugin`, which also accepts a bare `AGENTS.md`: a
 * catalogue legitimately carries agent guidance for the people maintaining it, and the family
 * marketplace does exactly that. The question here is narrower and is the one Standard sec 12 asks -
 * does this directory ship components, or does it only list other things that do?
 */
function shipsOwnComponents(target) {
  return (
    existsSync(path.join(target, "library.json")) ||
    isDir(path.join(target, "skills")) ||
    isDir(path.join(target, "agents")) ||
    isDir(path.join(target, "commands"))
  );
}

/**
 * True iff `target` is the marketplace-OF-PLUGINS shape this scope grades. Three conditions, and the
 * third exists because a real family member broke the first two.
 *
 * 1. It carries a parseable catalogue with a `plugins` array.
 * 2. NO entry's source resolves under `skills/`. This is what keeps this scope and `U13` disjoint:
 *    `resolveRegistrationSource` claims a marketplace.json exactly when at least one source resolves
 *    under `skills/`, and this declines in exactly that case. One rule, expressed once (see
 *    looksLikeMarketplaceOfSkills), so the two can never both claim one manifest.
 * 3. **The target does not ship components of its own.** Standard sec 12 states the separation rule -
 *    a marketplace catalogues plugins and is not itself a plugin - and names the embedded marketplace
 *    as an anti-pattern. `pm-skills` is a live instance: it ships `skills/`, `agents/` and `commands/`
 *    AND carries a `.claude-plugin/marketplace.json` whose single entry is a url pointing back at
 *    itself. Without this condition, `evaluate()` would route that plugin to marketplace scope and
 *    grade it as a one-member catalogue of itself, silently MOVING an existing plugin's verdict - the
 *    one thing this release's governing invariant forbids. A plugin committing the anti-pattern keeps
 *    plugin scope, which is correct: the plugin gate is what should tell it so.
 *
 * A malformed or absent manifest is not this scope's target either - a directory with unreadable JSON
 * is graded as whatever it otherwise is, and the JSON problem surfaces there.
 */
export function detectMarketplaceScope(target) {
  const m = readMarketplaceManifest(target);
  if (!m.present || m.data == null) return false;
  if (!Array.isArray(m.data.plugins)) return false;
  if (looksLikeMarketplaceOfSkills(m.data)) return false;
  return !shipsOwnComponents(target);
}

/** The default place to look for member checkouts: the directory the catalogue itself sits in. */
export function defaultSearchRoots(root) {
  return [path.dirname(path.resolve(root))];
}

const mkFinding = (check, severity, message, file) => finding(check, severity, message, { file: file ?? null, reqId: null });

/**
 * Grade one resolved member exactly as it would be graded alone: `runGate` reads that member's own
 * `library.json` tier and `standard` pin, and `loadConfig` runs rooted at that member's own directory,
 * which is ADR 0034's invariant ("a flag that is validated must be honored in every scope") extended to
 * a third scope. Nothing here re-decides anything the gate already decided.
 *
 * A member whose grading THROWS is reported as a member-level error rather than taking the whole run
 * down: one unreadable member must not cost the operator the other five verdicts.
 */
function gradeMember(resolution, opts) {
  try {
    const ctx = loadPlugin(resolution.dir);
    const gate = runGate(resolution.dir, ctx, { mode: opts.mode, profile: opts.profile });
    const tierReport = computeTierReport(resolution.dir, ctx, gate.findings);
    const live = gate.findings.filter((f) => !f.suppressed);
    return {
      library: ctx.library?.data ?? null,
      declaredTier: ctx.library?.data?.tier ?? null,
      earnedTier: tierReport.tier,
      standardPin: ctx.library?.data?.standard ?? null,
      errors: gate.errorCount,
      warns: gate.warnCount,
      // Standard debt: findings that are warnings ONLY because they postdate this member's pin. ADR 0039
      // requires it per member, because it is what makes "green by an old pin" visible rather than
      // flattering - the collection-level analogue of the trust calibration ADR 0036 shipped.
      standardDebt: live.filter((f) => f.downgraded).length,
      exitCode: gate.exitCode,
      // A member FAILS ITS OWN CLAIM iff its own gate would fail. That is the whole of question 2's
      // aggregation rule: no collection-level tier expectation is invented for anyone (which is the
      // uniform-worst-member option ADR 0038 forbids), and nothing is thresholded.
      failsOwnClaim: gate.exitCode !== 0,
      skills: ctx.skills,
      subagents: ctx.subagents,
      skillNames: ctx.skills.map((s) => path.basename(s.dir)),
      commandNames: listCommandFiles(resolution.dir).map((f) => path.basename(f, ".md")),
      gradingError: null,
    };
  } catch (e) {
    return {
      library: null, declaredTier: null, earnedTier: null, standardPin: null,
      errors: 0, warns: 0, standardDebt: 0, exitCode: 0, failsOwnClaim: false,
      skills: [], subagents: [], skillNames: [], commandNames: [],
      gradingError: e?.message ?? String(e),
    };
  }
}

/**
 * Evaluate a marketplace catalogue. Synchronous and pure of network, matching the gate's standing
 * contract; the only I/O is reading files that are already on this disk.
 *
 * @param {string} target the catalogue root (the directory holding .claude-plugin/marketplace.json)
 * @param {{mode?: string, profile?: string, searchRoots?: string[]}} opts
 * @returns {object} the collection report object
 */
export function evaluateMarketplace(target, opts = {}) {
  const root = path.resolve(target);
  const manifest = readMarketplaceManifest(root);
  const { map, problems: mapProblems } = loadMemberMap(root);
  const searchRoots = opts.searchRoots?.length ? opts.searchRoots.map((d) => path.resolve(d)) : defaultSearchRoots(root);

  const findings = [];
  for (const p of [...manifest.problems, ...mapProblems]) {
    findings.push(mkFinding(MARKETPLACE_CHECKS.MANIFEST, p.severity === "error" ? SEVERITY.ERROR : SEVERITY.WARN, p.message, MANIFEST_REL));
  }

  const resolutions = resolveMembers(manifest.entries, { root, searchRoots, map });
  const members = resolutions.map((r) => {
    const base = {
      name: r.entry.name,
      index: r.entry.index,
      status: r.status,
      dir: r.dir,
      relDir: r.dir ? path.relative(root, r.dir).split(path.sep).join("/") : null,
      reason: r.reason,
      sourceKind: r.entry.source.kind,
      // The pin columns are UNCONDITIONAL, present even when they agree. A report that shows them only
      // on disagreement teaches a reader to assume agreement from silence, which is the failure ADR 0038
      // corrected at plugin scale (ADR 0039, question 1).
      pinSha: r.entry.pinSha,
      entryVersion: r.entry.declaredVersion,
      gradedSha: r.gradedSha,
      renames: r.entry.renames,
      entry: r.entry,
    };
    if (r.status !== "resolved") {
      return { ...base, library: null, declaredTier: null, earnedTier: null, standardPin: null, errors: 0, warns: 0, standardDebt: 0, exitCode: 0, failsOwnClaim: false, skills: [], subagents: [], skillNames: [], commandNames: [], gradingError: null, diverged: false };
    }
    const graded = { ...base, ...gradeMember(r, opts) };
    return { ...graded, diverged: Boolean(graded.pinSha && graded.gradedSha && graded.pinSha !== graded.gradedSha) };
  });

  for (const m of members) {
    if (m.status === "unresolvable") {
      // Question 2, ratified: an entry the run cannot resolve is UNDELIVERABLE, and warning would let a
      // catalogue with a dead entry exit zero while every member that did resolve grades green.
      findings.push(mkFinding(
        MARKETPLACE_CHECKS.RESOLVABILITY, SEVERITY.ERROR,
        `catalogue entry ${m.name ? `"${m.name}"` : `plugins[${m.index}]`} does not resolve to a member: ${m.reason}`,
        MANIFEST_REL,
      ));
    }
    if (m.gradingError) {
      findings.push(mkFinding(
        MARKETPLACE_CHECKS.RESOLVABILITY, SEVERITY.ERROR,
        `member "${m.name}" resolved to ${m.relDir} but could not be graded: ${m.gradingError}`,
        MANIFEST_REL,
      ));
    }
  }

  findings.push(
    ...duplicateCatalogueNames(manifest.entries),
    ...renameCollisions(manifest.entries),
    ...versionAgreement(members),
    ...skillCollisions(members),
    ...commandCollisions(members),
    ...agentRestrictedFields(members),
  );

  const graded = members.filter((m) => m.status === "resolved" && !m.gradingError);
  const notGraded = members.filter((m) => m.status === "not-graded");
  const unresolvable = members.filter((m) => m.status === "unresolvable");
  const failingMembers = graded.filter((m) => m.failsOwnClaim);
  const collectionErrors = findings.filter((f) => f.severity === SEVERITY.ERROR).length;
  const collectionWarns = findings.filter((f) => f.severity === SEVERITY.WARN).length;

  // Self-consistency worst-member: red if any collection-level error exists OR any graded member fails
  // its OWN claim. Deliberately not a threshold and deliberately not a uniform tier demand.
  //
  // THIRD state, added after pre-release adversarial review: a catalogue with entries but ZERO graded
  // members is "unknown", never green. ADR 0039 settled that a member absent from this machine does not
  // red - a maintainer with three of five cloned has a working catalogue and an incomplete workstation.
  // That reasoning is about PARTIAL coverage and does not extend to none: a catalogue whose every entry
  // points at a repository that no longer exists would otherwise report GREEN at coverage 0 of N, which
  // is a pass asserted from no evidence at all. This is not a reversal of question 2 (an absent member
  // still does not red); it is the observation that a verdict computed over an empty set is not a
  // verdict. Recorded here as a derived decision, in the same spirit as ADR 0039's own derived split
  // between an unresolvable entry and an absent member.
  // Precedence: RED outranks UNKNOWN. "Unknown" means the absence of evidence, and a collection error
  // (a broken entry, a malformed manifest, a name collision) IS evidence - a catalogue with a dead entry
  // and no local checkouts is definitely broken, not merely unmeasured, and saying "unknown" there would
  // withhold a diagnosis the run actually made. Both exit 1, so this is about telling the truth in the
  // label rather than about the gate.
  const noEvidence = manifest.entries.length > 0 && graded.length === 0;
  const verdict = collectionErrors > 0 || failingMembers.length > 0 ? "red" : noEvidence ? "unknown" : "green";

  const tierDistribution = {};
  for (const m of graded) {
    const key = m.earnedTier ?? "none";
    tierDistribution[key] = (tierDistribution[key] ?? 0) + 1;
  }

  return {
    scope: "marketplace",
    target: root,
    catalogue: {
      name: manifest.data?.name ?? null,
      version: manifest.data?.metadata?.version ?? null,
      owner: manifest.data?.owner?.name ?? null,
      entryCount: manifest.entries.length,
    },
    verdict,
    // Coverage is UNCONDITIONAL on the verdict line for the same reason the pin columns are: a report
    // that mentions coverage only when it is partial teaches a reader to assume completeness from
    // silence (ADR 0039, question 2's derived decision).
    coverage: {
      graded: graded.length,
      total: manifest.entries.length,
      notGraded: notGraded.length,
      unresolvable: unresolvable.length,
    },
    members,
    findings,
    summary: {
      errors: collectionErrors,
      warns: collectionWarns,
      failingMembers: failingMembers.map((m) => m.name),
      tierDistribution,
    },
    searchRoots,
    profile: opts.profile,
    mode: opts.mode,
    // Namespaced, and never merged into `findings`: an advisory can never move the collection verdict
    // or the exit code (ADR 0039).
    advisory: {
      triggerSurface: triggerSurfaceOverlap(members),
      commandSkillDivergence: commandSkillDivergence(members),
      contentLineage: contentLineage(members),
    },
  };
}

/**
 * The collection exit code follows the collection verdict (ADR 0039, question 2). Only "green" exits 0:
 * "unknown" (a catalogue with entries and zero graded members) is not a pass, because a run that saw no
 * evidence has not established anything. Failing there is the conservative direction - the cost is an
 * operator being told to clone something or supply a mapping, against the alternative of a dead
 * catalogue exiting 0 in someone's CI.
 */
export function marketplaceExitCode(report) {
  return report.verdict === "green" ? 0 : 1;
}

/** Terminal rendering. The designed Markdown/HTML forms live in scripts/lib/report-render.mjs. */
export function formatMarketplaceReport(r) {
  const lines = [];
  lines.push(`Evaluating (marketplace): ${r.target}`);
  lines.push(`Catalogue: ${r.catalogue.name ?? "(unnamed)"}${r.catalogue.version ? ` v${r.catalogue.version}` : ""}, ${r.catalogue.entryCount} entr${r.catalogue.entryCount === 1 ? "y" : "ies"}`);
  lines.push("");
  for (const m of r.members) {
    const label = m.name ?? `plugins[${m.index}]`;
    if (m.status !== "resolved") {
      lines.push(`  [${m.status}] ${label} (${m.sourceKind ?? "unknown source"}): ${m.reason}`);
      continue;
    }
    const claim = m.declaredTier ? `declares ${m.declaredTier}, earns ${m.earnedTier}` : `undeclared, earns ${m.earnedTier}`;
    lines.push(
      `  [${m.failsOwnClaim ? "FAILS OWN CLAIM" : "ok"}] ${label}: ${claim}; ${m.errors} error(s), ${m.warns} warning(s), Standard debt ${m.standardDebt}` +
      ` | pin ${short(m.pinSha)} entry ${m.entryVersion ?? "-"} graded ${short(m.gradedSha)}${m.diverged ? " DIVERGED" : ""}`
    );
  }
  if (r.findings.length) {
    lines.push("");
    lines.push("  Collection findings (cross-member; no member's own gate reports these):");
    for (const f of r.findings) lines.push(`    [${f.severity}] ${f.check}: ${f.message}`);
  }
  lines.push("");
  if (r.verdict === "unknown") {
    lines.push("Collection verdict: UNKNOWN - this catalogue lists members but NONE of them could be graded, so there is no");
    lines.push("evidence to pass or fail on. This is not a green. Clone the members, pass --members <dir>, or map them in");
    lines.push(`${MEMBER_MAP_FILENAME} at the catalogue root. If every entry is genuinely unreachable, the catalogue is undeliverable.`);
  }
  lines.push(`Collection verdict: ${r.verdict.toUpperCase()} - graded ${r.coverage.graded} of ${r.coverage.total} member(s)` +
    `${r.coverage.notGraded ? `, ${r.coverage.notGraded} not graded (absent locally or remote-only source)` : ""}` +
    `${r.coverage.unresolvable ? `, ${r.coverage.unresolvable} unresolvable entr${r.coverage.unresolvable === 1 ? "y" : "ies"}` : ""}.`);
  lines.push(`${r.summary.errors} collection error(s), ${r.summary.warns} collection warning(s).`);
  if (r.summary.failingMembers.length) {
    lines.push(`Members failing their own declared claim: ${r.summary.failingMembers.join(", ")}`);
  }
  return lines.join("\n");
}

const short = (sha) => (typeof sha === "string" && sha.length >= 7 ? sha.slice(0, 7) : "-");
