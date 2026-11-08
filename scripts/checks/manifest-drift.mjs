// what-it-is:   the manifest-drift check (U8)
// what-it-does: fails closed on a native per-agent manifest that is present but not valid JSON (an ERROR), then
//               compares ONLY the "name" and "version" of each committed manifest against library.json;
//               version drift is an ERROR (the release tag guard's exact invariant), name drift a WARN.
//               It does NOT run gen-manifest and compares no other generated field (description, license,
//               keywords, the component pointers), and it never reads manifest.generated.json
// why:          enforces the Standard requirement U8 deterministically, one module per reqId, so the gate stays model-free;
//               making version drift an error keeps the portable gate authoritative for what the release.yml tag guard checks
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "manifest-drift", tier: "universal", reqId: "U8", since: "0.x", provenance: "objective" };

// Native manifests, keyed to their on-disk path. Mirrors MANIFEST_FOR in per-target-presence.mjs (S6); keep the two in sync.
/** Native manifests generated from library.json; checked for name/version agreement. */
const NATIVE = [
  { key: "claudeManifest", parseErrorKey: "claudeManifestParseError", file: ".claude-plugin/plugin.json" },
  { key: "codexManifest", parseErrorKey: "codexManifestParseError", file: ".codex-plugin/plugin.json" },
];

export function check(ctx) {
  const out = [];
  // Fail closed, before the library.json guard: a manifest the runtime cannot parse means the plugin
  // does not load, whatever library.json says. Same pattern as U9 (package.json) and U11 (.mcp.json).
  for (const { parseErrorKey, file } of NATIVE) {
    if (ctx[parseErrorKey]) {
      out.push(finding(meta.id, SEVERITY.ERROR, `${file} is present but not valid JSON: ${ctx[parseErrorKey]}. The plugin cannot load until it parses. Regenerate with: npx agent-skills-toolkit gen-manifest . --write --target=all (or \`node scripts/generators/gen-manifest.mjs . --write --target=all\` if you vendor this toolkit)`, { file, reqId: "U8" }));
    }
  }
  const lib = ctx.library?.data;
  if (!lib) return out;
  for (const { key, file } of NATIVE) {
    const m = ctx[key];
    if (!m) continue;
    for (const k of ["name", "version"]) {
      if (lib[k] !== m[k]) {
        // Version drift is the exact invariant the release.yml tag guard enforces, so it is an ERROR:
        // a single `node scripts/check.mjs .` must fail on it, not leave the gate green and exit 0.
        // Name drift stays a WARN (cosmetic at install time; the tag guard does not gate on it).
        const severity = k === "version" ? SEVERITY.ERROR : SEVERITY.WARN;
        out.push(finding(meta.id, severity, `${file} ${k} "${m[k]}" differs from library.json "${lib[k]}"; native manifests are generated from library.json (Standard sec 5, G4). Regenerate with: npx agent-skills-toolkit gen-manifest . --write --target=all (or \`node scripts/generators/gen-manifest.mjs . --write --target=all\` if you vendor this toolkit)`, { file, reqId: "U8" }));
      }
    }
  }
  return out;
}
