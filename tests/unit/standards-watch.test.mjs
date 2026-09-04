import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  PIN_SCHEMA, PIN_REL, StandardsWatchError, buildReport, diffSurface, emitPin, exitCodeFor,
  extractSurface, gitBlobSha, normalizeBody, readPin, renderAdrDraft, renderReport, reqIdIndex, validatePin,
} from "../../scripts/lib/standards-watch.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LIB = path.join(REPO_ROOT, "scripts/lib/standards-watch.mjs");
const CLI = path.join(REPO_ROOT, "scripts/standards-watch.mjs");

/* ------------------------------------------------------------------------
 * The enforcement proof. The watcher's whole value rests on it proposing and
 * never amending, so "it cannot write" has to be a fact the build checks, not
 * a promise in a doc. If someone adds a write API to either module, this fails.
 * ---------------------------------------------------------------------- */

// Deliberately exhaustive. Each is a real mutation entry point in node:fs or its promises API.
const WRITE_APIS = [
  "writeFileSync", "writeFile", "appendFileSync", "appendFile", "mkdirSync", "mkdir",
  "rmSync", "rm", "rmdirSync", "rmdir", "unlinkSync", "unlink", "renameSync", "rename",
  "copyFileSync", "copyFile", "cpSync", "createWriteStream", "truncateSync", "truncate",
  "writeSync", "openSync", "mkdtempSync", "symlinkSync", "linkSync", "chmodSync", "utimesSync",
];

for (const [label, file] of [["scripts/lib/standards-watch.mjs", LIB], ["scripts/standards-watch.mjs", CLI]]) {
  test(`${label} references no filesystem write API (the watcher proposes, it never amends)`, () => {
    const src = readFileSync(file, "utf8");
    const hits = WRITE_APIS.filter((api) => new RegExp(`\\b${api}\\s*\\(`).test(src));
    assert.deepEqual(hits, [], `${label} would be able to write: ${hits.join(", ")}. The standards watch must be write-incapable; emit to stdout and let a human save it.`);
  });

  test(`${label} imports only read APIs from node:fs`, () => {
    const src = readFileSync(file, "utf8");
    const imports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*"node:fs(?:\/promises)?"/g)]
      .flatMap((m) => m[1].split(",").map((s) => s.trim()).filter(Boolean));
    const bad = imports.filter((n) => !/^(readFileSync|readdirSync|statSync|existsSync|realpathSync)$/.test(n));
    assert.deepEqual(bad, [], `${label} imports non-read fs API: ${bad.join(", ")}`);
  });
}

test("neither module imports child_process (no shelling out to a writer either)", () => {
  for (const file of [LIB, CLI]) {
    assert.ok(!/node:child_process/.test(readFileSync(file, "utf8")), `${file} imports child_process`);
  }
});

/* ------------------------------------------------------------- primitives */

test("gitBlobSha reproduces `git hash-object` exactly (a pin is verifiable by hand)", () => {
  // `printf 'hello\n' | git hash-object --stdin`
  assert.equal(gitBlobSha(Buffer.from("hello\n")), "ce013625030ba8dba906f756967f9e9ca394464a");
  // The empty blob, the one hash everyone can check from memory.
  assert.equal(gitBlobSha(Buffer.from("")), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
});

test("normalizeBody absorbs line-ending and trailing-whitespace churn, nothing more", () => {
  assert.equal(normalizeBody("a  \r\nb\r\n\n"), "a\nb");
  assert.notEqual(normalizeBody("a b"), normalizeBody("a  b"), "interior wording changes must still register");
});

/* -------------------------------------------------------------- fixtures */

const TREE = [
  "skill-name/",
  "├── SKILL.md          # Required: metadata + instructions",
  "├── scripts/          # Optional: executable code",
  "├── references/       # Optional: documentation",
  "└── ...               # Any additional files",
].join("\n");

function spec({ fields, tree = TREE, extraSection = "", nameBody = "Must be 1-64 characters" } = {}) {
  const rows = fields.map((f) => `| \`${f.field}\` | ${f.required} | ${f.constraints} |`).join("\n");
  return `---
title: "Specification"
---

## Directory structure

A skill is a directory containing a \`SKILL.md\`:

\`\`\`
${tree}
\`\`\`

## \`SKILL.md\` format

### Frontmatter

| Field | Required | Constraints |
|-------|----------|-------------|
${rows}

#### \`name\` field

${nameBody}
${extraSection}
## Validation

Use skills-ref.
`;
}

const BASE_FIELDS = [
  { field: "name", required: "Yes", constraints: "Max 64 characters." },
  { field: "description", required: "Yes", constraints: "Max 1024 characters." },
  { field: "license", required: "No", constraints: "License name." },
];

const BASE = extractSurface(spec({ fields: BASE_FIELDS }));

const PIN = {
  schema: PIN_SCHEMA,
  upstream: { id: "agentskills.io", repo: "https://github.com/agentskills/agentskills" },
  verified: { date: "2026-01-01" },
  artifacts: [{ path: "docs/specification.mdx", role: "normative-prose", rawUrl: "https://example.invalid/spec.mdx", blobSha: "0".repeat(40), structural: true, touches: ["U3", "U4"] }],
  touches: { fields: { name: ["U3", "U4"], description: ["U3", "U5"], license: ["U3"] }, directories: { "references/": ["U6"] }, sections: { "#### `name` field": ["U3", "U4"] } },
  surface: BASE,
};

/* ------------------------------------------------------------ extraction */

test("extractSurface reads the frontmatter contract, the component inventory, and per-section hashes", () => {
  assert.deepEqual(BASE.frontmatterFields.map((f) => f.field), ["description", "license", "name"]);
  assert.equal(BASE.frontmatterFields.find((f) => f.field === "name").required, true);
  assert.equal(BASE.frontmatterFields.find((f) => f.field === "license").required, false);
  assert.deepEqual(BASE.directories.map((d) => d.entry), ["SKILL.md", "references/", "scripts/"]);
  assert.equal(BASE.directories.find((d) => d.entry === "SKILL.md").required, true);
  assert.equal(BASE.directories.find((d) => d.entry === "scripts/").required, false);
  assert.ok(BASE.sections.some((s) => s.key === "#### `name` field"));
});

test("extraction REFUSES rather than reporting a clean surface when the field table is gone", () => {
  const noTable = spec({ fields: BASE_FIELDS }).replace(/\| Field \| Required \| Constraints \|[\s\S]*?\n\n/, "The fields are now described in prose.\n\n");
  assert.throws(() => extractSurface(noTable), (e) => e instanceof StandardsWatchError && e.code === "extraction-failed");
});

test("extraction REFUSES when the table columns are renamed (a silent parse would be the worst failure)", () => {
  const renamed = spec({ fields: BASE_FIELDS }).replace("| Field | Required | Constraints |", "| Key | Mandatory | Rules |");
  assert.throws(() => extractSurface(renamed), (e) => e instanceof StandardsWatchError && e.code === "extraction-failed");
});

test("extraction REFUSES when the directory-structure section disappears", () => {
  const gone = spec({ fields: BASE_FIELDS }).replace("## Directory structure", "## Layout notes");
  assert.throws(() => extractSurface(gone), (e) => e instanceof StandardsWatchError && e.code === "extraction-failed");
});

test("extraction REFUSES on an empty document", () => {
  assert.throws(() => extractSurface("   "), (e) => e instanceof StandardsWatchError && e.code === "extraction-failed");
});

/* ------------------------------------------------------------------ diff */

const kinds = (list) => list.map((d) => `${d.kind}:${d.subject}`).sort();

test("an added frontmatter field is material", () => {
  const next = extractSurface(spec({ fields: [...BASE_FIELDS, { field: "schema-version", required: "Yes", constraints: "Must be 1." }] }));
  const d = diffSurface(BASE, next, PIN, ["U3", "U4"]);
  assert.ok(kinds(d.material).includes("field-added:schema-version"));
});

test("a required-flag flip is material", () => {
  const next = extractSurface(spec({ fields: BASE_FIELDS.map((f) => (f.field === "license" ? { ...f, required: "Yes" } : f)) }));
  const d = diffSurface(BASE, next, PIN, ["U3"]);
  assert.deepEqual(kinds(d.material), ["field-required-changed:license"]);
});

test("a constraint rewording is material (a constraint is what a check encodes)", () => {
  const next = extractSurface(spec({ fields: BASE_FIELDS.map((f) => (f.field === "name" ? { ...f, constraints: "Max 32 characters." } : f)) }));
  const d = diffSurface(BASE, next, PIN, ["U3"]);
  assert.deepEqual(kinds(d.material), ["field-constraint-changed:name"]);
  assert.deepEqual(d.material[0].touches, ["U3", "U4"]);
});

test("a removed field is material", () => {
  const next = extractSurface(spec({ fields: BASE_FIELDS.filter((f) => f.field !== "license") }));
  const d = diffSurface(BASE, next, PIN, ["U3"]);
  assert.deepEqual(kinds(d.material), ["field-removed:license"]);
});

test("a new component directory is material and is reported as covered by no check", () => {
  const tree = TREE.replace("└── ...", "├── evals/            # Required: eval set\n└── ...");
  const next = extractSurface(spec({ fields: BASE_FIELDS, tree }));
  const d = diffSurface(BASE, next, PIN, ["U3", "U4"]);
  const added = d.material.find((x) => x.kind === "directory-added");
  assert.equal(added.subject, "evals/");
  assert.deepEqual(added.touches, [], "a brand new upstream concept lands on no check; it must not inherit the artifact default");
});

test("a new section is material and inherits no spurious impacts", () => {
  const next = extractSurface(spec({ fields: BASE_FIELDS, extraSection: "\n## Signing\n\nSkills may be signed.\n" }));
  const d = diffSurface(BASE, next, PIN, ["U3", "U4"]);
  const added = d.material.find((x) => x.kind === "section-added");
  assert.equal(added.subject, "## Signing");
  assert.deepEqual(added.touches, []);
});

test("a prose change inside an unchanged section is REVIEW, never classified as material", () => {
  const next = extractSurface(spec({ fields: BASE_FIELDS, nameBody: "Must be 1-64 characters and may contain digits" }));
  const d = diffSurface(BASE, next, PIN, ["U3"]);
  assert.deepEqual(d.material, [], "the tool must not decide whether reworded prose is normative");
  assert.deepEqual(kinds(d.review), ["section-body-changed:#### `name` field"]);
  assert.deepEqual(d.review[0].touches, ["U3", "U4"]);
});

test("an identical surface produces no deltas at all", () => {
  const d = diffSurface(BASE, extractSurface(spec({ fields: BASE_FIELDS })), PIN, ["U3"]);
  assert.deepEqual([...d.material, ...d.review], []);
});

/* ----------------------------------------------------------------- report */

const asObserved = (text) => new Map([["docs/specification.mdx", { bytes: Buffer.from(text, "utf8"), text }]]);

test("an unchanged blob short-circuits to verdict unchanged and exit 0", () => {
  const text = spec({ fields: BASE_FIELDS });
  const pin = { ...PIN, artifacts: [{ ...PIN.artifacts[0], blobSha: gitBlobSha(Buffer.from(text, "utf8")) }] };
  const report = buildReport({ root: REPO_ROOT, pin, observed: asObserved(text) });
  assert.equal(report.verdict, "unchanged");
  assert.equal(exitCodeFor(report), 0);
});

test("bytes that move without moving the surface are reported as cosmetic, not as a change to act on", () => {
  const text = spec({ fields: BASE_FIELDS }).replace('title: "Specification"', 'title: "Specification "');
  const report = buildReport({ root: REPO_ROOT, pin: PIN, observed: asObserved(text) });
  assert.equal(report.verdict, "cosmetic-only");
  assert.equal(exitCodeFor(report), 0);
  assert.equal(report.cosmetic.length, 1);
});

test("a material change sets verdict material-change, exit 1, and resolves the checks it lands on", () => {
  const text = spec({ fields: BASE_FIELDS.map((f) => (f.field === "name" ? { ...f, constraints: "Max 32 characters." } : f)) });
  const report = buildReport({ root: REPO_ROOT, pin: PIN, observed: asObserved(text) });
  assert.equal(report.verdict, "material-change");
  assert.equal(exitCodeFor(report), 1);
  assert.deepEqual(report.impacts.map((i) => i.reqId).sort(), ["U3", "U4"]);
  assert.match(report.impacts.find((i) => i.reqId === "U3").module, /frontmatter-valid\.mjs/);
});

test("a non-structural artifact is escalated whole, never parsed", () => {
  const pin = {
    ...PIN,
    artifacts: [...PIN.artifacts, { path: "skills-ref/src/skills_ref/validator.py", role: "reference-implementation", rawUrl: "https://example.invalid/v.py", blobSha: "1".repeat(40), structural: false, touches: ["U3"] }],
  };
  const text = spec({ fields: BASE_FIELDS });
  const observed = asObserved(text);
  observed.set("docs/specification.mdx", { bytes: Buffer.from(text, "utf8"), text });
  observed.set("skills-ref/src/skills_ref/validator.py", { bytes: Buffer.from("MAX_NAME = 64\n"), text: "MAX_NAME = 64\n" });
  const report = buildReport({ root: REPO_ROOT, pin, observed });
  const esc = report.review.find((r) => r.kind === "artifact-changed");
  assert.ok(esc, "a changed reference implementation must be escalated");
  assert.match(esc.detail, /does not parse it/);
});

test("a partial fetch REFUSES; a missing artifact can never read as no change", () => {
  assert.throws(
    () => buildReport({ root: REPO_ROOT, pin: PIN, observed: new Map() }),
    (e) => e instanceof StandardsWatchError && e.code === "fetch-incomplete",
  );
});

test("a structural artifact with no recorded surface REFUSES instead of diffing against nothing", () => {
  const pin = { ...PIN, surface: undefined };
  assert.throws(
    () => buildReport({ root: REPO_ROOT, pin, observed: asObserved(spec({ fields: BASE_FIELDS })) }),
    (e) => e instanceof StandardsWatchError && e.code === "bad-pin",
  );
});

test("every report restates its limits, so a machine consumer cannot mistake it for a verdict", () => {
  const report = buildReport({ root: REPO_ROOT, pin: PIN, observed: asObserved(spec({ fields: BASE_FIELDS })) });
  assert.equal(report.limits.length, 3);
  assert.ok(report.limits.some((l) => /never classified|not classified/i.test(l)));
  assert.match(renderReport(report), /Limits/);
});

/* -------------------------------------------------------------- pin shape */

test("validatePin refuses an unknown schema, a missing blobSha, and a missing rawUrl", () => {
  assert.throws(() => validatePin({ ...PIN, schema: "something/9" }), /schema/);
  assert.throws(() => validatePin({ ...PIN, artifacts: [{ path: "a", rawUrl: "u" }] }), /blobSha/);
  assert.throws(() => validatePin({ ...PIN, artifacts: [{ path: "a", blobSha: "0".repeat(40) }] }), /rawUrl/);
  assert.throws(() => validatePin({ ...PIN, artifacts: [] }), /no artifacts/);
});

test("readPin refuses loudly when no pin exists (the pre-existing state this skill closes)", () => {
  assert.throws(
    () => readPin(REPO_ROOT, "foundation/claims/does-not-exist.json"),
    (e) => e instanceof StandardsWatchError && e.code === "no-pin",
  );
});

test("the committed pin validates and records a real surface", () => {
  const pin = readPin(REPO_ROOT, PIN_REL);
  assert.equal(pin.schema, PIN_SCHEMA);
  assert.ok(pin.surface.frontmatterFields.length >= 6, "the upstream field contract has at least name/description/license/compatibility/metadata/allowed-tools");
  assert.ok(pin.surface.frontmatterFields.find((f) => f.field === "name").required === true);
  assert.ok(pin.surface.directories.some((d) => d.entry === "references/"));
  assert.ok(pin.surface.sections.length >= 10);
  assert.equal(pin.upstream.declaresOwnVersion, false, "the upstream publishes no version; the pin is content-addressed for that reason");
  for (const a of pin.artifacts) assert.match(a.rawUrl, /^https:\/\/raw\.githubusercontent\.com\/agentskills\/agentskills\//);
});

test("emitPin returns a proposed document and mutates nothing", () => {
  const text = spec({ fields: BASE_FIELDS });
  const before = JSON.stringify(PIN);
  const next = emitPin(PIN, asObserved(text), { date: "2026-02-02", by: "tester" });
  assert.equal(JSON.stringify(PIN), before, "the input pin must be untouched");
  assert.equal(next.artifacts[0].blobSha, gitBlobSha(Buffer.from(text, "utf8")));
  assert.equal(next.verified.date, "2026-02-02");
  assert.deepEqual(next.touches, PIN.touches, "human-authored mapping survives a re-pin");
});

test("emitPin drops a repoHeadSha it was not given rather than inheriting the previous one", () => {
  // Backlog E25. `verified` used to be built by spreading the previous block, so a re-pin refreshed
  // every blob SHA while silently carrying the OLD repoHeadSha into a document that now claims to
  // describe a different upstream revision. Observed live 2026-08-11: the proposal offered a
  // 15-day-old HEAD beside a `by` field reading the literal string "unrecorded". This file exists so
  // a reviewer can verify it by hand without trusting the tool, so an unverified fact inside
  // `verified` defeats the file's entire purpose. Omitting is safe; inheriting is not.
  const text = spec({ fields: BASE_FIELDS });
  const stale = structuredClone(PIN);
  stale.verified = { ...(stale.verified ?? {}), repoHeadSha: "0000000000000000000000000000000000000000" };

  const withoutHead = emitPin(stale, asObserved(text), { date: "2026-02-02", by: "tester" });
  assert.equal(
    withoutHead.verified.repoHeadSha,
    undefined,
    "a repoHeadSha the caller did not supply must not survive into the emitted pin"
  );

  const withHead = emitPin(stale, asObserved(text), { date: "2026-02-02", by: "tester", repoHeadSha: "abc123" });
  assert.equal(withHead.verified.repoHeadSha, "abc123", "a supplied repoHeadSha is recorded");
});

test("emitPin drops a stale lastUpstreamCommit when the artifact's bytes moved", () => {
  // Raised by adversarial review on the v1.10.1 release branch, and it is the same defect as the
  // repoHeadSha one directly above, one field over. `lastUpstreamCommit` says WHICH upstream commit
  // produced the pinned bytes. Once `blobSha` moves, the old commit no longer explains the content,
  // so an offline reviewer following the pin is sent to the wrong diff. Observed on the real re-pin:
  // the proposal would have kept 6868401b (2026-05-16) beside freshly fetched bytes whose change
  // actually arrived in 217be548 (2026-08-04).
  const changed = spec({ fields: [...BASE_FIELDS, { name: "extra", required: "No", description: "a new field" }] });
  const withStaleProvenance = structuredClone(PIN);
  withStaleProvenance.artifacts[0].lastUpstreamCommit = { sha: "deadbeef", date: "2020-01-01", subject: "old" };

  const dropped = emitPin(withStaleProvenance, asObserved(changed), { date: "2026-02-02", by: "tester" });
  assert.notEqual(dropped.artifacts[0].blobSha, withStaleProvenance.artifacts[0].blobSha, "precondition: the blob moved");
  assert.equal(
    dropped.artifacts[0].lastUpstreamCommit,
    undefined,
    "provenance the run could not establish must be dropped, not inherited"
  );

  const supplied = { sha: "abc1234", date: "2026-02-01", subject: "the commit that actually moved it" };
  const refreshed = emitPin(withStaleProvenance, asObserved(changed), {
    date: "2026-02-02",
    by: "tester",
    artifactCommits: { [PIN.artifacts[0].path]: supplied },
  });
  assert.deepEqual(refreshed.artifacts[0].lastUpstreamCommit, supplied, "supplied provenance is recorded");
});

test("emitPin keeps lastUpstreamCommit when the artifact's bytes did NOT move", () => {
  // The converse guard: an unchanged artifact's provenance is still accurate, so dropping it would
  // throw away a verified fact for no reason.
  const same = spec({ fields: BASE_FIELDS });
  const withProvenance = structuredClone(PIN);
  const provenance = { sha: "cafe123", date: "2026-01-01", subject: "still current" };
  withProvenance.artifacts[0].lastUpstreamCommit = provenance;
  withProvenance.artifacts[0].blobSha = gitBlobSha(Buffer.from(same, "utf8"));

  const next = emitPin(withProvenance, asObserved(same), { date: "2026-02-02", by: "tester" });
  assert.deepEqual(next.artifacts[0].lastUpstreamCommit, provenance, "unchanged bytes keep their provenance");
});

/* -------------------------------------------------------------- reqId join */

test("reqIdIndex reads the existing reference table rather than restating the mapping", () => {
  const index = reqIdIndex(REPO_ROOT);
  const u6 = index.get("U6");
  assert.match(u6.module, /reference-links\.mjs/);
  assert.match(u6.standardSection, /sec 3\.1/);
  assert.equal(u6.tier, "universal", "tier comes from the check module's own meta, not from the doc");
  assert.ok(["objective", "vendor-cited", "house"].includes(u6.provenance));
});

test("reqIdIndex refuses if the reference table it reads is not there", () => {
  assert.throws(
    () => reqIdIndex(path.join(REPO_ROOT, "tests")),
    (e) => e instanceof StandardsWatchError && e.code === "no-check-reference",
  );
});

/* --------------------------------------------------------------- ADR draft */

test("the ADR draft is a Proposed MADR skeleton with the judgment left to a human", () => {
  const text = spec({ fields: [...BASE_FIELDS, { field: "schema-version", required: "Yes", constraints: "Must be 1." }] });
  const adr = renderAdrDraft(buildReport({ root: REPO_ROOT, pin: PIN, observed: asObserved(text) }), { number: "0099" });
  assert.match(adr, /^# 0099 - /);
  assert.match(adr, /^## TL;DR$/m, "docs-presence (G10) requires every ADR to carry a TL;DR");
  assert.match(adr, /- \*\*Status:\*\* Proposed$/m);
  assert.match(adr, /sec 7\.7/, "the burndown policy must be named in the draft");
  assert.match(adr, /field-added/);
  const todo = (adr.match(/TO BE COMPLETED/g) ?? []).length;
  assert.ok(todo >= 4, `expected the judgment sections to be left explicitly open, found ${todo}`);
});

/* ------------------------------------------------------------------------
 * RS-F3: the watch is SCHEDULED, not merely available.
 *
 * `npm run standards-watch` worked for several releases and nothing ran it -
 * no cron, no workflow, one roadmap row as the only surface that remembered
 * it existed - while its twin `vendor-watch` had been on a monthly schedule
 * since v1.14.0. These assert the properties that make the difference, so a
 * later edit cannot quietly return this to an aspiration.
 * ---------------------------------------------------------------------- */

const WF = path.join(REPO_ROOT, ".github/workflows/standards-watch.yml");

test("RS-F3: standards-watch runs on a cron, OFFSET from vendor-watch's day", () => {
  const doc = parseYaml(readFileSync(WF, "utf8"));
  // `on` is the YAML 1.1 boolean `true`; the parser may key it either way depending on version.
  const triggers = doc.on ?? doc[true];
  const crons = (triggers.schedule ?? []).map((s) => s.cron);
  assert.deepEqual(crons, ["0 7 15 * *"], "the schedule is the whole point of this item");
  assert.ok("workflow_dispatch" in triggers, "a watch nobody can run by hand cannot be demonstrated");

  const vendorCrons = ((parseYaml(readFileSync(path.join(REPO_ROOT, ".github/workflows/vendor-watch.yml"), "utf8")).on ?? {}).schedule ?? [])
    .map((s) => s.cron);
  assert.ok(vendorCrons.length > 0, "vendor-watch's cron is the thing this one is offset FROM; it is gone");
  const day = (c) => c.split(" ")[2];
  assert.notEqual(day(crons[0]), day(vendorCrons[0]),
    "the two watches must straddle the month, so one runner outage cannot blank both");
});

test("RS-F3: the watch can open an issue, and cannot edit anything", () => {
  const doc = parseYaml(readFileSync(WF, "utf8"));
  assert.equal(doc.permissions?.["issues"], "write", "it reports by opening an issue");
  assert.equal(doc.permissions?.["contents"], "read",
    "deciding what an upstream change MEANS is an ADR, not a commit a robot makes at 07:00");
});

test("RS-F3: a non-zero exit opens an issue, and exit 2 is NOT treated as a pass", () => {
  const text = readFileSync(WF, "utf8");
  const doc = parseYaml(text);
  const issueStep = doc.jobs.watch.steps.find((s) => String(s.uses ?? "").startsWith("actions/github-script"));
  assert.ok(issueStep, "no github-script step, so nothing opens an issue");
  assert.match(String(issueStep.if), /outputs\.exit != '0'/,
    "the condition must fire on ANY non-zero exit; a run that could not verify proved nothing and is not a pass");
  assert.match(text, /refused = exit === '2'/, "the refusal case must be distinguishable in the issue it opens");
});

test("RS-F3: the scheduled watcher deduplicates on something that EXISTS", () => {
  // The exact trap vendor-watch shipped with and W2-H4 caught there: dedup was implemented as a
  // `labels:` filter naming a label that had never been provisioned on this repository. A label filter
  // matching a nonexistent label matches nothing, so every monthly run would have opened a fresh issue
  // while the comment beside it claimed the opposite. This file is a clone of that one; the correction
  // has to be cloned with it, and asserted, or the bug comes back with the shape.
  const text = readFileSync(WF, "utf8");
  assert.match(text, /askit:standards-watch/, "the dedup marker must be written into the issue body");
  assert.doesNotMatch(text, /listForRepo,?\s*\{[^}]*labels:/,
    "dedup must not depend on a label: it can be absent, renamed, or stripped during triage");
  assert.match(text, /^concurrency:/m, "a manual dispatch during the scheduled run would double-open");
});

test("RS-F3: the two watches do not share a dedup marker, or each would silence the other", () => {
  const mine = readFileSync(WF, "utf8").match(/askit:[a-z-]+/g) ?? [];
  const theirs = readFileSync(path.join(REPO_ROOT, ".github/workflows/vendor-watch.yml"), "utf8").match(/askit:[a-z-]+/g) ?? [];
  assert.ok(mine.length > 0 && theirs.length > 0);
  assert.equal(new Set(mine).size, 1);
  assert.equal(new Set(theirs).size, 1);
  assert.notEqual(mine[0], theirs[0],
    `both watches match on ${mine[0]}, so whichever ran second would comment on the other's issue instead of opening its own`);
});

test("RS-F3: standards-watch does NOT gate release-ready yet, and says why in as many words", () => {
  // Decision queue 8, ruled 2026-08-31: cron and issues now, no release gate yet. Asserted rather than
  // trusted, because "we decided not to yet" is exactly the kind of decision that gets quietly reversed
  // by someone tidying up the gate list. The revisit trigger has to survive with it or the deferral
  // becomes permanent by default.
  const ids = GATES_IDS();
  assert.ok(!ids.includes("standards-watch"),
    "gating a tag on somebody else's release cadence is a stale-by-date blocker whose remedy may not exist on the day it fires");
  const text = readFileSync(WF, "utf8");
  assert.match(text, /NO RELEASE GATE, DELIBERATELY/, "the decision must be recorded where the next editor will read it");
  assert.match(text, /REVISIT TRIGGER/, "a deferral with no revisit trigger is a permanent excuse");
  assert.match(text, /E58/, "the revisit must be filed somewhere with an owner, not just commented");
});

/** The release-ready gate ids, read at call time so this file does not import the gate list at module load. */
function GATES_IDS() {
  const text = readFileSync(path.join(REPO_ROOT, "scripts/lib/release-ready.mjs"), "utf8");
  return [...text.matchAll(/^\s*id:\s*"([^"]+)"/gm)].map((m) => m[1]);
}
