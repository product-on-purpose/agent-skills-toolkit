// what-it-is:   the hook-documentation check (G1)
// what-it-does: G1 (Gold): every hook present documents what it is and when it fires
// why:          enforces the Standard requirement G1 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  codexSkipsHandler,
  targetsCodex,
  CODEX_HANDLER_SENTENCE,
  CODEX_HANDLER_SOURCE,
} from "../lib/vendor-hook-handlers.mjs";

export const meta = { id: "hook-documentation", tier: "advanced", reqId: "G1", since: "0.x", provenance: "house" };

// Events whose hooks match against a target (a tool name); a matcher documents WHEN the hook fires.
// Restricted to the tool-loop events, the only ones that meaningfully scope to a tool name
// (Stop/SessionStart/UserPromptSubmit ignore the matcher; PreCompact's manual|auto is optional).
const MATCHER_EVENTS = new Set(["PreToolUse", "PostToolUse"]);
const HOOK_TYPES = new Set(["command", "http", "mcp_tool", "prompt", "agent"]);

// RS-C2, Standard 0.16. A TIGHTENING of an existing check, so it takes the cap ALONE and never a bump of
// meta.since: G1 has existed since 0.x, and raising its `since` to 0.16 would cap every OTHER G1 finding
// for any plugin pinned below 0.16 - undocumented hooks would stop being errors, which is the opposite of
// what this item wants. The finding-level `until` caps only this new shape.
//
// ACTIVATION-NEUTRAL wording, per the catalogue-manifest-shape precedent: it says what the migration is
// ABOUT and never asserts that a cap is currently in force, because under --strict nothing binds and the
// finding is a live error while this static text is still visible in --json.
const CODEX_HANDLER_MIGRATION = Object.freeze({
  capAt: "warn",
  until: "0.17",
  reason: "the Codex handler-type support table is introduced at Standard 0.16 and gates at 0.17",
});

function isFile(p) { return existsSync(p) && statSync(p).isFile(); }

/**
 * G1 (Gold): every hook present documents what it is and when it fires. Conditional on
 * hooks/hooks.json existing. For each hook entry this enforces the machine-checkable core: a
 * `type` (from the allowed set) per action, and a `matcher` for the tool-matched events. The
 * fuller scope/failure narrative lives in the hook component's docs. Standard sec 2.6 G1, sec 3.5.
 * Advanced tier.
 */
export function check(ctx) {
  const shipsToCodex = targetsCodex(ctx);
  const hooksPath = path.join(ctx.root, "hooks", "hooks.json");
  if (!isFile(hooksPath)) return []; // no hooks -> nothing to document.
  let data;
  try {
    data = JSON.parse(readFileSync(hooksPath, "utf8"));
  } catch (e) {
    return [finding(meta.id, SEVERITY.ERROR, `hooks/hooks.json is not valid JSON: ${e.message}`, { file: "hooks/hooks.json", reqId: meta.reqId })];
  }
  // The "hooks" value MUST be an object keyed by event name (not an array, not a scalar).
  const hooks = data && typeof data.hooks === "object" && data.hooks !== null && !Array.isArray(data.hooks) ? data.hooks : null;
  if (!hooks) {
    return [finding(meta.id, SEVERITY.ERROR, "hooks/hooks.json must declare a \"hooks\" object keyed by event name (Standard sec 3.5).", { file: "hooks/hooks.json", reqId: meta.reqId })];
  }
  const out = [];
  for (const [event, entries] of Object.entries(hooks)) {
    if (!Array.isArray(entries)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `hooks/hooks.json event "${event}" must map to an array of hook entries (Standard sec 3.5).`, { file: "hooks/hooks.json", reqId: meta.reqId }));
      continue;
    }
    for (const entry of entries) {
      // A non-object entry (a bare string, null, an array) documents nothing - it cannot carry
      // the required matcher/type/actions - so it is itself a G1 violation, not a silent skip.
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `a hook entry under "${event}" must be an object documenting the hook (matcher, type, actions); a bare value documents nothing (Standard sec 2.6 G1, sec 3.5).`, { file: "hooks/hooks.json", reqId: meta.reqId }));
        continue;
      }
      if (MATCHER_EVENTS.has(event) && (typeof entry.matcher !== "string" || entry.matcher.length === 0)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `hook under "${event}" has no "matcher"; a ${event} hook MUST document which tools it fires on (Standard sec 2.6 G1, sec 3.5).`, { file: "hooks/hooks.json", reqId: meta.reqId }));
      }
      const leaves = Array.isArray(entry.hooks) ? entry.hooks : [];
      if (leaves.length === 0) {
        out.push(finding(meta.id, SEVERITY.ERROR, `hook entry under "${event}" declares no "hooks" actions (Standard sec 3.5).`, { file: "hooks/hooks.json", reqId: meta.reqId }));
      }
      for (const leaf of leaves) {
        if (!leaf || typeof leaf.type !== "string" || leaf.type.length === 0) {
          out.push(finding(meta.id, SEVERITY.ERROR, `a hook action under "${event}" has no "type"; every hook MUST document its type (command|http|mcp_tool|prompt|agent) (Standard sec 2.6 G1, sec 3.5).`, { file: "hooks/hooks.json", reqId: meta.reqId }));
        } else if (!HOOK_TYPES.has(leaf.type)) {
          out.push(finding(meta.id, SEVERITY.ERROR, `a hook action under "${event}" has an invalid "type" "${leaf.type}"; must be one of command, http, mcp_tool, prompt, agent (Standard sec 3.5).`, { file: "hooks/hooks.json", reqId: meta.reqId }));
        } else if (shipsToCodex && codexSkipsHandler(leaf.type)) {
          // A LEGAL type that does not RUN on one of the plugin's declared targets. Deliberately after
          // the invalid-type branch, so one malformed type is reported once as malformed rather than
          // twice - as malformed AND as unsupported.
          out.push(
            finding(
              meta.id,
              SEVERITY.ERROR,
              `hook action under "${event}" has type "${leaf.type}", which Codex parses and then SKIPS - ` +
                `this plugin targets Codex, so the hook silently never runs there (no error, no warning, ` +
                `no signal at all). The vendor states: "${CODEX_HANDLER_SENTENCE}" (${CODEX_HANDLER_SOURCE}, ` +
                `read 2026-09-04; pinned as claim cx-hook-handler-support). Use "command" or "mcp_tool" for ` +
                `behaviour Codex must execute, or drop "codex" from agent-targets if this hook is Claude-only.`,
              { file: "hooks/hooks.json", reqId: meta.reqId, migration: CODEX_HANDLER_MIGRATION }
            )
          );
        }
      }
    }
  }
  return out;
}
