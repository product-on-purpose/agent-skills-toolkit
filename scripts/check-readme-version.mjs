// what-it-is:   front-door claim drift guard: the README, plus every PRESENT-TENSE spine-size claim
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
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { CHECKS } from "./lib/registry.mjs";
import { TIER_NAME, TIER_SUB, TIER_ORDER } from "./lib/tier.mjs";
import { extractLabeledCounts, INT_TOKEN_SRC, normalizeCount } from "./lib/stated-counts.mjs";

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

// 5. PRESENT-TENSE prose states the spine size too, and nothing governed any of it until v1.13.0: ten
// separate places said "30 checks" while the registry held 31, across explanation, reference, tutorial,
// the marketplace source README and the site catalogue. The README is the front door, but these are
// where a reader goes for the mechanism, and a wrong number there is the same class of unverified claim.
//
// The first version of this guard covered exactly the two architecture pages that had already been
// FIXED BY HAND, which is the same partial-coverage shape it exists to prevent - a guard written around
// the instances you happened to notice reports success for the ones you did not. So the scan is defined
// by what a file IS, not by a list of files someone remembered.
//
// HISTORY IS EXCLUDED, and that is the whole design constraint. CHANGELOG, RELEASE-NOTES,
// RELEASE-HISTORY, ADRs, release plans, execution logs and report templates all state older spine sizes
// CORRECTLY - they describe the spine as it was at the time. "Correct" the record and you falsify it.
const HISTORICAL = [
  "CHANGELOG.md", "RELEASE-NOTES.md",
  `docs${path.sep}internal${path.sep}RELEASE-HISTORY.md`,
  `docs${path.sep}internal${path.sep}decisions`,
  `docs${path.sep}internal${path.sep}release-plans`,
  `docs${path.sep}internal${path.sep}execution`,
  `docs${path.sep}internal${path.sep}template`,
  `docs${path.sep}internal${path.sep}eval-runs`,
  `tests${path.sep}fixtures`,
];

// The four canonical shapes a present-tense spine claim is written in. Scoped this tightly on purpose:
// a bare "N checks" also matches legitimate TIER-SUBSET counts ("Universal is 13 checks"), and a guard
// that fails on those would be turned off within a week.
// The number token comes from the SHARED parser, never a local copy. A hand-rolled `(\d+)` matched
// "031" inside "1,031-check spine" and accepted it as 31 - the identical substring-versus-token defect
// a previous release already found in the skill and spine counts, rediscovered here because these
// patterns were written by hand instead of reusing that lesson. A test asserts this file grows no
// local redefinition, and it caught exactly that.
const NUM = INT_TOKEN_SRC;

// The four PROSE shapes, plus the two BADGE shapes. The badge is the first number a stranger reads and
// was stale on main while every prose claim was correct - the guard scanned README.md and simply did not
// recognise a shields.io slug or its alt text as a spine claim.
const SPINE_CLAIM = [
  new RegExp(String.raw`${NUM}-check \w+`, "g"),
  new RegExp(String.raw`${NUM} spine checks`, "g"),
  new RegExp(String.raw`spine is \*{0,2}${NUM} checks`, "g"),
  new RegExp(String.raw`\|\s*Spine\s*\|\s*${NUM} checks`, "g"),
  new RegExp(String.raw`badge/checks-${NUM}-`, "g"),
  new RegExp(String.raw`Validation checks: ${NUM}`, "g"),
];

// Tracked files only. Git already draws the exact authored-versus-generated line this needs: the site's
// generated docs mirror is gitignored (and asserted untracked by its own check), while the site's
// authored catalogue and scripts are tracked and DO state the spine.
// Git when it is available, a filesystem walk when it is not. This script takes a directory argument and
// its own unit tests point it at temp fixtures that are not repositories, so a hard requirement on git
// made the guard fail on every caller except this one - the enumeration was right for this repository
// and wrong for the script's actual contract.
//
// The fallback is a SUPERSET, never a narrowing: it can only include extra files (a locally generated
// site mirror), and those carry the same claims as their sources, so over-scanning costs nothing while
// under-scanning would be the silent failure this section exists to prevent.
let tracked;
try {
  tracked = execFileSync("git", ["ls-files", "-z", "*.md"], { cwd: dir, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] })
    .split("\0").filter(Boolean);
} catch {
  tracked = walkMarkdown(dir).map((f) => path.relative(dir, f).split(path.sep).join("/"));
}

/** Every .md under `root`, for the no-git fallback. Skips node_modules and .git, which are never ours. */
function walkMarkdown(root) {
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name.toLowerCase().endsWith(".md")) out.push(full);
    }
  }
  return out;
}

const spineClaimFiles = [];
for (const rel of tracked) {
  const native = rel.split("/").join(path.sep);
  if (HISTORICAL.some((h) => native === h || native.startsWith(h + path.sep))) continue;
  const full = path.join(dir, native);
  if (!existsSync(full)) continue;
  const text = readFileSync(full, "utf8");
  let sawClaim = false;
  for (const re of SPINE_CLAIM) {
    for (const m of text.matchAll(re)) {
      sawClaim = true;
      if (normalizeCount(m[1]) !== spineSize) {
        failures.push(`${rel}  claims "${m[0]}"; the registry has ${spineSize}`);
      }
    }
  }
  if (sawClaim) spineClaimFiles.push(rel);
}

// Guard the guard. If the scan silently matches nothing - a rephrase that drifts out of all four canonical
// shapes, a change to how files are enumerated - it would report success over an unread repository, which
// is indistinguishable from success over a correct one.
//
// Applied ONLY to this project, by name. The floor is a fact about THIS repository's documentation, not a
// requirement on any plugin this script is pointed at: demanding five spine claims from someone else's
// plugin would invent a rule they never agreed to, which is the same error as the tier claim's
// only-when-declared scope note above.
if (lib?.name === "agent-skills-toolkit" && spineClaimFiles.length < 5) {
  failures.push(
    `the spine-claim scan found claims in only ${spineClaimFiles.length} file(s) (${spineClaimFiles.join(", ") || "none"}); ` +
    `at least 5 present-tense pages state the spine size, so this means the scan stopped seeing them, not that the claims went away. ` +
    `Write a spine claim as "N-check spine", "N spine checks", or "the spine is N checks" so it stays visible to this guard.`
  );
}

if (failures.length > 0) {
  process.stderr.write(
    `check-readme-version: front-door claim drift detected\n` +
    failures.map((f) => `  ${f}\n`).join("") +
    `  Update the file named on each line so its claims match the repository.\n`
  );
  process.exit(1);
}

process.stdout.write(
  `check-readme-version: OK (version ${libVersion}, ${declaredSkills ?? "?"} skills, ${spineSize} checks)\n`
);
