import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderMarkdown, renderHtml, deriveCollectionModel } from "../../scripts/lib/report-render.mjs";
import { assertNoDashes, assertSelfContainedHtml, assertSnapshot } from "./_report-asserts.mjs";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const SNAP_DIR = path.join(FIXTURES, "golden/report-render");

/**
 * A FIXED collection report object, not one produced by grading a real catalogue.
 *
 * The renderer is pure over this object, so snapshotting a literal is what makes the golden stable: a
 * snapshot taken from a live catalogue would re-record every time a member released, a pin moved, or a
 * checkout advanced, which is exactly the churn the family marketplace produces (ADR 0039's own evidence
 * table moved twice in five days). The EVALUATOR that produces this shape is covered separately and
 * against real trees in tests/unit/marketplace-scope.test.mjs.
 *
 * It deliberately carries one of every case the report has to render honestly: a member that passes its
 * own claim, one that fails it, one absent from the machine, one whose catalogue entry is broken, an
 * in-sync pin, a diverged pin, a member with Standard debt, and a member with no sha to compare.
 */
const REPORT = {
  scope: "marketplace",
  target: "/repos/example-catalogue",
  catalogue: { name: "example-catalogue", version: "3.4.0", owner: "Example Org", entryCount: 5 },
  verdict: "red",
  coverage: { graded: 3, total: 5, notGraded: 1, unresolvable: 1 },
  members: [
    {
      name: "alpha", index: 0, status: "resolved", dir: "/repos/alpha", relDir: "../alpha", reason: null,
      sourceKind: "url", pinSha: "1111111111111111111111111111111111111111", entryVersion: "1.2.0",
      gradedSha: "1111111111111111111111111111111111111111", renames: [], diverged: false,
      declaredTier: "universal", earnedTier: "universal", standardPin: "0.12",
      errors: 0, warns: 2, standardDebt: 0, exitCode: 0, failsOwnClaim: false, gradingError: null,
    },
    {
      name: "beta", index: 1, status: "resolved", dir: "/repos/beta", relDir: "../beta", reason: null,
      sourceKind: "url", pinSha: "2222222222222222222222222222222222222222", entryVersion: "0.9.0",
      gradedSha: "3333333333333333333333333333333333333333", renames: ["beta-legacy"], diverged: true,
      declaredTier: "advanced", earnedTier: "convergent", standardPin: "0.8",
      errors: 1, warns: 128, standardDebt: 121, exitCode: 1, failsOwnClaim: true, gradingError: null,
    },
    {
      name: "gamma", index: 2, status: "resolved", dir: "/repos/gamma", relDir: "../gamma", reason: null,
      sourceKind: "local-path", pinSha: null, entryVersion: "2.0.0",
      gradedSha: null, renames: [], diverged: false,
      declaredTier: "convergent", earnedTier: "convergent", standardPin: "0.12",
      errors: 0, warns: 0, standardDebt: 0, exitCode: 0, failsOwnClaim: false, gradingError: null,
    },
    {
      name: "delta", index: 3, status: "not-graded", dir: null, relDir: null,
      reason: "no local checkout found for this member (looked in: delta); the entry is well-formed, so this is a gap in this machine, not in the catalogue",
      sourceKind: "url", pinSha: "4444444444444444444444444444444444444444", entryVersion: "5.1.0",
      gradedSha: null, renames: [], diverged: false,
      declaredTier: null, earnedTier: null, standardPin: null,
      errors: 0, warns: 0, standardDebt: 0, exitCode: 0, failsOwnClaim: false, gradingError: null,
    },
    {
      name: "epsilon", index: 4, status: "unresolvable", dir: null, relDir: null,
      reason: 'local source "./members/epsilon" does not exist under /repos/example-catalogue; an installer following this entry gets nothing',
      sourceKind: "local-path", pinSha: null, entryVersion: "1.0.0",
      gradedSha: null, renames: [], diverged: false,
      declaredTier: null, earnedTier: null, standardPin: null,
      errors: 0, warns: 0, standardDebt: 0, exitCode: 0, failsOwnClaim: false, gradingError: null,
    },
  ],
  findings: [
    { check: "marketplace-entry-resolvability", severity: "error", reqId: null, file: ".claude-plugin/marketplace.json", message: 'catalogue entry "epsilon" does not resolve to a member: local source "./members/epsilon" does not exist' },
    { check: "marketplace-skill-collision", severity: "error", reqId: null, file: "skills/review", message: '2 members ship the skill directory "review" (alpha, beta); on any agent that does not namespace components by plugin they occupy one name in a shared pool, and which one wins is undefined' },
    { check: "marketplace-agent-restricted-fields", severity: "warn", reqId: null, file: "agents/runner.md", message: 'beta: agent "runner" declares `hooks`, which Claude Code does not support on a plugin-shipped agent' },
  ],
  summary: { errors: 2, warns: 1, failingMembers: ["beta"], tierDistribution: { universal: 1, convergent: 2 } },
  searchRoots: ["/repos"],
  profile: null,
  mode: null,
  advisory: {
    triggerSurface: [{ a: "alpha/review", b: "beta/review", similarity: 0.812 }],
    commandSkillDivergence: [{ member: "beta", name: "ship" }],
    contentLineage: [{ copies: ["alpha/review", "beta/review"] }],
  },
};

const OPTS = { date: "2026-01-01", exitCode: 1, reportType: "marketplace" };

test("deriveCollectionModel: projects the verdict, coverage and per-member labels without inventing anything", () => {
  const m = deriveCollectionModel(REPORT, OPTS);
  assert.equal(m.subject, "example-catalogue");
  assert.equal(m.verdict, "red");
  assert.deepEqual(m.coverage, { graded: 3, total: 5, notGraded: 1, unresolvable: 1 });
  assert.deepEqual(m.members.map((x) => x.statusLabel), ["OK", "FAILS OWN CLAIM", "OK", "NOT GRADED", "UNRESOLVABLE"]);
  // An undeclared or ungraded member must never be given a tier name it did not earn (ADR 0038).
  assert.equal(m.members[3].declaredName, "none declared");
  assert.equal(m.members[3].earnedName, "-");
});

test("deriveCollectionModel: a report missing its optional blocks still renders rather than throwing", () => {
  const m = deriveCollectionModel({ scope: "marketplace", target: "/x/y", verdict: "green" }, {});
  assert.equal(m.subject, "y");
  assert.deepEqual(m.members, []);
  assert.deepEqual(m.advisory, { triggerSurface: [], commandSkillDivergence: [], contentLineage: [] });
  assert.equal(m.exitCode, 0, "a green collection with no explicit exitCode reads 0");
});

test("collection render: the pin columns are present for EVERY member, including the ones that agree", () => {
  const md = renderMarkdown(REPORT, OPTS);
  // alpha's pin and graded sha are identical; the row must still carry both plus an explicit "in sync",
  // because a report that shows them only on disagreement teaches a reader to assume agreement from
  // silence (ADR 0039 question 1, and the ADR 0038 failure it generalizes).
  assert.match(md, /\| alpha \| OK \|.*\| 1111111 \| 1111111 \| in sync \|/);
  assert.match(md, /\| beta \| FAILS OWN CLAIM \|.*\| 2222222 \| 3333333 \| DIVERGED \|/);
  // gamma has no sha on either side: "not comparable" is stated rather than left blank or called in-sync.
  assert.match(md, /\| gamma \| OK \|.*\| - \| - \| not comparable \|/);
});

test("collection render: coverage and the local-checkout limit are stated in words, unconditionally", () => {
  const md = renderMarkdown(REPORT, OPTS);
  assert.match(md, /Graded 3 of 5 member\(s\), 1 not graded, 1 unresolvable/);
  assert.match(md, /graded the LOCAL CHECKOUT of each member/);
  assert.match(md, /Remote fetch-at-sha is deferred/);
});

test("collection render: the two 'unresolved' cases are told apart in the rendered output", () => {
  const md = renderMarkdown(REPORT, OPTS);
  assert.match(md, /\*\*delta\*\* \(NOT GRADED/);
  assert.match(md, /\*\*epsilon\*\* \(UNRESOLVABLE/);
  assert.match(md, /a gap in this machine, not in the catalogue/);
  assert.match(md, /an installer following it receives nothing/);
});

test("collection render: the advisory block is rendered but is never presented as a finding", () => {
  const md = renderMarkdown(REPORT, OPTS);
  const advisoryIndex = md.indexOf("## 04 Advisory");
  const findingsIndex = md.indexOf("## 03 Collection findings");
  assert.ok(findingsIndex > 0 && advisoryIndex > findingsIndex, "advisory comes after, and outside, the findings section");
  assert.match(md, /Nothing in this section can move the collection verdict or the exit code/);
  // The advisory rows must not appear inside the findings table.
  const findingsSection = md.slice(findingsIndex, advisoryIndex);
  assert.ok(!findingsSection.includes("trigger-surface"), "an advisory row must never render as a finding");
});

test("collection render: MD and HTML are house-clean and the HTML is self-contained", () => {
  const md = renderMarkdown(REPORT, OPTS);
  const html = renderHtml(REPORT, OPTS);
  assertNoDashes(md, "collection MD");
  assertNoDashes(html, "collection HTML");
  assertSelfContainedHtml(html);
  assert.match(html, /Collection Evaluation/);
  assert.match(html, /self-consistency worst-member/);
});

test("collection render: golden MD snapshot", () => {
  assertSnapshot(renderMarkdown(REPORT, OPTS), SNAP_DIR, "marketplace-collection.expected.md");
});

test("collection render: golden HTML snapshot", () => {
  assertSnapshot(renderHtml(REPORT, OPTS), SNAP_DIR, "marketplace-collection.expected.html");
});
