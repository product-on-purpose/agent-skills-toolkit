import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifySource,
  pinShaOf,
  renamesOf,
  readMarketplaceManifest,
  looksLikeMarketplaceOfSkills,
} from "../../scripts/lib/marketplace/manifest.mjs";
import {
  repoNameFromUrl,
  repoNameFromGithub,
  readGitHead,
  loadMemberMap,
  resolveMembers,
} from "../../scripts/lib/marketplace/resolve.mjs";
import {
  MARKETPLACE_CHECKS,
  duplicateCatalogueNames,
  renameCollisions,
  versionAgreement,
  skillCollisions,
  commandCollisions,
  agentRestrictedFields,
  triggerSurfaceOverlap,
  commandSkillDivergence,
  contentLineage,
  triggerTokens,
  jaccard,
  PLUGIN_AGENT_UNSUPPORTED_FIELDS,
} from "../../scripts/lib/marketplace/analyze.mjs";
import {
  detectMarketplaceScope,
  evaluateMarketplace,
  marketplaceExitCode,
  formatMarketplaceReport,
} from "../../scripts/lib/marketplace/evaluate-marketplace.mjs";
import { resolveRegistrationSource } from "../../scripts/checks/skill-registration.mjs";
import { evaluate } from "../../scripts/evaluate.mjs";
import { loadPlugin } from "../../scripts/lib/load-plugin.mjs";
import { runGate } from "../../scripts/check.mjs";
import { computeTierReport } from "../../scripts/tier-report.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../..");
const SEED = path.join(REPO_ROOT, "templates", "seed-plugin");

function tmp() {
  return mkdtempSync(path.join(tmpdir(), "askit-marketplace-"));
}

/** Write a catalogue root with the given plugins[] entries (and optional extra top-level fields). */
function writeCatalogue(root, plugins, extra = {}) {
  mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  writeFileSync(
    path.join(root, ".claude-plugin", "marketplace.json"),
    JSON.stringify({ name: "test-catalogue", metadata: { version: "1.0.0" }, plugins, ...extra }, null, 2)
  );
  return root;
}

/**
 * A member that is a REAL, gate-clean plugin: a copy of templates/seed-plugin, which grades exit 0 at
 * its declared universal tier. Copying the seed rather than hand-rolling a directory is deliberate -
 * a hand-rolled "plugin" would be graded against the same 30 checks and fail for reasons that have
 * nothing to do with what these tests are about.
 */
function writeMember(dir, { version = "0.1.0", tier = "universal", name = "member" } = {}) {
  cpSync(SEED, dir, { recursive: true });
  writeFileSync(
    path.join(dir, "library.json"),
    JSON.stringify({ name, version, description: "REPLACE - what this plugin does and when to use it, with concrete trigger keywords.", standard: "0.12", tier }, null, 2)
  );
  return dir;
}

// --- Source classification ---------------------------------------------------------------------

test("classifySource: a bare string is a local path", () => {
  assert.deepEqual(classifySource("./plugins/foo"), { kind: "local-path", path: "./plugins/foo", reason: null });
});

test("classifySource: the url/github kinds carry their sha", () => {
  assert.deepEqual(
    classifySource({ source: "url", url: "https://x/y.git", sha: "abc" }),
    { kind: "url", url: "https://x/y.git", sha: "abc", reason: null }
  );
  assert.equal(classifySource({ source: "github", repo: "owner/name" }).kind, "github");
  assert.equal(classifySource({ source: "url", url: "https://x/y.git" }).sha, null, "a url with no sha is well-formed, just unpinned");
});

test("classifySource: the three new kinds (npm, archive, git-subdir) are recognized", () => {
  assert.equal(classifySource({ source: "npm", package: "agent-skills-toolkit", version: "1.12.0" }).kind, "npm");
  assert.equal(classifySource({ source: "archive", url: "https://x/y.tgz", sha256: "deadbeef" }).kind, "archive");
  assert.equal(classifySource({ source: "git-subdir", url: "https://x/y.git", path: "packages/foo" }).kind, "git-subdir");
});

test("classifySource: an archive with no sha256 is REJECTED, not merely unpinned", () => {
  // The one new kind where a missing field is a real defect: an archive with no digest is an
  // unverifiable download, and accepting it would let a catalogue advertise integrity it does not have.
  const r = classifySource({ source: "archive", url: "https://x/y.tgz" });
  assert.equal(r.kind, null);
  assert.match(r.reason, /sha256/);
});

test("classifySource: malformed sources are rejected with a reason, never thrown", () => {
  for (const bad of [undefined, null, 42, [], {}, { source: "wat" }, { source: "url" }, { source: "npm" }, { source: "git-subdir", url: "https://x/y.git" }]) {
    const r = classifySource(bad);
    assert.equal(r.kind, null, `expected rejection for ${JSON.stringify(bad)}`);
    assert.equal(typeof r.reason, "string");
    assert.ok(r.reason.length > 0);
  }
});

test("pinShaOf: url/github/git-subdir report sha, archive reports its digest, npm and local report none", () => {
  assert.equal(pinShaOf({ kind: "url", sha: "a1" }), "a1");
  assert.equal(pinShaOf({ kind: "archive", sha256: "d1" }), "d1");
  assert.equal(pinShaOf({ kind: "npm" }), null);
  assert.equal(pinShaOf({ kind: "local-path" }), null);
  assert.equal(pinShaOf(null), null);
});

test("renamesOf: only non-empty strings survive; anything else reads as no renames", () => {
  assert.deepEqual(renamesOf({ renames: ["old", "  spaced  ", "", 5, null] }), ["old", "spaced"]);
  assert.deepEqual(renamesOf({ renames: "old" }), []);
  assert.deepEqual(renamesOf({}), []);
});

// --- Manifest reading --------------------------------------------------------------------------

test("readMarketplaceManifest: absent is not a problem, malformed JSON is a finding not a throw", () => {
  const dir = tmp();
  try {
    assert.equal(readMarketplaceManifest(dir).present, false);
    mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
    writeFileSync(path.join(dir, ".claude-plugin", "marketplace.json"), "{ not json");
    const r = readMarketplaceManifest(dir);
    assert.equal(r.present, true);
    assert.equal(r.data, null);
    assert.equal(r.problems.filter((p) => p.severity === "error").length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("readMarketplaceManifest: a missing name, a missing plugins array, and an unnamed entry are all findings", () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
    writeFileSync(path.join(dir, ".claude-plugin", "marketplace.json"), JSON.stringify({ plugins: [{ source: "./a" }] }));
    const r = readMarketplaceManifest(dir);
    const messages = r.problems.map((p) => p.message).join(" | ");
    assert.match(messages, /missing a non-empty "name"/);
    assert.match(messages, /plugins\[0\] has no non-empty "name"/);
    assert.match(messages, /no metadata\.version/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// --- Scope disjointness (the property, not the promise) ------------------------------------------

test("marketplace scope and U13 are DISJOINT: exactly one of them ever claims a manifest", () => {
  const ofSkills = tmp();
  const ofPlugins = tmp();
  try {
    writeCatalogue(ofSkills, [{ name: "a", source: "./skills/alpha" }, { name: "b", source: "./skills/beta" }]);
    writeCatalogue(ofPlugins, [{ name: "a", source: "./members/alpha" }, { name: "b", source: { source: "url", url: "https://x/beta.git", sha: "s" } }]);

    // The of-skills shape: U13 claims it (rung 2 returns a non-empty set) and this scope declines.
    const u13Set = resolveRegistrationSource({ root: ofSkills, library: { data: {} } });
    assert.ok(u13Set instanceof Set && u13Set.size > 0, "U13 must claim the marketplace-of-skills shape");
    assert.equal(detectMarketplaceScope(ofSkills), false, "marketplace scope must decline what U13 claims");

    // The of-plugins shape: U13 declines (falls through to rung 3, null) and this scope claims it.
    assert.equal(resolveRegistrationSource({ root: ofPlugins, library: { data: {} } }), null, "U13 must decline the marketplace-of-plugins shape");
    assert.equal(detectMarketplaceScope(ofPlugins), true);

    assert.equal(looksLikeMarketplaceOfSkills({ plugins: [{ source: "./skills/x" }] }), true);
    assert.equal(looksLikeMarketplaceOfSkills({ plugins: [{ source: "./members/x" }] }), false);
  } finally {
    rmSync(ofSkills, { recursive: true, force: true });
    rmSync(ofPlugins, { recursive: true, force: true });
  }
});

test("detectMarketplaceScope: a plain plugin (this repository) is never a marketplace", () => {
  assert.equal(detectMarketplaceScope(REPO_ROOT), false);
  assert.equal(detectMarketplaceScope(SEED), false);
});

test("detectMarketplaceScope: a catalogue with unparseable JSON is not claimed by this scope", () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
    writeFileSync(path.join(dir, ".claude-plugin", "marketplace.json"), "{{{");
    assert.equal(detectMarketplaceScope(dir), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// --- Git head reading (no subprocess) ------------------------------------------------------------

const SHA_A = "0123456789abcdef0123456789abcdef01234567";
const SHA_B = "89abcdef0123456789abcdef0123456789abcdef";

test("readGitHead: loose ref, detached HEAD, packed-refs, and a .git FILE all resolve", () => {
  const dir = tmp();
  try {
    // Loose ref
    const git = path.join(dir, "loose", ".git");
    mkdirSync(path.join(git, "refs", "heads"), { recursive: true });
    writeFileSync(path.join(git, "HEAD"), "ref: refs/heads/main\n");
    writeFileSync(path.join(git, "refs", "heads", "main"), `${SHA_A}\n`);
    assert.equal(readGitHead(path.join(dir, "loose")), SHA_A);

    // Detached HEAD
    const det = path.join(dir, "detached", ".git");
    mkdirSync(det, { recursive: true });
    writeFileSync(path.join(det, "HEAD"), `${SHA_B}\n`);
    assert.equal(readGitHead(path.join(dir, "detached")), SHA_B);

    // packed-refs (no loose ref file exists)
    const packed = path.join(dir, "packed", ".git");
    mkdirSync(packed, { recursive: true });
    writeFileSync(path.join(packed, "HEAD"), "ref: refs/heads/release\n");
    writeFileSync(path.join(packed, "packed-refs"), `# pack-refs with: peeled\n${SHA_A} refs/heads/other\n${SHA_B} refs/heads/release\n`);
    assert.equal(readGitHead(path.join(dir, "packed")), SHA_B);

    // .git as a FILE pointing elsewhere (worktree / submodule shape)
    const realGit = path.join(dir, "elsewhere");
    mkdirSync(path.join(realGit, "refs", "heads"), { recursive: true });
    writeFileSync(path.join(realGit, "HEAD"), "ref: refs/heads/main\n");
    writeFileSync(path.join(realGit, "refs", "heads", "main"), `${SHA_A}\n`);
    const wt = path.join(dir, "worktree");
    mkdirSync(wt, { recursive: true });
    writeFileSync(path.join(wt, ".git"), `gitdir: ${realGit}\n`);
    assert.equal(readGitHead(wt), SHA_A);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("readGitHead: a non-checkout, and an unreadable or nonsense .git, are 'not known' rather than a crash", () => {
  const dir = tmp();
  try {
    assert.equal(readGitHead(dir), null);
    const g = path.join(dir, "broken", ".git");
    mkdirSync(g, { recursive: true });
    writeFileSync(path.join(g, "HEAD"), "not a ref and not a sha\n");
    assert.equal(readGitHead(path.join(dir, "broken")), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("repoNameFromUrl / repoNameFromGithub reduce every common form to the repository name", () => {
  assert.equal(repoNameFromUrl("https://github.com/owner/name.git"), "name");
  assert.equal(repoNameFromUrl("https://github.com/owner/name"), "name");
  assert.equal(repoNameFromUrl("https://github.com/owner/name/"), "name");
  assert.equal(repoNameFromUrl("git@github.com:owner/name.git"), "name");
  assert.equal(repoNameFromUrl("https://github.com/owner/name.git?ref=x"), "name");
  assert.equal(repoNameFromUrl(""), null);
  assert.equal(repoNameFromUrl(null), null);
  assert.equal(repoNameFromGithub("owner/name"), "name");
  assert.equal(repoNameFromGithub(""), null);
});

// --- Resolution: the two failures that both wear the word "unresolved" ---------------------------

test("resolveMembers: a broken entry is UNRESOLVABLE; a member merely absent from this machine is NOT-GRADED", () => {
  const root = tmp();
  const siblings = tmp();
  try {
    const entries = readMarketplaceManifest(writeCatalogue(root, [
      { name: "broken-source", source: { source: "wat" } },
      { name: "missing-local", source: "./members/nope" },
      { name: "absent-clone", source: { source: "url", url: "https://x/absent-clone.git", sha: "s" } },
      { name: "remote-only", source: { source: "npm", package: "some-package" } },
    ])).entries;

    const r = resolveMembers(entries, { root, searchRoots: [siblings] });
    const byName = Object.fromEntries(r.map((x) => [x.entry.name, x]));

    assert.equal(byName["broken-source"].status, "unresolvable", "a source the reader cannot classify is a catalogue defect");
    assert.equal(byName["missing-local"].status, "unresolvable", "a local path that does not exist is a catalogue defect");
    assert.equal(byName["absent-clone"].status, "not-graded", "a well-formed url whose clone is absent is an ENVIRONMENT gap");
    assert.equal(byName["remote-only"].status, "not-graded", "a remote-only kind is not gradeable yet and is not a defect");
    assert.match(byName["remote-only"].reason, /remote fetch is deferred/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("resolveMembers: a directory that exists but is not a plugin is UNRESOLVABLE (an installer still gets nothing)", () => {
  const root = tmp();
  try {
    mkdirSync(path.join(root, "members", "hollow"), { recursive: true });
    const entries = readMarketplaceManifest(writeCatalogue(root, [{ name: "hollow", source: "./members/hollow" }])).entries;
    const [r] = resolveMembers(entries, { root, searchRoots: [] });
    assert.equal(r.status, "unresolvable");
    assert.match(r.reason, /not a plugin/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("resolveMembers: discovery finds a sibling checkout by repository name, and by entry name", () => {
  const root = tmp();
  const siblings = tmp();
  try {
    writeMember(path.join(siblings, "beta-repo"), { name: "beta" });
    writeMember(path.join(siblings, "gamma"), { name: "gamma" });
    const entries = readMarketplaceManifest(writeCatalogue(root, [
      { name: "beta", source: { source: "url", url: "https://x/beta-repo.git", sha: "s" } },
      { name: "gamma", source: { source: "url", url: "https://x/gamma-repository-named-differently.git", sha: "s" } },
    ])).entries;
    const r = resolveMembers(entries, { root, searchRoots: [siblings] });
    assert.equal(r[0].status, "resolved", "found by repository name");
    assert.equal(r[1].status, "resolved", "found by entry name when the repository name differs");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("loadMemberMap: an explicit sidecar mapping outranks discovery and can grade a remote-only kind", () => {
  const root = tmp();
  try {
    const memberDir = path.join(root, "checkouts", "np");
    writeMember(memberDir, { name: "np" });
    writeCatalogue(root, [{ name: "np", source: { source: "npm", package: "np" } }]);
    writeFileSync(path.join(root, "askit.marketplace.json"), JSON.stringify({ members: { np: "./checkouts/np" } }));
    const { map, problems } = loadMemberMap(root);
    assert.deepEqual(map, { np: "./checkouts/np" });
    assert.equal(problems.length, 0);
    const entries = readMarketplaceManifest(root).entries;
    const [r] = resolveMembers(entries, { root, searchRoots: [], map });
    assert.equal(r.status, "resolved", "a mapping is the only way a remote-only kind is ever graded");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("loadMemberMap: a malformed sidecar warns and is ignored, never thrown", () => {
  const root = tmp();
  try {
    writeFileSync(path.join(root, "askit.marketplace.json"), "{ nope");
    const a = loadMemberMap(root);
    assert.deepEqual(a.map, {});
    assert.equal(a.problems[0].severity, "warn");
    writeFileSync(path.join(root, "askit.marketplace.json"), JSON.stringify({ members: [] }));
    assert.deepEqual(loadMemberMap(root).map, {});
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// --- The cross-member analyses -------------------------------------------------------------------

const entry = (name, index, extra = {}) => ({ name, index, declaredVersion: null, renames: [], ...extra });

test("duplicateCatalogueNames: two entries claiming one name is an error", () => {
  const f = duplicateCatalogueNames([entry("a", 0), entry("b", 1), entry("a", 2)]);
  assert.equal(f.length, 1);
  assert.equal(f[0].check, MARKETPLACE_CHECKS.DUPLICATE_NAME);
  assert.equal(f[0].severity, "error");
  assert.equal(f[0].reqId, null, "every marketplace finding is scope-local: no spine number");
});

test("renameCollisions: a former name that is somebody's current name, and two entries claiming one former name", () => {
  const collidesWithLive = renameCollisions([entry("new", 0, { renames: ["old"] }), entry("old", 1)]);
  assert.equal(collidesWithLive.length, 1);
  assert.match(collidesWithLive[0].message, /CURRENT name/);

  const bothClaim = renameCollisions([entry("a", 0, { renames: ["legacy"] }), entry("b", 1, { renames: ["legacy"] })]);
  assert.equal(bothClaim.length, 1);
  assert.match(bothClaim[0].message, /former name/);

  assert.deepEqual(renameCollisions([entry("a", 0, { renames: ["gone"] }), entry("b", 1)]), [], "a clean rename produces nothing");
});

test("versionAgreement: the entry version against the member's own library.json", () => {
  const members = [
    { status: "resolved", entry: entry("a", 0, { declaredVersion: "1.0.0" }), library: { version: "1.1.0" } },
    { status: "resolved", entry: entry("b", 1, { declaredVersion: "2.0.0" }), library: { version: "2.0.0" } },
    { status: "not-graded", entry: entry("c", 2, { declaredVersion: "9.9.9" }), library: null },
  ];
  const f = versionAgreement(members);
  assert.equal(f.length, 1);
  assert.match(f[0].message, /declares version 1\.0\.0.*declares 1\.1\.0/s);
  assert.equal(f[0].severity, "error");
});

test("skillCollisions / commandCollisions: the union, not any single member, is where the defect lives", () => {
  const members = [
    { status: "resolved", dir: "/x/a", entry: entry("a", 0), skillNames: ["review", "plan"], commandNames: ["ship"] },
    { status: "resolved", dir: "/x/b", entry: entry("b", 1), skillNames: ["review"], commandNames: ["ship", "other"] },
    { status: "not-graded", dir: null, entry: entry("c", 2), skillNames: ["review"], commandNames: [] },
  ];
  const s = skillCollisions(members);
  assert.equal(s.length, 1, "only the resolved members count toward the union");
  assert.match(s[0].message, /2 members ship the skill directory "review"/);
  const c = commandCollisions(members);
  assert.equal(c.length, 1);
  assert.match(c[0].message, /command "ship"/);
});

test("agentRestrictedFields (A6): a plugin-shipped agent declaring hooks/mcpServers/permissionMode warns, quoting the vendor", () => {
  const members = [{
    status: "resolved", dir: "/x/a", entry: entry("a", 0),
    subagents: [
      { name: "clean", frontmatter: { name: "clean", description: "d", model: "sonnet" } },
      { name: "dirty", frontmatter: { name: "dirty", description: "d", hooks: {}, permissionMode: "acceptEdits" } },
    ],
  }];
  const f = agentRestrictedFields(members);
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, "warn", "A6 is warn-first and scope-local; graduating it is a Standard 0.13 tightening");
  assert.equal(f[0].reqId, null);
  assert.match(f[0].message, /`hooks`, `permissionMode`/);
  assert.match(f[0].message, /not supported for plugin-shipped agents/);
  assert.match(f[0].message, /code\.claude\.com/);
  assert.deepEqual([...PLUGIN_AGENT_UNSUPPORTED_FIELDS], ["hooks", "mcpServers", "permissionMode"]);
});

test("the advisory analyses are deterministic and produce plain data, never findings", () => {
  const members = [
    { status: "resolved", dir: "/x/a", entry: entry("a", 0), skillNames: ["dup"], commandNames: ["dup"], skills: [{ name: "one", raw: "SAME", frontmatter: { description: "grade a plugin library against a tiered conformance standard" } }] },
    { status: "resolved", dir: "/x/b", entry: entry("b", 1), skillNames: [], commandNames: [], skills: [{ name: "two", raw: "SAME", frontmatter: { description: "grade a plugin library against a tiered conformance standard" } }] },
  ];
  const overlap = triggerSurfaceOverlap(members);
  assert.equal(overlap.length, 1);
  assert.equal(overlap[0].similarity, 1);
  assert.deepEqual(commandSkillDivergence(members), [{ member: "a", name: "dup" }]);
  assert.deepEqual(contentLineage(members), [{ copies: ["a/one", "b/two"] }]);
  // Plain objects, not findings: nothing here carries a severity the aggregation could read.
  for (const row of [...overlap, ...commandSkillDivergence(members), ...contentLineage(members)]) {
    assert.equal(row.severity, undefined);
  }
});

test("triggerTokens / jaccard: the advisory similarity is plain arithmetic, not judgment", () => {
  assert.deepEqual([...triggerTokens("Use this skill when the plugin needs grading")].sort(), ["grading", "needs", "plugin"]);
  assert.equal(jaccard(new Set(["a", "b"]), new Set(["a", "b"])), 1);
  assert.equal(jaccard(new Set(["a"]), new Set(["b"])), 0);
  assert.equal(jaccard(new Set(), new Set(["a"])), 0);
});

// --- Aggregation: self-consistency worst-member ---------------------------------------------------

test("aggregation: GREEN when every graded member satisfies its own claim, with coverage stated unconditionally", () => {
  const root = tmp();
  const siblings = tmp();
  try {
    // Both members stay at the seed's own 0.1.0: the seed ships a CHANGELOG whose newest section is
    // 0.1.0, and moving one member's library.json past it would make that member fail its own claim for
    // a reason that has nothing to do with what this test is about.
    writeMember(path.join(siblings, "alpha"), { name: "alpha", version: "0.1.0", tier: "universal" });
    writeMember(path.join(siblings, "beta"), { name: "beta", version: "0.1.0", tier: "universal" });
    writeCatalogue(root, [
      { name: "alpha", version: "0.1.0", source: { source: "url", url: "https://x/alpha.git", sha: "pin1" } },
      { name: "beta", version: "0.1.0", source: { source: "url", url: "https://x/beta.git", sha: "pin2" } },
    ]);
    const r = evaluateMarketplace(root, { searchRoots: [siblings] });
    assert.equal(r.verdict, "green");
    assert.equal(marketplaceExitCode(r), 0);
    assert.deepEqual(r.coverage, { graded: 2, total: 2, notGraded: 0, unresolvable: 0 });
    assert.deepEqual(r.summary.failingMembers, []);
    // The pin columns are present even though nothing disagrees - the whole point of them being
    // unconditional (ADR 0039 question 1).
    assert.equal(r.members[0].pinSha, "pin1");
    assert.equal(r.members[0].entryVersion, "0.1.0");
    assert.equal(r.members[0].gradedSha, null, "a member that is not a git checkout has no graded sha, and says so rather than guessing");
    assert.match(formatMarketplaceReport(r), /Collection verdict: GREEN - graded 2 of 2 member/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("aggregation: RED when one member fails ITS OWN claim, and the report names it", () => {
  const root = tmp();
  const siblings = tmp();
  try {
    writeMember(path.join(siblings, "alpha"), { name: "alpha", version: "0.1.0", tier: "universal" });
    // Same tree, but declaring Gold: it now fails its OWN claim without anything about it changing.
    writeMember(path.join(siblings, "overclaimer"), { name: "overclaimer", version: "0.1.0", tier: "advanced" });
    writeCatalogue(root, [
      { name: "alpha", version: "0.1.0", source: "./../" + path.basename(siblings) + "/alpha" },
      { name: "overclaimer", version: "0.1.0", source: { source: "url", url: "https://x/overclaimer.git", sha: "p" } },
    ]);
    const r = evaluateMarketplace(root, { searchRoots: [siblings] });
    assert.equal(r.verdict, "red");
    assert.equal(marketplaceExitCode(r), 1);
    assert.deepEqual(r.summary.failingMembers, ["overclaimer"]);
    // No COLLECTION-level error was raised: the red comes purely from a member's own verdict, which is
    // what "self-consistency worst-member" means and is why the report must make the source obvious.
    assert.equal(r.summary.errors, 0);
    assert.match(formatMarketplaceReport(r), /FAILS OWN CLAIM] overclaimer/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("aggregation: an UNRESOLVABLE entry reds the collection even when every resolved member is green", () => {
  const root = tmp();
  const siblings = tmp();
  try {
    writeMember(path.join(siblings, "alpha"), { name: "alpha", version: "0.1.0" });
    writeCatalogue(root, [
      { name: "alpha", version: "0.1.0", source: { source: "url", url: "https://x/alpha.git", sha: "p" } },
      { name: "dead", version: "1.0.0", source: "./members/renamed-away" },
    ]);
    const r = evaluateMarketplace(root, { searchRoots: [siblings] });
    assert.equal(r.verdict, "red");
    assert.equal(r.coverage.unresolvable, 1);
    const resolvability = r.findings.filter((f) => f.check === MARKETPLACE_CHECKS.RESOLVABILITY);
    assert.equal(resolvability.length, 1);
    assert.equal(resolvability[0].severity, "error");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("aggregation: a member ABSENT from this machine does NOT red - it is an environment gap, and coverage says so", () => {
  const root = tmp();
  const siblings = tmp();
  try {
    writeMember(path.join(siblings, "alpha"), { name: "alpha", version: "0.1.0" });
    writeCatalogue(root, [
      { name: "alpha", version: "0.1.0", source: { source: "url", url: "https://x/alpha.git", sha: "p" } },
      { name: "never-cloned", version: "1.0.0", source: { source: "url", url: "https://x/never-cloned.git", sha: "p" } },
    ]);
    const r = evaluateMarketplace(root, { searchRoots: [siblings] });
    assert.equal(r.verdict, "green", "reddening this would train a maintainer to ignore the red");
    assert.equal(marketplaceExitCode(r), 0);
    assert.deepEqual(r.coverage, { graded: 1, total: 2, notGraded: 1, unresolvable: 0 });
    assert.match(formatMarketplaceReport(r), /graded 1 of 2 member\(s\), 1 not graded/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("aggregation: the three seeded cross-member defects produce exactly those three findings", () => {
  const root = tmp();
  const siblings = tmp();
  try {
    const a = writeMember(path.join(siblings, "alpha"), { name: "alpha", version: "0.1.0" });
    const b = writeMember(path.join(siblings, "beta"), { name: "beta", version: "0.1.0" });
    // A colliding skill directory in the UNION (each member is fine alone).
    for (const m of [a, b]) {
      mkdirSync(path.join(m, "skills", "collide"), { recursive: true });
      writeFileSync(path.join(m, "skills", "collide", "SKILL.md"), "---\nname: collide\ndescription: A colliding skill used to prove the union is where the defect lives.\n---\n\n# collide\n");
    }
    writeCatalogue(root, [
      // Version disagreement: the entry says 0.9.9, the member's library.json says 0.1.0.
      { name: "alpha", version: "0.9.9", source: { source: "url", url: "https://x/alpha.git", sha: "p" } },
      { name: "beta", version: "0.1.0", source: { source: "url", url: "https://x/beta.git", sha: "p" } },
      // Dead entry.
      { name: "ghost", version: "1.0.0", source: "./members/ghost" },
    ]);
    const r = evaluateMarketplace(root, { searchRoots: [siblings] });
    const kinds = r.findings.map((f) => f.check);
    assert.ok(kinds.includes(MARKETPLACE_CHECKS.SKILL_COLLISION), "cross-member skill collision");
    assert.ok(kinds.includes(MARKETPLACE_CHECKS.VERSION_AGREEMENT), "registry-vs-member version disagreement");
    assert.ok(kinds.includes(MARKETPLACE_CHECKS.RESOLVABILITY), "unresolvable entry");
    assert.equal(r.verdict, "red");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("evaluate() routes a catalogue to marketplace scope and leaves plugin/component scope untouched", () => {
  const root = tmp();
  const siblings = tmp();
  try {
    writeMember(path.join(siblings, "alpha"), { name: "alpha", version: "0.1.0" });
    writeCatalogue(root, [{ name: "alpha", version: "0.1.0", source: { source: "url", url: "https://x/alpha.git", sha: "p" } }]);
    assert.equal(evaluate(root).scope, "marketplace");
    assert.equal(evaluate(SEED).scope, "plugin", "a plugin's scope must not move");
    assert.equal(evaluate(path.join(REPO_ROOT, "skills", "askit-decision")).scope, "component", "a component's scope must not move");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("a member's own verdict is IDENTICAL whether it is graded alone or as part of a collection", () => {
  // The governing invariant of the release, asserted rather than asserted-in-prose: marketplace scope
  // aggregates verdicts the gate already computes and introduces no new per-member semantics.
  //
  // The comparison is against runGate + computeTierReport, which is exactly what `check.mjs` runs for a
  // plugin graded on its own, and against evaluate()'s independently-computed tier. It is deliberately
  // NOT against evaluate().summary.errors: that count is every error finding, while a GATE error count
  // is filtered by the declared-tier ceiling. Both are correct for their own question, and asserting
  // they are equal would be comparing two different counting conventions rather than testing anything.
  const root = tmp();
  const siblings = tmp();
  try {
    const member = writeMember(path.join(siblings, "alpha"), { name: "alpha", version: "0.1.0" });
    writeCatalogue(root, [{ name: "alpha", version: "0.1.0", source: { source: "url", url: "https://x/alpha.git", sha: "p" } }]);

    const ctx = loadPlugin(member);
    const aloneGate = runGate(member, ctx);
    const aloneTier = computeTierReport(member, ctx, aloneGate.findings);
    const asMember = evaluateMarketplace(root, { searchRoots: [siblings] }).members[0];

    assert.equal(asMember.earnedTier, aloneTier.tier);
    assert.equal(asMember.declaredTier, ctx.library.data.tier);
    assert.equal(asMember.errors, aloneGate.errorCount);
    assert.equal(asMember.warns, aloneGate.warnCount);
    assert.equal(asMember.exitCode, aloneGate.exitCode);
    assert.equal(asMember.failsOwnClaim, aloneGate.exitCode !== 0);
    // The independently-computed tier from evaluate()'s own pipeline agrees too, so the equality is not
    // an artifact of both sides calling the same function.
    assert.equal(asMember.earnedTier, evaluate(member).tier);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});
