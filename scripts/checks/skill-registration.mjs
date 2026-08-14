// what-it-is:   the skill-registration check (U13)
// what-it-does: compares the skills a plugin registers in its enumerating manifest (library.json
//               components, else .claude-plugin/marketplace.json plugins) against the skill dirs on
//               disk; on disk but unregistered is invisible to installers (a silent delivery failure),
//               registered but missing on disk is undeliverable
// why:          a well-formed catalog must enumerate every skill it ships - objective and portable, so
//               a Universal requirement. Distinct from U8 manifest-drift (generated-manifest-vs-library.json). ADR 0035.
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "skill-registration", tier: "universal", reqId: "U13", since: "0.12", provenance: "objective" };

// BURNDOWN (ADR 0035 + STANDARD.md sec 7.7), DISCHARGED at Standard 0.13 (ADR 0044).
//
// U13 now emits its TARGET severity unconditionally, and the migration below is what holds it at warn
// for anyone pinned below 0.13. There is no longer a constant for a future maintainer to remember to
// hand-edit: "graduates at 0.13" used to be a promise kept by someone remembering, in two files, with
// no test that failed if they did not. It is now data the resolver enforces, and the horizon test
// asserts every registered `until` is a real Standard version at most one minor out.
const U13_SEVERITY = SEVERITY.ERROR;
const U13_MIGRATION = Object.freeze({
  capAt: SEVERITY.WARN,
  until: "0.13",
  // STATIC and activation-neutral: what the migration is ABOUT, never what this run did. A reason
  // asserting the finding "stays capped at warn" is false under --strict, where the ceiling is off.
  reason: "ADR 0035: skill-registration drift is newly detected at Standard 0.12.",
});

/** The <name> segment of a skills/<name>/... path or ./skills/<name> source. Null if not under skills/. */
export function skillNameFromPath(p) {
  if (typeof p !== "string") return null;
  const parts = p.replace(/^\.\//, "").split(/[\\/]/);
  const i = parts.indexOf("skills");
  return i >= 0 && parts[i + 1] ? parts[i + 1] : null;
}

/**
 * Resolve the authoritative skill-registration set, or null if no manifest enumerates skills (R-REG-4).
 * Precedence (SPEC sec 3): library.json components.skills -> marketplace.json plugins[].source -> null.
 * A library.json that carries a components.skills ARRAY (even empty) has opted into enumeration, so it
 * is the source even when it registers nothing (closes the empty-array evasion); a malformed
 * marketplace.json falls through rather than throwing (R-REG-5).
 */
export function resolveRegistrationSource(ctx) {
  // Rung 1: library.json components.skills[] (present-as-array means the plugin enumerates skills here).
  // Key by the path SEGMENT (which skills/<name>/ folder the entry catalogues), NOT the declared `name`:
  // U13 answers "which folders did you catalogue", so a `name` that disagrees with its path is U4's job,
  // and a registration whose path is not under skills/ catalogues no real folder and must not mask one
  // (adversarial-review finding: a `name`-field fallback let a misdirected entry silence an on-disk skill).
  const libSkills = ctx?.library?.data?.components?.skills;
  if (Array.isArray(libSkills)) {
    return new Set(libSkills.map((s) => skillNameFromPath(s?.path)).filter(Boolean));
  }
  // Rung 2: .claude-plugin/marketplace.json plugins[].source resolving under skills/ (the marketplace-of-
  // skills shape, e.g. deanpeters). The `size > 0` guard is deliberate: if NO source resolves under skills/,
  // this is either a marketplace-OF-PLUGINS (sources point at other plugin dirs/repos) or a marketplace whose
  // layout the check cannot map to the on-disk skills/ tree. Either way there is no sound mapping, so it is
  // conservatively skipped rather than flagging every on-disk skill (which would false-fire on a valid
  // marketplace-of-plugins). A non-array `components.skills` similarly falls through (malformed library.json
  // is U1's domain). Both declined behaviors are locked by tests; the malformed read never throws (R-REG-5).
  try {
    const mp = JSON.parse(readFileSync(path.join(ctx.root, ".claude-plugin", "marketplace.json"), "utf8"));
    if (Array.isArray(mp?.plugins)) {
      const set = new Set(mp.plugins.map((p) => skillNameFromPath(p?.source)).filter(Boolean));
      if (set.size > 0) return set;
    }
  } catch {
    /* absent or malformed -> fall through (R-REG-5: never throw) */
  }
  // Rung 3: no enumerating manifest
  return null;
}

export function check(ctx) {
  const registered = resolveRegistrationSource(ctx);
  if (registered === null) return []; // R-REG-4: nothing to drift, no false positive
  const onDisk = new Set((ctx.skills ?? []).map((s) => path.basename(s.dir)));
  const out = [];
  for (const name of onDisk) {
    // R-REG-2 (headline): on disk but unregistered -> shipped but invisible to installers
    if (!registered.has(name)) {
      out.push(finding(meta.id, U13_SEVERITY,
        `skill "${name}" exists on disk (skills/${name}/) but is not registered in the plugin's manifest; ` +
        `it ships but is invisible to installers. Register it in library.json components.skills[] (or the marketplace plugins[] catalog).`,
        { file: `skills/${name}/SKILL.md`, reqId: "U13", migration: U13_MIGRATION }));
    }
  }
  for (const name of registered) {
    // R-REG-3 (phantom): registered but missing on disk -> catalogued but undeliverable
    if (!onDisk.has(name)) {
      out.push(finding(meta.id, U13_SEVERITY,
        `skill "${name}" is registered in the manifest but has no skills/${name}/ directory on disk; ` +
        `it is catalogued but cannot be delivered. Add the skill or remove the registration entry.`,
        { file: `skills/${name}/SKILL.md`, reqId: "U13", migration: U13_MIGRATION }));
    }
  }
  return out;
}
