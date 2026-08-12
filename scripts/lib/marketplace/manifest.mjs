// what-it-is:   the marketplace catalogue reader (ADR 0039, marketplace scope)
// what-it-does: parses and shape-validates a .claude-plugin/marketplace.json, classifies every entry's
//               source kind (local-path, url, github, npm, archive, git-subdir), reads the optional
//               `renames` field, and answers whether a manifest is the marketplace-OF-PLUGINS shape this
//               scope grades or the marketplace-OF-SKILLS shape U13 already owns
// why:          a catalogue is graded by hand today, one member at a time, so everything that exists only
//               BETWEEN members is invisible. Reading the catalogue is the first half of seeing it; the
//               shape test is what keeps this scope and U13 provably disjoint rather than merely
//               documented as disjoint (ADR 0039, "Implementation sites")
// used-by:      scripts/lib/marketplace/evaluate-marketplace.mjs, scripts/lib/marketplace/resolve.mjs
import path from "node:path";
import { existsSync } from "node:fs";
import { readJsonSafe } from "../fs-utils.mjs";
import { skillNameFromPath } from "../../checks/skill-registration.mjs";

/** Where a catalogue lives relative to its root, for both Claude Code and this scope. */
export const MANIFEST_REL = path.join(".claude-plugin", "marketplace.json");

/**
 * Every source kind this scope RECOGNIZES. Recognizing a kind means classifying and reporting it
 * correctly, including reporting honestly that it cannot be resolved to a local checkout; it does NOT
 * mean fetching it. Remote fetch-at-sha is deferred by ADR 0039 question 1, so `npm`, `archive` and
 * `git-subdir` are well-formed-but-not-locally-resolvable unless the operator supplies a local mapping.
 * `locallyDiscoverable` marks the kinds whose member directory can be GUESSED from the source itself
 * (a git URL ends in the repository name); the rest need an explicit mapping or nothing at all.
 */
export const SOURCE_KINDS = Object.freeze({
  "local-path": { locallyDiscoverable: true, remote: false },
  url: { locallyDiscoverable: true, remote: true },
  github: { locallyDiscoverable: true, remote: true },
  npm: { locallyDiscoverable: false, remote: true },
  archive: { locallyDiscoverable: false, remote: true },
  "git-subdir": { locallyDiscoverable: true, remote: true },
});

const nonEmptyString = (v) => typeof v === "string" && v.trim() !== "";

/**
 * Classify one entry's `source` value into a normalized descriptor, or a rejection carrying the reason.
 * A rejection is what makes an entry UNRESOLVABLE (a defect in the catalogue, which reds the collection),
 * as distinct from a well-formed entry whose member is merely absent from this machine (an environment
 * gap, which does not). Keeping the two apart is ADR 0039's derived decision and the whole reason this
 * function returns a reason string rather than null.
 *
 * @param {unknown} raw the entry's `source` field
 * @returns {{kind: string|null, reason: string|null, [k: string]: unknown}}
 */
export function classifySource(raw) {
  if (nonEmptyString(raw)) return { kind: "local-path", path: raw, reason: null };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { kind: null, reason: `source is missing or is not a string or object (got ${raw === undefined ? "undefined" : JSON.stringify(raw)})` };
  }
  const declared = raw.source;
  switch (declared) {
    case "url":
    case "git":
      return nonEmptyString(raw.url)
        ? { kind: "url", url: raw.url, sha: nonEmptyString(raw.sha) ? raw.sha : null, reason: null }
        : { kind: null, reason: `source kind "${declared}" requires a non-empty "url"` };
    case "github":
      return nonEmptyString(raw.repo)
        ? { kind: "github", repo: raw.repo, sha: nonEmptyString(raw.sha) ? raw.sha : null, reason: null }
        : { kind: null, reason: 'source kind "github" requires a non-empty "repo"' };
    case "npm":
      return nonEmptyString(raw.package)
        ? { kind: "npm", package: raw.package, npmVersion: nonEmptyString(raw.version) ? raw.version : null, reason: null }
        : { kind: null, reason: 'source kind "npm" requires a non-empty "package"' };
    case "archive":
      // sha256 is REQUIRED, not optional: an archive without a digest is an unverifiable download, and
      // accepting one here would let a catalogue advertise integrity it does not have. This is the one
      // new kind where the missing field is a real defect rather than a deferred capability.
      if (!nonEmptyString(raw.url)) return { kind: null, reason: 'source kind "archive" requires a non-empty "url"' };
      if (!nonEmptyString(raw.sha256)) return { kind: null, reason: 'source kind "archive" requires a "sha256" digest; an archive with no digest cannot be verified on download' };
      return { kind: "archive", url: raw.url, sha256: raw.sha256, reason: null };
    case "git-subdir":
      if (!nonEmptyString(raw.url)) return { kind: null, reason: 'source kind "git-subdir" requires a non-empty "url"' };
      if (!nonEmptyString(raw.path)) return { kind: null, reason: 'source kind "git-subdir" requires a "path" naming the subdirectory the plugin lives in' };
      return { kind: "git-subdir", url: raw.url, sha: nonEmptyString(raw.sha) ? raw.sha : null, subdir: raw.path, reason: null };
    default:
      return {
        kind: null,
        reason: declared === undefined
          ? 'source object has no "source" field naming its kind'
          : `unknown source kind ${JSON.stringify(declared)} (known: ${Object.keys(SOURCE_KINDS).filter((k) => k !== "local-path").join(", ")})`,
      };
  }
}

/**
 * The pin sha a source advertises, or null when the kind carries no sha. Used unconditionally by the
 * collection report: ADR 0039 requires the pin column to be present even when it agrees with the graded
 * sha, because a report that shows it only on disagreement teaches a reader to assume agreement from
 * silence.
 */
export function pinShaOf(source) {
  if (!source) return null;
  if (source.kind === "url" || source.kind === "github" || source.kind === "git-subdir") return source.sha ?? null;
  if (source.kind === "archive") return source.sha256 ?? null;
  return null;
}

/** Normalize an entry's `renames` field to an array of previous names. Anything else reads as none. */
export function renamesOf(entry) {
  const r = entry?.renames;
  if (!Array.isArray(r)) return [];
  return r.filter(nonEmptyString).map((s) => s.trim());
}

/**
 * True iff this manifest is the marketplace-OF-SKILLS shape `U13` (skill-registration) already owns -
 * that is, at least one entry's source resolves under `skills/`.
 *
 * This is deliberately the EXACT inverse of `resolveRegistrationSource`'s rung-2 `set.size > 0` guard,
 * expressed against the same `skillNameFromPath` helper rather than a second copy of the rule. The two
 * scopes are therefore disjoint by construction: a manifest either has a source under `skills/`, and
 * U13 claims it, or it does not, and this scope may. `tests/unit/marketplace-scope.test.mjs` asserts
 * that property directly so a future edit to either side cannot quietly make both claim one manifest.
 */
export function looksLikeMarketplaceOfSkills(data) {
  if (!Array.isArray(data?.plugins)) return false;
  return data.plugins.some((p) => skillNameFromPath(typeof p?.source === "string" ? p.source : null) != null);
}

/**
 * Read and shape-validate the catalogue at <root>/.claude-plugin/marketplace.json.
 * Never throws: a missing file, unparseable JSON, or a wrong top-level type all come back as a result
 * carrying `problems`, matching the house rule `resolveRegistrationSource` already follows (R-REG-5).
 *
 * @returns {{present: boolean, data: object|null, parseError: string|null, entries: Array<object>,
 *            problems: Array<{severity: "error"|"warn", message: string}>}}
 */
export function readMarketplaceManifest(root) {
  const manifestPath = path.join(root, MANIFEST_REL);
  const problems = [];
  if (!existsSync(manifestPath)) {
    return { present: false, data: null, parseError: null, entries: [], problems };
  }
  const { data, parseError } = readJsonSafe(manifestPath);
  if (parseError) {
    problems.push({ severity: "error", message: `${MANIFEST_REL} is present but not valid JSON: ${parseError}` });
    return { present: true, data: null, parseError, entries: [], problems };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    problems.push({ severity: "error", message: `${MANIFEST_REL} must be a JSON object` });
    return { present: true, data: null, parseError: null, entries: [], problems };
  }
  if (!nonEmptyString(data.name)) {
    problems.push({ severity: "error", message: `${MANIFEST_REL} is missing a non-empty "name"` });
  }
  if (!Array.isArray(data.plugins)) {
    problems.push({ severity: "error", message: `${MANIFEST_REL} must carry a "plugins" array cataloguing its members` });
    return { present: true, data, parseError: null, entries: [], problems };
  }
  if (!nonEmptyString(data.metadata?.version)) {
    problems.push({ severity: "warn", message: `${MANIFEST_REL} has no metadata.version; a catalogue with no version of its own cannot be re-pinned against` });
  }

  const entries = data.plugins.map((p, index) => {
    const source = classifySource(p?.source);
    return {
      index,
      name: nonEmptyString(p?.name) ? p.name : null,
      declaredVersion: nonEmptyString(p?.version) ? p.version : null,
      description: typeof p?.description === "string" ? p.description : null,
      renames: renamesOf(p),
      source,
      pinSha: pinShaOf(source),
      raw: p,
    };
  });
  entries.forEach((e) => {
    if (e.name === null) {
      problems.push({ severity: "error", message: `${MANIFEST_REL} plugins[${e.index}] has no non-empty "name"; an unnamed entry cannot be installed or re-pinned` });
    }
  });
  return { present: true, data, parseError: null, entries, problems };
}
