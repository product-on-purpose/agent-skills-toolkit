// what-it-is:   the check registry
// what-it-does: imports every check module and exposes the ordered CHECKS array plus runAllChecks(ctx)
// why:          one ordered registry is the single place a check is turned on, keeping the spine explicit and tier-grouped
// used-by:      imported by scripts/check.mjs, tier-report.mjs, and the registry-sync test
import * as libraryJson from "../checks/library-json.mjs";
import * as anatomy from "../checks/anatomy.mjs";
import * as frontmatterValid from "../checks/frontmatter-valid.mjs";
import * as nameMatchesDir from "../checks/name-matches-dir.mjs";
import * as descriptionScore from "../checks/description-score.mjs";
import * as referenceLinks from "../checks/reference-links.mjs";
import * as instructionBudget from "../checks/instruction-budget.mjs";
import * as manifestDrift from "../checks/manifest-drift.mjs";
import * as agentTargets from "../checks/agent-targets.mjs";
import * as prefix from "../checks/prefix.mjs";
import * as componentsIndex from "../checks/components-index.mjs";
import * as chainContract from "../checks/chain-contract.mjs";
import * as commandContract from "../checks/command-contract.mjs";
import * as workflowSkills from "../checks/workflow-skills.mjs";
import * as perTargetPresence from "../checks/per-target-presence.mjs";
import * as versionMatch from "../checks/version-match.mjs";
import * as mermaidValid from "../checks/mermaid-valid.mjs";
import * as mcpValid from "../checks/mcp-valid.mjs";
import * as libraryRegression from "../checks/library-regression.mjs";
import * as deprecation from "../checks/deprecation.mjs";
import * as componentsMirror from "../checks/components-mirror.mjs";
import * as hookDocumentation from "../checks/hook-documentation.mjs";
import * as selfHosting from "../checks/self-hosting.mjs";
import * as releaseNotes from "../checks/release-notes.mjs";
import * as indexDrift from "../checks/index-drift.mjs";
import * as docsFrontmatter from "../checks/docs-frontmatter.mjs";
import * as folderReadme from "../checks/folder-readme.mjs";
import * as sourceDoc from "../checks/source-doc.mjs";
import * as docsPresence from "../checks/docs-presence.mjs";

/** Ordered checks. Each exports { meta:{id,tier,reqId}, check(ctx)->Finding[] }. */
export const CHECKS = [
  libraryJson, anatomy, frontmatterValid, nameMatchesDir,
  descriptionScore, referenceLinks, instructionBudget, manifestDrift,
  agentTargets, prefix, componentsIndex, componentsMirror, chainContract, commandContract, workflowSkills,
  perTargetPresence,
  versionMatch, mermaidValid, mcpValid,
  libraryRegression, deprecation,
  hookDocumentation, selfHosting, releaseNotes, indexDrift, docsFrontmatter, folderReadme, sourceDoc, docsPresence,
];

export function runAllChecks(ctx) {
  return CHECKS.flatMap((m) => m.check(ctx));
}

/** The set of every registered reqId, so the config loader (F3) validates rule keys against the real spine. */
export const REQ_IDS = new Set(CHECKS.map((m) => m.meta.reqId).filter((r) => r != null));

/**
 * reqId -> provenance, built from each registered check's meta (F3). A check that forgets `provenance`
 * defaults to "objective" (the strictest, never-waivable class), so the omission fails safe; the
 * registry-sync provenance-coverage test makes a missing tag fail CI rather than silently default.
 * @returns {Map<string, "objective"|"vendor-cited"|"house">}
 */
export function provenanceByReq() {
  return new Map(CHECKS.filter((m) => m.meta.reqId != null).map((m) => [m.meta.reqId, m.meta.provenance ?? "objective"]));
}
