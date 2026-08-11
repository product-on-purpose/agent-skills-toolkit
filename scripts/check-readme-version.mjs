// what-it-is:   README front-door claim drift guard
// what-it-does: reads library.json (version, tier, skill count) and the check registry (spine
//               size), then fails if the README's version badge, or its `## Status` section's
//               version / tier / skill-count / spine-size claims, disagrees with any of them
// why:          docs/internal/RELEASE.md promises "README Status matches the declared tier +
//               version (drift = error)". Through v1.10.0 this script covered only the version half
//               of that promise (badge plus the Status prose); the tier half was never read at all,
//               so the README could claim a different Bronze/Silver/Gold grade than library.json.tier
//               declares - or lose its tier claim entirely - and the guard still passed. Both halves
//               are unguarded prose otherwise, which is the same class of unverified claim that left
//               STATUS.md asserting shipped work was open for six weeks. These are the numbers and
//               the grade a stranger reads first.
// used-by:      npm test (prepended to the node --test invocation in package.json)
//
// Scope note: the `## Status` scan requires EVERY three-part version string in that section to be
// the current one. That is deliberate rather than incidental. The section is short and describes
// present state, so a historical version mentioned there is far more likely to be a stale edit
// than an intentional reference. If a genuine historical mention is ever wanted, move it out of
// `## Status` rather than loosening this guard.
//
// Scope note: the tier claim is only enforced when library.json declares a `tier` field. A plugin
// that declares no askit tier is not graded against the tier ladder (see scripts/lib/tier.mjs and
// tier-report.mjs humanLine()), so there is nothing for a README tier claim to agree or disagree
// with; requiring one anyway would invent a claim this script has no basis for. Once library.json
// DOES declare a tier, a missing Status tier claim fails rather than silently skipping, for the same
// reason a missing `## Status` section fails: a guard that passes when its subject is absent is
// worse than no guard.
//
// Scope note: every claim (tier, skill count, spine size) is collected with matchAll rather than
// read with the first match only (round-5 adversarial review, Finding 1: a `statusBody.match(...)`
// tier check saw only the first `**Tier**` bullet, so a second, contradictory one passed unseen).
// The tier claim requires EXACTLY ONE occurrence: it is a single labeled field, and a section
// describing present state naming two grades at once is a defect even when both are identical. The
// skill-count and spine-size claims instead require every occurrence to AGREE with the authoritative
// number: neither has a canonical single bullet the way `**Tier**` does, so repeating the same
// correct number twice is not itself an error, only a disagreeing repeat is.
//
// Scope note on number parsing: the skill-count and spine-size claims are extracted with
// scripts/lib/stated-counts.mjs's extractLabeledCounts, not a local `\d+` regex (round-6 adversarial
// review, Finding 3: the local `(\d+)\s+skills\b` / `(\d+)\s+checks\b` patterns had no leading
// numeric boundary, so a contradictory grouped claim like "1,024 skills" was read as the substring
// "024" -> Number("024") === 24, coincidentally matching a real count of 24 and passing as
// agreement). extractLabeledCounts reads the complete grouped number and normalizes the thousands
// separator before comparing.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CHECKS } from "./lib/registry.mjs";
import { TIER_NAME, TIER_SUB, TIER_ORDER } from "./lib/tier.mjs";
import { extractLabeledCounts } from "./lib/stated-counts.mjs";

const dir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const libPath = path.join(dir, "library.json");
const readmePath = path.join(dir, "README.md");

// Validate files exist
if (!existsSync(libPath)) {
  process.stderr.write(`check-readme-version: library.json not found at ${libPath}\n`);
  process.exit(1);
}
if (!existsSync(readmePath)) {
  process.stderr.write(`check-readme-version: README.md not found at ${readmePath}\n`);
  process.exit(1);
}

// Read library.json version by key (not line position)
let libVersion;
let lib;
try {
  lib = JSON.parse(readFileSync(libPath, "utf8"));
  libVersion = lib.version;
} catch (e) {
  process.stderr.write(`check-readme-version: failed to parse library.json: ${e.message}\n`);
  process.exit(1);
}
if (!libVersion) {
  process.stderr.write(`check-readme-version: library.json has no version field\n`);
  process.exit(1);
}

// Read README.md and find the version badge by regex pattern (not line position)
const readme = readFileSync(readmePath, "utf8");
const BADGE_RE = /\/badge\/version-([\d]+\.[\d]+\.[\d]+)-/;
const m = readme.match(BADGE_RE);
if (!m) {
  process.stderr.write(`check-readme-version: no version badge found in README.md (expected pattern: /badge/version-X.Y.Z-)\n`);
  process.exit(1);
}

// Collect every disagreement before reporting. An author fixing README drift should see all of it
// in one run rather than discovering the next claim only after correcting the previous one.
const failures = [];

const badgeVersion = m[1];
if (badgeVersion !== libVersion) {
  failures.push(`README.md  version badge is ${badgeVersion} (library.json says ${libVersion})`);
}

// ---------------------------------------------------------------------------
// The `## Status` section: the front-door claims a stranger reads first.
// ---------------------------------------------------------------------------

// Isolate `## Status` up to the next level-2 heading. Split on the heading rather than matching
// with a lookahead for the NEXT `## `, because a lookahead silently finds nothing when Status is
// the last section in the file - a guard that stops guarding when the document is re-ordered is
// the failure mode this whole script exists to prevent.
const sections = readme.split(/^## /m);
const statusSection = sections.find((s) => /^Status\s*$/m.test(s.split("\n")[0]));
const statusMatch = statusSection ? { 1: statusSection, index: readme.indexOf("## Status") } : null;
if (!statusMatch) {
  process.stderr.write(
    `check-readme-version: no "## Status" section found in README.md\n` +
    `  This guard is anchored to that heading. If the section was renamed, update this script;\n` +
    `  do not leave the claims unguarded.\n`
  );
  process.exit(1);
}
const statusBody = statusMatch[1];
const statusStartLine = readme.slice(0, statusMatch.index).split("\n").length;

// 1. Every semver-shaped string in Status must be the current version.
for (const m of statusBody.matchAll(/\b(\d+\.\d+\.\d+)\b/g)) {
  if (m[1] !== libVersion) {
    const line = statusStartLine + statusBody.slice(0, m.index).split("\n").length - 1;
    failures.push(`README.md:${line}  version "${m[1]}" in "## Status" (library.json says ${libVersion})`);
  }
}

// 2. The Status section's tier claim must match library.json.tier (Finding B, round-3 adversarial
// review). Only enforced when library.json actually declares a tier; see the "Scope note" above.
//
// The claim must name the declared tier's own vocabulary AND must not also name a DIFFERENT tier's
// vocabulary (round-4 adversarial review, Finding 1: "the tier guard accepts contradictory public
// grades"). The round-3 matcher tested only for presence of either synonym, so "Advanced (Silver)"
// against a declared tier of "advanced" passed - the string contains "Advanced", and the foreign
// token "Silver" was never checked for. That is a contradictory claim, not agreement.
//
// The rule enforced here is "no foreign token", not "exactly the canonical pair". A claim naming
// only one of the two correct synonyms (e.g. "Gold" alone) is accepted as long as it names no other
// tier; requiring both synonyms in the exact "Sub (Name)" order would reject reasonable phrasings a
// maintainer might write and is tighter than the promise in docs/internal/RELEASE.md actually needs.
//
// Every `**Tier**` claim in the section is collected with matchAll, not just the first (round-5
// adversarial review, Finding 1: the round-4 matcher used `statusBody.match(...)`, which returns
// only the first match, so a Status section carrying a correct claim followed by a second,
// contradictory one passed - the second claim was never inspected). Exactly one claim is required:
// a section describing present state that states two grades at once is a defect in its own right,
// even when both claims happen to be identical, not a parsing inconvenience to tolerate.
const declaredTier = lib?.tier ?? null;
if (declaredTier != null) {
  const wantName = TIER_NAME[declaredTier] ?? declaredTier; // e.g. "Gold"
  const wantSub = TIER_SUB[declaredTier] ?? declaredTier;   // e.g. "Advanced"
  const foreignTokens = TIER_ORDER
    .filter((t) => t !== declaredTier)
    .flatMap((t) => [TIER_NAME[t], TIER_SUB[t]]);
  const tierClaims = [...statusBody.matchAll(/\*\*Tier\*\*\s*[-:]\s*([^\n]+)/gi)].map((m) => m[1].trim());
  if (tierClaims.length === 0) {
    failures.push(
      `README.md  "## Status" has no tier claim (library.json declares tier "${declaredTier}" = ${wantSub} (${wantName}))`
    );
  } else if (tierClaims.length > 1) {
    failures.push(
      `README.md  "## Status" has ${tierClaims.length} tier claims (${tierClaims.map((c) => `"${c}"`).join(", ")}); exactly one is required so the front door cannot state two grades at once`
    );
  } else {
    const claim = tierClaims[0];
    const namesOwnTier = new RegExp(`\\b(${wantName}|${wantSub})\\b`, "i").test(claim);
    const namesForeignTier = foreignTokens.length > 0
      && new RegExp(`\\b(${foreignTokens.join("|")})\\b`, "i").test(claim);
    if (!namesOwnTier) {
      failures.push(
        `README.md  "## Status" tier claim "${claim}" does not match library.json tier "${declaredTier}" (${wantSub} (${wantName}))`
      );
    } else if (namesForeignTier) {
      failures.push(
        `README.md  "## Status" tier claim "${claim}" names both the declared tier "${declaredTier}" (${wantSub} (${wantName})) and a different tier - a contradictory claim`
      );
    }
  }
}

// 3. The declared skill count must match library.json. Every occurrence in the section is checked
// with matchAll, not just the first (round-5 adversarial review: the same first-match-only shape
// that hid a contradictory tier claim was checked for here too, per the round-5 instruction not to
// fix one field and leave its neighbour holding the identical hole). Decision, deliberately
// different from the tier claim's "exactly one" rule: this number has no single canonical labeled
// bullet the way `**Tier**` does, so more than one mention is not itself a defect - only
// DISAGREEMENT among the mentions is. A skill count repeated twice with the same correct value
// passes; a second, contradictory count fails, which is the actual soundness gap Finding 1 named.
const declaredSkills = Array.isArray(lib?.components?.skills) ? lib.components.skills.length : null;
if (declaredSkills != null) {
  for (const c of extractLabeledCounts(statusBody, "skills")) {
    if (c.count !== declaredSkills) {
      failures.push(`README.md  "## Status" claims ${c.raw}; library.json registers ${declaredSkills}`);
    }
  }
}

// 4. The declared spine size must match the check registry. Same matchAll-over-all-occurrences
// treatment as the skill count above, and the same reasoning: disagreement fails, repetition of the
// same correct number does not.
const spineSize = CHECKS.length;
for (const c of extractLabeledCounts(statusBody, "checks")) {
  if (c.count !== spineSize) {
    failures.push(`README.md  "## Status" claims a ${c.raw} spine; the registry has ${spineSize}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(
    `check-readme-version: README front-door drift detected\n` +
    failures.map((f) => `  ${f}\n`).join("") +
    `  Update README.md "## Status" so its claims match the repository.\n`
  );
  process.exit(1);
}

process.stdout.write(
  `check-readme-version: OK (version ${libVersion}, ${declaredSkills ?? "?"} skills, ${spineSize} checks)\n`
);
