// what-it-is:   the command-contract check (S7)
// what-it-does: asserts each command declares its contract and maps to exactly one skill for every declared target
// why:          enforces the Standard requirement S7 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "command-contract", tier: "convergent", reqId: "S7" };

export function check(ctx) {
  const commands = ctx.commands || [];
  if (commands.length === 0) return []; // conditional: only fires when commands exist (Standard sec 3.2)
  const out = [];
  const skillNames = new Set((ctx.skills || []).map((s) => s.name));
  const workflowNames = new Set((ctx.workflows || []).map((w) => w.name)); // ctx.workflows arrives in a later phase
  const known = new Set([...skillNames, ...workflowNames]);
  for (const c of commands) {
    const file = `commands/${c.name}.md`;
    if (c.parseError) {
      out.push(finding(meta.id, SEVERITY.ERROR, `command frontmatter does not parse: ${c.parseError}`, { file, reqId: meta.reqId }));
      continue;
    }
    const fm = c.frontmatter || {};
    if (typeof fm.description !== "string" || fm.description.length === 0) {
      out.push(finding(meta.id, SEVERITY.ERROR, `commands/${c.name}.md is missing a non-empty "description" (Standard sec 3.2, 8.1).`, { file, reqId: meta.reqId }));
    }
    const mapsTo = fm["maps-to"];
    if (typeof mapsTo !== "string" || mapsTo.length === 0) {
      out.push(finding(meta.id, SEVERITY.ERROR, `commands/${c.name}.md must declare "maps-to" naming exactly one skill or workflow (Standard sec 3.2).`, { file, reqId: meta.reqId }));
    } else if (!known.has(mapsTo)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `commands/${c.name}.md maps-to "${mapsTo}" but no skill or workflow by that name exists on disk (Standard sec 3.2).`, { file, reqId: meta.reqId }));
    }
  }
  return out;
}
