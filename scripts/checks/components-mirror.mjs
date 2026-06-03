// what-it-is:   the components-mirror check (S8)
// what-it-does: asserts every component on disk is declared in library.json and every declared component exists (the bidirectional mirror, sec 5.1)
// why:          enforces the Standard requirement S8 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "components-mirror", tier: "convergent", reqId: "S8" };

/** The value of a frontmatter metadata field (undefined when metadata is absent or not a map). */
function frontmatterField(comp, field) {
  const m = comp && comp.frontmatter && comp.frontmatter.metadata;
  return m && typeof m === "object" && !Array.isArray(m) ? m[field] : undefined;
}

/**
 * S8 (Standard sec 5.1): a library.json component entry MUST mirror the component on disk.
 * This enforces the status and tier halves of that mandate: if a component's frontmatter
 * declares `metadata.status` or `metadata.tier`, the library.json entry's `status` / `tier`
 * MUST equal it. A frontmatter declaring `deprecated` while the entry says `active` (or omits
 * status) is the disagreement sec 5.1 says tooling MUST flag, and it is what would otherwise let
 * a frontmatter-only deprecation slip past the G6 deprecation check (which reads the entry). A
 * frontmatter `tier` that disagrees with the entry is the same class of silent drift - sec 5.1
 * names `tier` among the mirrored entry fields, and an unmirrored tier lets a component's
 * declared grade diverge from the manifest the tooling reports against. Frontmatter that omits a
 * field leaves the entry canonical for that field (no finding), so a component that simply does
 * not declare status or tier is unaffected. Convergent tier (the components index is REQUIRED at
 * Convergent+).
 */
export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib || typeof lib.components !== "object" || lib.components === null) return [];
  const out = [];
  const groups = [
    ["skills", ctx.skills || []],
    ["subagents", ctx.subagents || []],
    ["commands", ctx.commands || []],
  ];
  for (const [type, onDisk] of groups) {
    const entries = Array.isArray(lib.components[type]) ? lib.components[type] : [];
    const byName = new Map(onDisk.map((c) => [c.name, c]));
    for (const e of entries) {
      if (!e || typeof e !== "object" || typeof e.name !== "string") continue;
      const comp = byName.get(e.name);
      if (!comp) continue; // S3 owns an entry with no on-disk component.
      const fmStatus = frontmatterField(comp, "status");
      if (fmStatus !== undefined && fmStatus !== null && fmStatus !== e.status) {
        out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.${type} entry "${e.name}" declares status ${JSON.stringify(e.status)} but the component's frontmatter declares metadata.status ${JSON.stringify(fmStatus)}; the entry MUST mirror the frontmatter (Standard sec 5.1). Otherwise a frontmatter-only deprecation escapes the deprecation contract (G6).`, { file: "library.json", reqId: meta.reqId }));
      }
      const fmTier = frontmatterField(comp, "tier");
      if (fmTier !== undefined && fmTier !== null && fmTier !== e.tier) {
        out.push(finding(meta.id, SEVERITY.ERROR, `library.json components.${type} entry "${e.name}" declares tier ${JSON.stringify(e.tier)} but the component's frontmatter declares metadata.tier ${JSON.stringify(fmTier)}; the entry MUST mirror the frontmatter (Standard sec 5.1).`, { file: "library.json", reqId: meta.reqId }));
      }
    }
  }
  return out;
}
