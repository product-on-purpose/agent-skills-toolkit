// what-it-is:   the manifest-drift check (U8)
// what-it-does: asserts the committed native per-agent manifests match what gen-manifest produces from library.json
// why:          enforces the Standard requirement U8 deterministically, one module per reqId, so the gate stays model-free
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "manifest-drift", tier: "universal", reqId: "U8" };

// Native manifests, keyed to their on-disk path. Mirrors MANIFEST_FOR in per-target-presence.mjs (S6); keep the two in sync.
/** Native manifests generated from library.json; checked for name/version agreement. */
const NATIVE = [
  { key: "claudeManifest", file: ".claude-plugin/plugin.json" },
  { key: "codexManifest", file: ".codex-plugin/plugin.json" },
];

export function check(ctx) {
  const lib = ctx.library?.data;
  if (!lib) return [];
  const out = [];
  for (const { key, file } of NATIVE) {
    const m = ctx[key];
    if (!m) continue;
    for (const k of ["name", "version"]) {
      if (lib[k] !== m[k]) {
        out.push(finding(meta.id, SEVERITY.WARN, `${file} ${k} "${m[k]}" differs from library.json "${lib[k]}"; native manifests are generated from library.json (Standard sec 5, G4). Regenerate with: node scripts/generators/gen-manifest.mjs . --write --target=all`, { file, reqId: "U8" }));
      }
    }
  }
  return out;
}
