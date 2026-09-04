// what-it-is:   the tier-scope sentence, and where it links (RS-E3)
// what-it-does: holds ONE canonical wording for what a tier does and does not certify, plus the URL of
//               the page that says more, for every surface that presents a tier to inherit
// why:          `docs/explanation/limitations.md` and `conformance-and-tiers.md` have always said what a
//               tier does not certify. Nothing that PRESENTED a tier ever linked them - not the badge,
//               not the README status block, not the registry, not the SARIF a consumer's Security tab
//               renders - so the concession never travelled with the claim and the badge overclaimed by
//               silence. RS-E3's audit row counted four placements, its own change list six and its
//               acceptance criterion five: three numbers for one item, which is what a count maintained
//               by hand does. One constant every surface imports makes the count stop being load-bearing.
// used-by:      scripts/lib/sarif-render.mjs (rule helpUri), scripts/gen-site-reports.mjs (the report
//               index and the badge's click-through), scripts/gen-family-registry.mjs (both page states);
//               covered by tests/unit/gen-site-reports.test.mjs
//
// This lives in scripts/lib/ rather than beside the generators because sarif-render.mjs SHIPS in the npm
// tarball and a shipped module cannot import a deploy-time one. That constraint is load-bearing, not
// incidental: the SARIF a consumer's Security tab renders is the surface furthest from this repository's
// own documentation, and therefore the one where an unqualified tier claim travels furthest unaccompanied.

/**
 * The sentence. Pinned verbatim by a test: revising it should be a deliberate act in one commit, not a
 * drift that leaves five surfaces saying four things.
 */
export const TIER_SCOPE_SENTENCE =
  "This tier reports structural conformance to a written Standard - deterministic and reproducible; " +
  "it is not a content review, a safety audit, or a statement that the skills work.";

/** Where a reader goes for the long version. Absolute, because SARIF is read outside this repository. */
export const LIMITATIONS_URL = "https://product-on-purpose.github.io/agent-skills-toolkit/explanation/limitations/";
