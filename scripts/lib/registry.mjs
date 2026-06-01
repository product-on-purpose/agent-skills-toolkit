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
import * as noDashes from "../checks/no-dashes.mjs";
import * as mcpValid from "../checks/mcp-valid.mjs";
import * as libraryRegression from "../checks/library-regression.mjs";
import * as deprecation from "../checks/deprecation.mjs";
import * as componentsMirror from "../checks/components-mirror.mjs";
import * as hookDocumentation from "../checks/hook-documentation.mjs";
import * as selfHosting from "../checks/self-hosting.mjs";
import * as releaseNotes from "../checks/release-notes.mjs";
import * as indexDrift from "../checks/index-drift.mjs";

/** Ordered checks. Each exports { meta:{id,tier,reqId}, check(ctx)->Finding[] }. */
export const CHECKS = [
  libraryJson, anatomy, frontmatterValid, nameMatchesDir,
  descriptionScore, referenceLinks, instructionBudget, manifestDrift,
  agentTargets, prefix, componentsIndex, componentsMirror, chainContract, commandContract, workflowSkills,
  perTargetPresence,
  versionMatch, noDashes, mcpValid,
  libraryRegression, deprecation,
  hookDocumentation, selfHosting, releaseNotes, indexDrift,
];

export function runAllChecks(ctx) {
  return CHECKS.flatMap((m) => m.check(ctx));
}
