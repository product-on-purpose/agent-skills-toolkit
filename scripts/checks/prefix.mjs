import { finding, SEVERITY } from "../lib/findings.mjs";
import { relPath } from "../lib/fs-utils.mjs";

export const meta = { id: "prefix", tier: "convergent", reqId: "S2" };

const KEBAB_DASH = /^[a-z0-9]+(?:-[a-z0-9]+)*-$/;

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return [];
  const p = lib.prefix;
  if (p === undefined) {
    return [finding(meta.id, SEVERITY.ERROR, "library.json is missing \"prefix\" (REQUIRED at Convergent+; Standard sec 8.2).", { file: "library.json", reqId: meta.reqId })];
  }
  if (typeof p !== "string" || !KEBAB_DASH.test(p)) {
    return [finding(meta.id, SEVERITY.ERROR, `library.json "prefix" must be lowercase kebab-case ending in "-" (got ${JSON.stringify(p)}); Standard sec 8.2.`, { file: "library.json", reqId: meta.reqId })];
  }
  // Every component name carries the prefix (Standard sec 8.2), enforced for skills,
  // commands, and subagents. Subagents are included per ADR 0020: they enter a
  // cross-agent pool once Gemini emission lands, so they are prefixed now to avoid a
  // later rename.
  const out = [];
  const groups = [
    ["skill", ctx.skills, (c) => c.skillMdPath],
    ["command", ctx.commands, (c) => c.file],
    ["subagent", ctx.subagents, (c) => c.file],
  ];
  for (const [kind, list, fileOf] of groups) {
    for (const c of list ?? []) {
      const name = c?.name;
      if (typeof name === "string" && !name.startsWith(p)) {
        out.push(
          finding(
            meta.id,
            SEVERITY.ERROR,
            `${kind} "${name}" must start with the plugin prefix "${p}" (Standard sec 8.2).`,
            { file: relPath(ctx.root, fileOf(c)), reqId: meta.reqId }
          )
        );
      }
    }
  }
  return out;
}
