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
  readGitRemote,
  remoteMatchesSource,
  normalizeRemote,
  findGitRoot,
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
import { PLUGIN_SURFACES } from "../../scripts/lib/marketplace/evaluate-marketplace.mjs";

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

test("classifySource: the `command` kind (Claude Code v2.1.229+) is accepted and carries its command", () => {
  // The one verified false-FAIL this repository's own gate had: a valid marketplace shipping a
  // `command` entry fell to the default branch, and per ADR 0039 a rejection here reds the whole
  // collection. Accepting the kind is what closes it.
  const r = classifySource({ source: "command", command: "npx make-plugin --out ." });
  assert.equal(r.kind, "command");
  assert.equal(r.command, "npx make-plugin --out .");
  assert.equal(r.reason, null);
  assert.equal(pinShaOf(r), null, "a command source has no artifact to digest, so it carries no pin - the npm shape");
});

test("classifySource: a `command` entry with no command field still REDS, with a kind-specific reason", () => {
  // Proven able to fail: accepting the kind must not accept a malformed entry of that kind.
  for (const bad of [{ source: "command" }, { source: "command", command: "" }, { source: "command", command: "   " }]) {
    const r = classifySource(bad);
    assert.equal(r.kind, null, `expected rejection for ${JSON.stringify(bad)}`);
    assert.match(r.reason, /source kind "command" requires a non-empty "command"/);
  }
});

test("collection: a catalogue carrying a `command` entry is NOT red - the appendix-A reproduction", () => {
  // AC1's end-to-end half, which the classifySource() unit tests above do not reach. The defect this
  // closes did not manifest at the function; it manifested at the COLLECTION, because ADR 0039 makes a
  // source rejection red the whole catalogue. An adversarial review of this cut found the unit tests
  // covered the function and left this path uncovered, so a regression anywhere between classifySource
  // and the collection report would have passed the suite.
  //
  // The catalogue holds ONLY the command entry on purpose: a second member would raise findings of its
  // own (identity confirmation), and an assertion that counted those would pass or fail for reasons
  // that have nothing to do with the source kind under test. The first draft of this test did exactly
  // that and failed on an unrelated warning.
  const root = tmp();
  try {
    writeCatalogue(root, [
      { name: "built", version: "0.1.0", source: { source: "command", command: "npx make-plugin --out ." } },
    ]);
    const r = evaluateMarketplace(root, { searchRoots: [] });

    assert.deepEqual(r.findings, [], "a well-formed `command` entry raises no collection finding at all");

    const built = r.members.find((m) => m.name === "built");
    assert.ok(built, "the command-sourced entry still appears in the member ledger");
    assert.doesNotMatch(
      built.reason ?? "",
      /unknown source kind/,
      "before this fix the entry read as an unknown kind, which per ADR 0039 reds the whole collection",
    );
    assert.match(
      built.reason ?? "",
      /not locally resolvable/,
      "a command source is well-formed but not locally resolvable - the npm shape, not the archive shape",
    );
    assert.equal(built.pinSha ?? null, null, "a command source has no artifact to digest, so it carries no pin");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("classifySource: a typo'd kind still reds, and now lists `command` among the known kinds", () => {
  // The known-kinds reason string is derived from SOURCE_KINDS rather than hand-written, so this
  // asserts the user-facing text stopped understating the vendor's schema.
  const r = classifySource({ source: "comand", command: "npx make-plugin" });
  assert.equal(r.kind, null);
  assert.match(r.reason, /unknown source kind/);
  assert.match(r.reason, /command/, "the known-kinds list must name the kind the author nearly typed");
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

test("pinShaOf: url/github/git-subdir report sha, archive reports its digest, npm/command and local report none", () => {
  assert.equal(pinShaOf({ kind: "url", sha: "a1" }), "a1");
  assert.equal(pinShaOf({ kind: "archive", sha256: "d1" }), "d1");
  assert.equal(pinShaOf({ kind: "npm" }), null);
  assert.equal(pinShaOf({ kind: "command", command: "npx make-plugin" }), null);
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

test("detectMarketplaceScope: a PLUGIN with an embedded marketplace keeps plugin scope (the anti-pattern must not move a verdict)", () => {
  // A live family member, pm-skills, ships skills/, agents/ and commands/ AND carries a
  // .claude-plugin/marketplace.json whose single entry is a url pointing back at itself. Standard sec 12
  // names that the embedded-marketplace anti-pattern. Without this guard, evaluate() routes that plugin
  // to marketplace scope and grades it as a one-member catalogue of itself - silently moving an existing
  // plugin's verdict, which is the one thing this release's governing invariant forbids. The plugin gate
  // is what should tell a plugin it has committed the anti-pattern.
  const dir = tmp();
  try {
    writeCatalogue(dir, [{ name: "itself", source: { source: "url", url: "https://x/itself.git", sha: "s" } }]);
    assert.equal(detectMarketplaceScope(dir), true, "a bare catalogue is claimed");

    // Any one of these makes it a plugin that ships components, not a catalogue.
    for (const marker of ["skills", "agents", "commands"]) {
      mkdirSync(path.join(dir, marker), { recursive: true });
      assert.equal(detectMarketplaceScope(dir), false, `shipping ${marker}/ must keep plugin scope`);
      rmSync(path.join(dir, marker), { recursive: true, force: true });
    }
    writeFileSync(path.join(dir, "library.json"), '{ "name": "embedded", "version": "0.1.0" }\n');
    assert.equal(detectMarketplaceScope(dir), false, "carrying library.json must keep plugin scope");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("detectMarketplaceScope: a catalogue carrying AGENTS.md is still a catalogue", () => {
  // The guard above is deliberately NOT looksLikePlugin, which accepts a bare AGENTS.md. A catalogue
  // legitimately carries agent guidance for the people maintaining it, and the family marketplace does
  // exactly that - using looksLikePlugin here would decline the scope's primary real-world target.
  const dir = tmp();
  try {
    writeCatalogue(dir, [{ name: "member", source: "./members/member" }]);
    writeFileSync(path.join(dir, "AGENTS.md"), "# agent guidance for maintaining this catalogue\n");
    assert.equal(detectMarketplaceScope(dir), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
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
    const errors = resolvability.filter((f) => f.severity === "error");
    assert.equal(errors.length, 1, "exactly one entry is unresolvable");
    assert.match(errors[0].message, /"dead"/);
    // The temp-dir member is a copied tree with no .git, so its identity cannot be confirmed against
    // the source. That is graded but WARNED about, never silent - see the identity test below.
    assert.ok(resolvability.some((f) => f.severity === "warn" && /identity could not be confirmed/.test(f.message)));
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

// --- Findings from the v1.12.0 pre-release adversarial review ---------------------------------

test("aggregation: a catalogue where NOTHING could be graded is UNKNOWN, never green", () => {
  // Review finding: with every entry not-graded, the collection had zero errors and zero failing
  // members, so it reported GREEN at coverage 0 of N - a pass asserted from no evidence, on a catalogue
  // that may be entirely undeliverable. ADR 0039's "an absent member does not red" is about PARTIAL
  // coverage (three of five cloned is a working catalogue and an incomplete workstation); it does not
  // extend to none.
  const root = tmp();
  const siblings = tmp();
  try {
    writeCatalogue(root, [
      { name: "gone-a", version: "1.0.0", source: { source: "url", url: "https://x/gone-a.git", sha: "p" } },
      { name: "gone-b", version: "1.0.0", source: { source: "url", url: "https://x/gone-b.git", sha: "p" } },
    ]);
    const r = evaluateMarketplace(root, { searchRoots: [siblings] });
    assert.equal(r.verdict, "unknown");
    assert.equal(marketplaceExitCode(r), 1, "unknown must not exit 0; only green does");
    assert.deepEqual(r.coverage, { graded: 0, total: 2, notGraded: 2, unresolvable: 0 });
    assert.match(formatMarketplaceReport(r), /UNKNOWN - this catalogue lists members but NONE of them could be graded/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("aggregation: an EMPTY catalogue is green - nothing listed is not the same as nothing gradeable", () => {
  const root = tmp();
  try {
    writeCatalogue(root, []);
    const r = evaluateMarketplace(root, { searchRoots: [] });
    assert.equal(r.verdict, "green");
    assert.equal(marketplaceExitCode(r), 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("resolution: a guessed candidate that is not a plugin is passed over, not reported as a broken entry", () => {
  // Review finding, both halves: the FIRST existing non-plugin directory short-circuited the search and
  // reported `unresolvable`, so (a) an unrelated same-named directory false-red a catalogue that is
  // fine, and (b) it hid a valid candidate further down the list. A location the catalogue NAMED is a
  // claim whose failure is a defect; a location this code GUESSED is a hypothesis, and a failed
  // hypothesis is absence.
  const root = tmp();
  const first = tmp();
  const second = tmp();
  try {
    mkdirSync(path.join(first, "alpha"), { recursive: true }); // same name, not a plugin
    writeMember(path.join(second, "alpha"), { name: "alpha", version: "0.1.0" });
    writeCatalogue(root, [{ name: "alpha", version: "0.1.0", source: { source: "url", url: "https://x/alpha.git", sha: "p" } }]);

    const r = evaluateMarketplace(root, { searchRoots: [first, second] });
    assert.equal(r.members[0].status, "resolved", "the shadowing directory must not stop the search");
    assert.equal(r.verdict, "green");

    // With ONLY the shadowing directory, it is absence, not a catalogue defect.
    const shadowOnly = evaluateMarketplace(root, { searchRoots: [first] });
    assert.equal(shadowOnly.members[0].status, "not-graded");
    assert.match(shadowOnly.members[0].reason, /exists but is not a plugin/, "the near-miss is named, so it is diagnosable");
  } finally {
    for (const d of [root, first, second]) rmSync(d, { recursive: true, force: true });
  }
});

test("resolution: an EXPLICIT location that is not a plugin IS a broken entry", () => {
  // The other side of the asymmetry: a local-path source and an operator-supplied mapping are claims,
  // not guesses, so their failure stays a catalogue defect and still reds.
  const root = tmp();
  try {
    mkdirSync(path.join(root, "members", "hollow"), { recursive: true });
    writeCatalogue(root, [{ name: "hollow", source: "./members/hollow" }]);
    const byPath = evaluateMarketplace(root, { searchRoots: [] });
    assert.equal(byPath.members[0].status, "unresolvable");
    assert.equal(byPath.verdict, "red");

    writeFileSync(path.join(root, "askit.marketplace.json"), JSON.stringify({ members: { mapped: "./members/hollow" } }));
    writeCatalogue(root, [{ name: "mapped", source: { source: "npm", package: "mapped" } }]);
    const byMap = evaluateMarketplace(root, { searchRoots: [] });
    assert.equal(byMap.members[0].status, "unresolvable", "an operator-supplied mapping is a claim, so its failure is a defect");
    assert.match(byMap.members[0].reason, /exists but is not a plugin/);
    assert.match(byMap.members[0].reason, /hollow/, "the reason names the mapped location, so the operator can see what was tried");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("remoteMatchesSource: disproves a wrong checkout, and accepts what it cannot disprove", () => {
  const url = (u) => ({ kind: "url", url: u });
  assert.equal(remoteMatchesSource("https://github.com/owner/name.git", url("https://github.com/owner/name")), true);
  assert.equal(remoteMatchesSource("git@github.com:owner/name.git", url("https://github.com/owner/name.git")), true);
  assert.equal(remoteMatchesSource("https://github.com/someone-else/name.git", url("https://github.com/owner/name.git")), false);
  // The match is at a PATH BOUNDARY, not a bare suffix. `notgithub.com/owner/name` ends with
  // `github.com/owner/name`, so a plain endsWith would accept a checkout pointing at an entirely
  // different host - the false-green this function exists to prevent, reintroduced by the function.
  assert.equal(remoteMatchesSource("https://notgithub.com/owner/name.git", url("https://github.com/owner/name.git")), false);
  assert.equal(remoteMatchesSource("https://evil-github.com/owner/name", url("https://github.com/owner/name")), false);
  // No prefix allowance survives, because a hostile path prefix reproduces the declared path at a
  // boundary that looks legitimate. A genuine mirror is what the askit.marketplace.json mapping is for:
  // the operator asserting an identity this code cannot establish.
  assert.equal(remoteMatchesSource("https://evil.example/github.com/owner/name.git", url("https://github.com/owner/name")), false);
  assert.equal(remoteMatchesSource("https://git.example.com/mirrors/github.com/owner/name.git", url("https://github.com/owner/name")), false);
  // A port is a transport detail, not a different repository.
  assert.equal(remoteMatchesSource("https://github.com:443/owner/name.git", url("https://github.com/owner/name")), true);
  assert.equal(remoteMatchesSource("ssh://git@github.com:22/owner/name.git", url("git@github.com:owner/name.git")), true);
  // Cannot disprove: no remote readable, or a source kind carrying no URL. Accept rather than discard -
  // the check exists to catch a wrong match, not to require git metadata that may legitimately be absent.
  assert.equal(remoteMatchesSource(null, url("https://github.com/owner/name.git")), true);
  assert.equal(remoteMatchesSource("https://github.com/owner/name.git", { kind: "npm", package: "x" }), true);
  assert.equal(remoteMatchesSource("https://github.com/owner/name", { kind: "github", repo: "owner/name" }), true);
});

// --- Findings from the v1.12.0 pre-release adversarial review, ROUND 2 -------------------------

/** Give `dir` a fake git checkout reporting `remote`, without running git. */
function fakeGitCheckout(dir, remote, sha = "0123456789abcdef0123456789abcdef01234567") {
  const git = path.join(dir, ".git");
  mkdirSync(path.join(git, "refs", "heads"), { recursive: true });
  writeFileSync(path.join(git, "HEAD"), "ref: refs/heads/main\n");
  writeFileSync(path.join(git, "refs", "heads", "main"), `${sha}\n`);
  writeFileSync(path.join(git, "config"), `[core]\n\tbare = false\n[remote "origin"]\n\turl = ${remote}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`);
  return dir;
}

test("resolution: a CONFIRMED candidate beats an unconfirmed one regardless of search order", () => {
  // Round 2 finding: remoteMatchesSource accepts what it cannot disprove, so a same-named plugin with
  // no git metadata was accepted on first sight and shadowed the correct checkout in a later search
  // root. Ranking removes the ordering dependence: identity confirmed always wins.
  const root = tmp();
  const first = tmp();
  const second = tmp();
  try {
    writeMember(path.join(first, "alpha"), { name: "alpha", version: "0.1.0" }); // no .git - unconfirmable
    fakeGitCheckout(writeMember(path.join(second, "alpha"), { name: "alpha", version: "0.1.0" }), "https://github.com/owner/alpha.git");
    writeCatalogue(root, [{ name: "alpha", version: "0.1.0", source: { source: "url", url: "https://github.com/owner/alpha.git", sha: "p" } }]);

    const r = evaluateMarketplace(root, { searchRoots: [first, second] });
    assert.equal(r.members[0].status, "resolved");
    assert.equal(r.members[0].identityConfirmed, true);
    assert.ok(r.members[0].dir.startsWith(second), "the confirmed checkout wins even though it was tried second");
    assert.equal(r.summary.warns, 0, "a confirmed identity raises no doubt warning");
  } finally {
    for (const d of [root, first, second]) rmSync(d, { recursive: true, force: true });
  }
});

test("resolution: a checkout whose remote is a DIFFERENT repository is rejected, not graded", () => {
  const root = tmp();
  const siblings = tmp();
  try {
    fakeGitCheckout(writeMember(path.join(siblings, "alpha"), { name: "alpha" }), "https://github.com/someone-else/alpha.git");
    writeCatalogue(root, [{ name: "alpha", version: "0.1.0", source: { source: "url", url: "https://github.com/owner/alpha.git", sha: "p" } }]);
    const r = evaluateMarketplace(root, { searchRoots: [siblings] });
    assert.equal(r.members[0].status, "not-graded", "a wrong-remote checkout must never be graded in the member's place");
    assert.match(r.members[0].reason, /is not this member's source/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("resolution: an UNCONFIRMED identity is graded but raises a collection warning, never silently", () => {
  const root = tmp();
  const siblings = tmp();
  try {
    writeMember(path.join(siblings, "alpha"), { name: "alpha", version: "0.1.0" }); // no .git at all
    writeCatalogue(root, [{ name: "alpha", version: "0.1.0", source: { source: "url", url: "https://github.com/owner/alpha.git", sha: "p" } }]);
    const r = evaluateMarketplace(root, { searchRoots: [siblings] });
    assert.equal(r.members[0].status, "resolved", "a vendored copy or extracted tarball is still a legitimate checkout");
    assert.equal(r.members[0].identityConfirmed, false);
    assert.equal(r.verdict, "green", "an unconfirmed identity is a doubt, not a defect");
    assert.equal(r.summary.warns, 1, "but the doubt is stated, so no green rests silently on an assumption");
    assert.match(r.findings.find((f) => f.severity === "warn").message, /identity could not be confirmed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("resolution: a git-subdir member reads its remote from the repository ROOT, above the plugin dir", () => {
  // The one source kind whose whole point is that the plugin is NOT at the repository root would
  // otherwise be permanently unverifiable, since <member>/.git does not exist.
  const root = tmp();
  const siblings = tmp();
  try {
    const repo = path.join(siblings, "monorepo");
    mkdirSync(repo, { recursive: true });
    fakeGitCheckout(repo, "https://github.com/owner/monorepo.git");
    writeMember(path.join(repo, "packages", "alpha"), { name: "alpha", version: "0.1.0" });
    writeCatalogue(root, [{ name: "alpha", version: "0.1.0", source: { source: "git-subdir", url: "https://github.com/owner/monorepo.git", path: "packages/alpha" } }]);

    const r = evaluateMarketplace(root, { searchRoots: [siblings] });
    assert.equal(r.members[0].status, "resolved");
    assert.equal(r.members[0].identityConfirmed, true, "identity comes from the repo root, not the subdirectory");
    assert.equal(r.summary.warns, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("detectMarketplaceScope: EVERY plugin component surface keeps plugin scope, not just the first four", () => {
  // Round 2 finding: the guard checked only library.json, skills/, agents/ and commands/, so a plugin
  // carrying AGENTS.md, a native plugin.json and only hook or MCP components was still re-scoped to a
  // catalogue and skipped its own plugin checks entirely.
  // The REAL constant, imported. This test used to keep its own copy, and the copy repeated the
  // same wrong directory name as the source - so it asserted the bypass was closed while it was open.
  const surfaces = PLUGIN_SURFACES;
  // Importing the constant removes the duplication that let the test and the source be wrong the SAME
  // way - but it also makes the sweep below a TAUTOLOGY: "every directory in the list keeps plugin
  // scope" is true of any list, including one naming the wrong directory. A mutation proved exactly
  // that: changing _workflows back to workflows in the source left this test green.
  //
  // So the canonical names are pinned HERE, against the Standard rather than against the constant.
  assert.ok(surfaces.dirs.includes("_workflows"), "the Standard names the workflow directory _workflows (sec 3.6, sec 10.1) and every other module uses that");
  assert.ok(!surfaces.dirs.includes("workflows"), "the un-prefixed name is NOT a component surface; listing it routed a workflow-bearing plugin to marketplace scope, past the whole plugin spine");
  for (const f of surfaces.files) {
    const dir = tmp();
    try {
      writeCatalogue(dir, [{ name: "x", source: { source: "url", url: "https://x/x.git", sha: "s" } }]);
      writeFileSync(path.join(dir, "AGENTS.md"), "# guidance\n");
      assert.equal(detectMarketplaceScope(dir), true, "AGENTS.md alone is still a catalogue");
      const target = path.join(dir, ...f.split("/"));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, "{}\n");
      assert.equal(detectMarketplaceScope(dir), false, `${f} must keep plugin scope`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  for (const d of surfaces.dirs) {
    const dir = tmp();
    try {
      writeCatalogue(dir, [{ name: "x", source: { source: "url", url: "https://x/x.git", sha: "s" } }]);
      mkdirSync(path.join(dir, d), { recursive: true });
      assert.equal(detectMarketplaceScope(dir), false, `${d}/ must keep plugin scope`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test("normalizeRemote: reduces every equivalent spelling to one host and path", () => {
  assert.equal(normalizeRemote("https://github.com/Owner/Name.git"), "github.com/owner/name");
  assert.equal(normalizeRemote("git@github.com:owner/name.git"), "github.com/owner/name");
  assert.equal(normalizeRemote("ssh://git@github.com:22/owner/name"), "github.com/owner/name");
  assert.equal(normalizeRemote("https://user:token@github.com/owner/name/"), "github.com/owner/name");
  assert.equal(normalizeRemote(""), null);
  assert.equal(normalizeRemote(null), null);
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

test("a member's RESTRICTED-FIELD findings are identical whether it is graded alone or as a member (ADR 0045 parity)", () => {
  // ADR 0045 shared the vendor field list between U14 and the marketplace A6 reading so that "a
  // plugin's verdict must not depend on whether it was graded on its own or as a catalogue member".
  // Sharing the field list was not sufficient: the two scopes also have to apply it to the SAME
  // AGENTS. U14 was moved to ctx.agentDocs in v1.13.0 and the member build was left on
  // ctx.subagents, which excludes README.md and underscore-prefixed files.
  //
  // Neither existing test could see it, and that is the reason this one is end-to-end:
  //   - the A6 unit test hand-builds its `members` array, so it never exercises the real member build;
  //   - the verdict-parity test compares tier/errors/warns/exitCode, and A6 is a scope-local WARN
  //     carrying reqId null, so it never enters a member's verdict at all.
  // A test that compares FIELD LISTS passes against this defect. Only comparing FINDINGS catches it.
  const root = tmp();
  const siblings = tmp();
  try {
    const member = writeMember(path.join(siblings, "alpha"), { name: "alpha", version: "0.1.0" });
    mkdirSync(path.join(member, "agents"), { recursive: true });
    // Underscore-prefixed: excluded from registration, loaded by the runtime anyway.
    writeFileSync(
      path.join(member, "agents", "_shadow.md"),
      "---\nname: shadow\ndescription: an agent the plugin does not register and the runtime loads\npermissionMode: bypassPermissions\n---\n\n# shadow\n"
    );
    writeCatalogue(root, [{ name: "alpha", version: "0.1.0", source: { source: "url", url: "https://x/alpha.git", sha: "p" } }]);

    const alone = runGate(member, loadPlugin(member))
      .findings.filter((f) => f.reqId === "U14")
      .map((f) => f.file)
      .sort();
    const asMember = evaluateMarketplace(root, { searchRoots: [siblings] })
      .findings.filter((f) => f.check === MARKETPLACE_CHECKS.AGENT_RESTRICTED_FIELDS)
      .map((f) => f.file)
      .sort();

    assert.deepEqual(
      alone,
      [path.posix.join("agents", "_shadow.md")],
      "U14 must see an underscore-prefixed agent: it reads the RUNTIME list"
    );
    assert.deepEqual(
      asMember,
      alone,
      "the marketplace A6 reading must name the same agent files U14 does; a member built from " +
        "ctx.subagents silently drops README.md and underscore-prefixed files, so the same bytes " +
        "get two different answers depending on how they were graded"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(siblings, { recursive: true, force: true });
  }
});

test("ADR 0051: EVERY marketplace-scope finding carries reqId null, iterating the emitters not a list", () => {
  // The unilateral-remedy test, made mechanical. A marketplace finding may become a numbered spine
  // requirement only if the member named in it can resolve it by editing its OWN repository alone,
  // without reference to any other member and without editing the catalogue. Applied to all eight
  // classes, exactly one passes - and it already graduated, as U14 in v1.13.0 (ADR 0045).
  //
  // The other seven stay scope-local: three are properties of the catalogue's own manifest, one of a
  // catalogue ENTRY, two of a PAIR of members, and one is a two-party disagreement between a catalogue
  // pin and a member's manifest. The spine is a contract each PLUGIN is held to individually, and a
  // requirement it cannot discharge alone is not a requirement.
  //
  // Iterating the EMITTERS rather than a hand-written list is the point: adding a ninth class with a
  // reqId fails here and forces its author to meet ADR 0051 rather than discovering it in review.
  const members = [
    { status: "resolved", dir: "/x/a", entry: entry("a", 0), skillNames: ["dup"], commandNames: ["dup"],
      library: { version: "9.9.9" }, subagents: [], agentDocs: [{ name: "bad", frontmatter: { name: "bad", hooks: {} } }] },
    { status: "resolved", dir: "/x/b", entry: entry("b", 1), skillNames: ["dup"], commandNames: ["dup"],
      library: { version: "0.0.1" }, subagents: [], agentDocs: [] },
  ];
  const entries = [entry("a", 0), entry("a", 1)];

  const produced = [
    ...duplicateCatalogueNames(entries),
    ...renameCollisions(entries),
    ...versionAgreement(members),
    ...skillCollisions(members),
    ...commandCollisions(members),
    ...agentRestrictedFields(members),
  ];
  assert.ok(produced.length >= 4, `the fixtures must actually produce findings (got ${produced.length})`);
  for (const f of produced) {
    assert.equal(f.reqId, null, `a marketplace finding claimed a spine reqId: ${f.check} - ${f.message.slice(0, 80)}`);
  }
});
