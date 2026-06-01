import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const meta = { id: "hook-documentation", tier: "advanced", reqId: "G1" };

// Events whose hooks match against a target (a tool name); a matcher documents WHEN the hook fires.
const MATCHER_EVENTS = new Set(["PreToolUse", "PostToolUse"]);

function isFile(p) { return existsSync(p) && statSync(p).isFile(); }

/**
 * G1 (Gold): every hook present documents what it is and when it fires. Conditional on
 * hooks/hooks.json existing (a plugin with no hooks has nothing to document). For each hook
 * entry this checks the structural documentation the hooks.json format carries: a `type`, and a
 * `matcher` for the tool-matched events (PreToolUse/PostToolUse). The fuller scope/failure
 * narrative lives in the hook component's docs; this gate enforces the machine-checkable core.
 * Standard sec 2.6 G1, sec 3.5. Advanced tier.
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
  const hooks = data && typeof data.hooks === "object" && data.hooks !== null ? data.hooks : null;
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
      if (!entry || typeof entry !== "object") continue;
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
        }
      }
    }
  }
  return out;
}
