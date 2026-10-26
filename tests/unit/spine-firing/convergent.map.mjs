// what-it-is:   RS-B2 firing-case map for the Convergent (S*) band
// what-it-does: exports the array of {reqId, fixture, expect} cases the spine-firing runner replays
//               against scripts/lib/registry.mjs's Convergent checks
// why:          RS-B2 proves every spine check has at least one case that makes it fire; this file is
//               the band agent's one surface to fill in, so a later pass can diff it without touching
//               the runner (docs/internal/roadmap.md "## RS-B2")
// used-by:      tests/unit/spine-firing/spine-firing.test.mjs

/** @type {import("./spine-firing.test.mjs").FiringCase[]} */
export const cases = [
  {
    reqId: "S1",
    fixture: "anti/no-agent-targets",
    expect: { severity: "error", message: /library\.json is missing "agent-targets"/ },
  },
  {
    reqId: "S2",
    fixture: "anti/no-prefix",
    expect: { severity: "error", message: /prefix/ },
  },
  {
    // S3 (components-index) - the plan named it thin, but the measured inventory found many firing
    // cases across four component types, so it is not thin. See this folder's README.md, S3 row.
    reqId: "S3",
    fixture: "anti/components-drift",
    expect: { severity: "error", message: /cd-missing-skill/ },
  },
  {
    reqId: "S4",
    fixture: "anti/chain-phantom",
    expect: { severity: "error", message: /phantom/ },
  },
  {
    reqId: "S5",
    fixture: "anti/workflow-missing-skill",
    expect: { severity: "error", message: /this-skill-does-not-exist/ },
  },
  {
    // S6 (per-target-presence) - audit note: named thin-by-one-test in the task; the scout's own
    // inventory JSON agrees ("Only one firing test; the others are silent-by-design cases.").
    reqId: "S6",
    fixture: "anti/missing-codex-manifest",
    expect: { severity: "error", message: /\.codex-plugin\/plugin\.json/ },
  },
  {
    reqId: "S7",
    fixture: "anti/command-no-mapsto",
    expect: { severity: "error", message: /maps-to/ },
  },
  {
    reqId: "S8",
    fixture: "anti/status-disagree",
    expect: { severity: "error", message: /declares status "active" but the component's frontmatter declares metadata\.status "deprecated"/ },
  },
];
