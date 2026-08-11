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
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CHECKS } from "./lib/registry.mjs";
import { TIER_NAME, TIER_SUB } from "./lib/tier.mjs";

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
const declaredTier = lib?.tier ?? null;
if (declaredTier != null) {
  const wantName = TIER_NAME[declaredTier] ?? declaredTier; // e.g. "Gold"
  const wantSub = TIER_SUB[declaredTier] ?? declaredTier;   // e.g. "Advanced"
  const tierClaim = statusBody.match(/\*\*Tier\*\*\s*[-:]\s*([^\n]+)/i);
  if (!tierClaim) {
    failures.push(
      `README.md  "## Status" has no tier claim (library.json declares tier "${declaredTier}" = ${wantSub} (${wantName}))`
    );
  } else {
    const claim = tierClaim[1].trim();
    const claimsDeclaredTier = new RegExp(`\\b(${wantName}|${wantSub})\\b`, "i").test(claim);
    if (!claimsDeclaredTier) {
      failures.push(
        `README.md  "## Status" tier claim "${claim}" does not match library.json tier "${declaredTier}" (${wantSub} (${wantName}))`
      );
    }
  }
}

// 3. The declared skill count must match library.json.
const declaredSkills = Array.isArray(lib?.components?.skills) ? lib.components.skills.length : null;
const skillClaim = statusBody.match(/(\d+)\s+skills\b/);
if (declaredSkills != null && skillClaim && Number(skillClaim[1]) !== declaredSkills) {
  failures.push(`README.md  "## Status" claims ${skillClaim[1]} skills; library.json registers ${declaredSkills}`);
}

// 4. The declared spine size must match the check registry.
const spineSize = CHECKS.length;
const spineClaim = statusBody.match(/(\d+)\s+checks\b/);
if (spineClaim && Number(spineClaim[1]) !== spineSize) {
  failures.push(`README.md  "## Status" claims a ${spineClaim[1]}-check spine; the registry has ${spineSize}`);
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
