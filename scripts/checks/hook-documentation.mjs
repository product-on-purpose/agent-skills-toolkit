import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const meta = { id: "hook-documentation", tier: "advanced", reqId: "G1" };

// Events whose hooks match against a target (a tool name); a matcher documents WHEN the hook fires.
// Restricted to the tool-loop events, the only ones that meaningfully scope to a tool name
// (Stop/SessionStart/UserPromptSubmit ignore the matcher; PreCompact's manual|auto is optional).
const MATCHER_EVENTS = new Set(["PreToolUse", "PostToolUse"]);
const HOOK_TYPES = new Set(["command", "http", "mcp_tool", "prompt", "agent"]);

function isFile(p) { return existsSync(p) && statSync(p).isFile(); }

/**
 * G1 (Gold): every hook present documents what it is and when it fires. Conditional on
 * hooks/hooks.json existing. For each hook entry this enforces the machine-checkable core: a
 * `type` (from the allowed set) per action, and a `matcher` for the tool-matched events. The
 * fuller scope/failure narrative lives in the hook component's docs. Standard sec 2.6 G1, sec 3.5.
 * Advanced tier.
 */
export function check(ctx) {
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
        }
      }
    }
  }
  return out;
}
