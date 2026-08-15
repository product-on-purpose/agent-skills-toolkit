// what-it-is:   U15 - every .md under agents/ must be a registered subagent (ADR 0046)
// what-it-does: reports each file the RUNTIME loads from agents/ that the plugin does not register, with a
//               remediation branched on whether it is a folder README or an underscore-prefixed file
// why:          Claude Code registers EVERY .md it finds under agents/, so a file the plugin excludes from
//               registration still becomes a live subagent. Four Silver checks read the registration list and
//               therefore never examined those files, and widening those four was measured to produce
//               remediation that tells the author to CREATE the phantom subagent it should prevent. Making the
//               two lists provably equal closes the gap at its source instead of chasing it through consumers
// used-by:      scripts/lib/registry.mjs (the CHECKS array); covered by tests/unit/agents-dir-registerable.test.mjs
import path from "node:path";
import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

/**
 * `since: "0.14"` and NO `migration` metadata, which is correct only under ADR 0044's reordering: `since`
 * alone governs an INTRODUCTION, and it is sufficient because the Standard ceiling runs AFTER configuration
 * resolves, so a consumer's own `rules.U15 = "error"` cannot beat it at an earlier pin.
 *
 * `vendor-cited`, not `house`. The requirement rests on Claude Code's discovery behaviour, evidenced by the
 * probe recorded in folder-readme.mjs: a directory holding real-agent.md, README.md, _README.md and
 * README.txt registered THREE subagents - "real-agent", "README" and "_README". The underscore prefix
 * protects nothing; only the non-.md extension was skipped. Under ADR 0044's trust step a subject-owned
 * setting therefore cannot weaken this in published-verdict mode, which is right for a fact about a runtime
 * rather than a convention of ours.
 */
export const meta = {
  id: "agents-dir-registerable",
  tier: "universal",
  reqId: "U15",
  since: "0.14",
  provenance: "vendor-cited",
};

const RUNTIME_RULE =
  "Claude Code scans agents/ for *.md and registers every file it finds, so this is loaded as a subagent";

/**
 * U15 (Standard sec 3.3): every `.md` under `agents/` MUST be a registered subagent. Formally,
 * `ctx.agentDocs` and `ctx.subagents` must contain the same names.
 *
 * The remediation is SHAPE-SPECIFIC, and neither branch tells the author to register a folder guide. That
 * distinction is the whole decision: widening S2/S3/S4/S8 to read the runtime list was prototyped, and
 * against agents/README.md it emits `subagent "README" must start with the plugin prefix` and
 * `agents/README.md exists on disk but is not declared in components.subagents`. An author following either
 * one produces a phantom subagent with no name and no description - the exact defect the 2026-08-06 G8
 * exemption exists to stop plugins creating. A check whose remediation creates the defect is worse than the
 * silence it replaces.
 *
 * Both branches state the runtime fact, because an author who does not know the file is loaded cannot
 * evaluate either option.
 */
export function check(ctx) {
  const registered = new Set((ctx.subagents ?? []).map((s) => s.name));
  const out = [];
  for (const doc of ctx.agentDocs ?? []) {
    if (registered.has(doc.name)) continue;
    const rel = relPath(ctx.root, doc.file);
    const isFolderGuide = path.basename(doc.file) === "README.md";
    const why = isFolderGuide
      ? `${RUNTIME_RULE} named "README", with no name and no description.`
      : `${RUNTIME_RULE} named "${doc.name}" that the plugin never declared; the underscore prefix protects nothing.`;
    const fix = isFolderGuide
      ? "Move the folder documentation out of agents/ - AGENTS.md or the root README component table."
      : "Either register it (rename it to a prefixed subagent and declare it in library.json components.subagents) or move it out of agents/.";
    out.push(
      finding(meta.id, SEVERITY.ERROR, `${rel} is shipped under agents/ but is not a registered subagent. ${why} ${fix}`, {
        file: rel,
        reqId: meta.reqId,
      })
    );
  }
  return out;
}
