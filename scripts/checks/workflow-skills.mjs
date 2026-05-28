import { finding, SEVERITY } from "../lib/findings.mjs";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../lib/frontmatter.mjs";

export const meta = { id: "workflow-skills", tier: "convergent", reqId: "S5" };

export function check(ctx) {
  const out = [];
  const workflowsDir = path.join(ctx.root, "_workflows");
  if (!existsSync(workflowsDir) || !statSync(workflowsDir).isDirectory()) return [];

  const known = new Set((ctx.skills || []).map((s) => s.name));
  for (const entry of readdirSync(workflowsDir)) {
    const full = path.join(workflowsDir, entry);
    if (!entry.endsWith(".md") || !statSync(full).isFile()) continue;
    const { frontmatter } = parseFrontmatter(readFileSync(full, "utf8"));
    const steps = frontmatter?.steps;
    if (!Array.isArray(steps)) continue;
    for (const step of steps) {
      const skillName = typeof step === "string" ? step : step?.skill;
      if (typeof skillName === "string" && !known.has(skillName)) {
        out.push(finding(meta.id, SEVERITY.ERROR, `workflow "${entry}" references skill "${skillName}" which does not exist on disk (Standard sec 3.4).`, { file: `_workflows/${entry}`, reqId: meta.reqId }));
      }
    }
  }
  return out;
}
