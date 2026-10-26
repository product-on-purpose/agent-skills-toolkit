// what-it-is:   RS-B2 firing-case map for the Advanced (G*) band
// what-it-does: exports the array of {reqId, fixture, expect} cases the spine-firing runner replays
//               against scripts/lib/registry.mjs's Advanced checks
// why:          RS-B2 proves every spine check has at least one case that makes it fire; this file is
//               the band agent's one surface to fill in, so a later pass can diff it without touching
//               the runner (docs/internal/roadmap.md "## RS-B2")
// used-by:      tests/unit/spine-firing/spine-firing.test.mjs

/** @type {import("./spine-firing.test.mjs").FiringCase[]} */
export const cases = [
  // G1 (hook-documentation): a hook entry missing its "matcher" is an undocumented-firing-condition error.
  {
    reqId: "G1",
    fixture: "anti/hook-undocumented",
    expect: { severity: "error", message: /matcher/ },
  },
  // G2 (self-hosting): a CI workflow that only mentions the gate in a YAML comment never runs it.
  {
    reqId: "G2",
    fixture: "anti/ci-comment-only",
    expect: { severity: "error", message: /none runs the conformance gate/ },
  },
  // G3 (library-regression): a chain edge with no covering eval set is an uncovered-regression error.
  {
    reqId: "G3",
    fixture: "anti/regression-missing-eval",
    expect: { severity: "error", message: /rm-caller -> rm-worker/ },
  },
  // G4 (index-drift): a hand-edited INDEX.md that no longer matches gen-index's output is stale.
  {
    reqId: "G4",
    fixture: "anti/index-stale",
    expect: { severity: "error", message: /out of date/ },
  },
  // G5 (release-notes): minimal-skill ships no RELEASE-NOTES.md at all.
  {
    reqId: "G5",
    fixture: "golden/minimal-skill",
    expect: { severity: "error", message: /RELEASE-NOTES\.md is missing/ },
  },
  // G6 (deprecation): a deprecated component missing "deprecated-by" fails the deprecation contract.
  {
    reqId: "G6",
    fixture: "anti/deprecated-incomplete",
    expect: { severity: "error", message: /deprecated-by/ },
  },
  // G7 (docs-frontmatter): a docs page missing the required "audience" field.
  {
    reqId: "G7",
    fixture: "anti/docs-frontmatter-bad",
    expect: { severity: "error", message: /audience/ },
  },
  // G8 (folder-readme): a child that exists on disk but is missing from the README inventory.
  {
    reqId: "G8",
    fixture: "anti/folder-readme-missing-child",
    expect: { severity: "error", message: /under-listed/ },
  },
  // G9 (source-doc): a source file missing the "why" docblock field.
  {
    reqId: "G9",
    fixture: "anti/source-doc-missing-why",
    // Pins the reported field list itself: the message's boilerplate also names "why", so a bare /why/
    // would match a finding for any missing field.
    expect: { severity: "error", message: /missing the header docblock field\(s\): why\./ },
  },
  // G10 (docs-presence): a Diataxis quadrant directory present but with no *.md page inside it.
  {
    reqId: "G10",
    fixture: "anti/docs-presence-empty-tutorials",
    expect: { severity: "error", message: /docs\/tutorials/ },
  },
];
