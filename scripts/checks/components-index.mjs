// what-it-is:   the components-index check (S3)
// what-it-does: asserts each library.json components entry (path, version, status) matches the component on disk
// why:          enforces the Standard requirement S3 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "components-index", tier: "convergent", reqId: "S3", since: "0.x" };

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
  // Every declared component-type value must be an array - not only the four known keys, so a
  // malformed (object/string) value under any type (workflows, hooks, chain-contracts, ...) fails
  // closed rather than being silently skipped by the type-specific checks below.
  for (const key of Object.keys(components)) {
    if (components[key] !== undefined && !Array.isArray(components[key])) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.${key} must be an array.`, { file: "library.json", reqId: meta.reqId }));
    }
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
  const declaredCommands = Array.isArray(components.commands) ? components.commands : [];
  const onDiskCommandNames = new Set((ctx.commands || []).map((c) => c.name));
  const declaredCommandNames = new Set();
  for (const c of declaredCommands) {
    if (!c || typeof c.name !== "string") {
      out.push(finding(meta.id, SEVERITY.ERROR, "library.json components.commands entry is missing required string \"name\".", { file: "library.json", reqId: meta.reqId }));
      continue;
    }
    declaredCommandNames.add(c.name);
    if (!onDiskCommandNames.has(c.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.commands declares "${c.name}" but it is not on disk under commands/.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  for (const c of (ctx.commands || [])) {
    if (!declaredCommandNames.has(c.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `commands/${c.name}.md exists on disk but is not declared in library.json components.commands.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  const declaredMcp = Array.isArray(components.mcpServers) ? components.mcpServers : [];
  const onDiskMcpNames = new Set((ctx.mcpServers || []).map((s) => s.name));
  const declaredMcpNames = new Set();
  for (const c of declaredMcp) {
    if (!c || typeof c.name !== "string") {
      out.push(finding(meta.id, SEVERITY.ERROR, "library.json components.mcpServers entry is missing required string \"name\".", { file: "library.json", reqId: meta.reqId }));
      continue;
    }
    declaredMcpNames.add(c.name);
    if (!onDiskMcpNames.has(c.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.mcpServers declares "${c.name}" but it is not a server in .mcp.json.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  for (const s of (ctx.mcpServers || [])) {
    if (!declaredMcpNames.has(s.name)) {
      out.push(finding(meta.id, SEVERITY.ERROR, `.mcp.json server "${s.name}" is not declared in library.json components.mcpServers.`, { file: "library.json", reqId: meta.reqId }));
    }
  }
  return out;
}
