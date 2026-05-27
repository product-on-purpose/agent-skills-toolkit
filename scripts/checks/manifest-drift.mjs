import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "manifest-drift", tier: "universal", reqId: "U8" };

export function check(ctx) {
  const lib = ctx.library?.data;
  const cm = ctx.claudeManifest;
  if (!lib || !cm) return [];
  const out = [];
  for (const k of ["name", "version"]) {
    if (lib[k] !== cm[k]) {
      out.push(finding(meta.id, SEVERITY.WARN, `.claude-plugin/plugin.json ${k} "${cm[k]}" differs from library.json "${lib[k]}"; native manifests are generated from library.json at Gold (sec 5, G4).`, { file: ".claude-plugin/plugin.json", reqId: "U8" }));
    }
  }
  return out;
}
