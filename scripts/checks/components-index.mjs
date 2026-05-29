import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "components-index", tier: "convergent", reqId: "S3" };

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return [];
  const out = [];
  const components = lib.components;
  if (components === undefined) {
    out.push(finding(meta.id, SEVERITY.ERROR, "library.json is missing \"components\" index (REQUIRED at Convergent+; Standard sec 5.1).", { file: "library.json", reqId: meta.reqId }));
    return out;
  }
  if (typeof components !== "object" || components === null || Array.isArray(components)) {
    out.push(finding(meta.id, SEVERITY.ERROR, "library.json \"components\" must be an object keyed by component type (e.g. { \"skills\": [...] }).", { file: "library.json", reqId: meta.reqId }));
    return out;
  }
  const declaredSkills = Array.isArray(components.skills) ? components.skills : [];
  const onDiskSkillNames = new Set((ctx.skills || []).map((s) => s.name));
  const declaredSkillNames = new Set();
  for (const c of declaredSkills) {
    if (!c || typeof c.name !== "string") {
      out.push(finding(meta.id, SEVERITY.ERROR, "library.json components.skills entry is missing required string \"name\".", { file: "library.json", reqId: meta.reqId }));
      continue;
    }
    declaredSkillNames.add(c.name);
    if (!onDiskSkillNames.has(c.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.skills declares "${c.name}" but it is not on disk under skills/.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  for (const s of (ctx.skills || [])) {
    if (!declaredSkillNames.has(s.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `skills/${s.name} exists on disk but is not declared in library.json components.skills.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  const declaredSubagents = Array.isArray(components.subagents) ? components.subagents : [];
  const onDiskSubagentNames = new Set((ctx.subagents || []).map((s) => s.name));
  const declaredSubagentNames = new Set();
  for (const c of declaredSubagents) {
    if (!c || typeof c.name !== "string") {
      out.push(finding(meta.id, SEVERITY.ERROR, "library.json components.subagents entry is missing required string \"name\".", { file: "library.json", reqId: meta.reqId }));
      continue;
    }
    declaredSubagentNames.add(c.name);
    if (!onDiskSubagentNames.has(c.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.subagents declares "${c.name}" but it is not on disk under agents/.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  for (const s of (ctx.subagents || [])) {
    if (!declaredSubagentNames.has(s.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `agents/${s.name}.md exists on disk but is not declared in library.json components.subagents.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  return out;
}
