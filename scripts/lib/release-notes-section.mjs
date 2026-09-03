// what-it-is:   the RELEASE-NOTES section extractor (E57)
// what-it-does: given RELEASE-NOTES.md's text and a version, returns that version's `## <version>`
//               section - the heading line plus every line up to the next version heading
// why:          `release.yml` refuses to publish a GitHub release when RELEASE-NOTES.md carries no
//               section for the version being cut, and it is right to: without that refusal a
//               malformed notes file publishes the entire changelog as the release body. But it ran
//               that refusal on the PUSHED TAG, in awk, inline in the workflow. By the time it fired
//               the tag existed, npm had already published, and the only remedies left were a
//               follow-up commit plus a hand-made release, or a second tag. v1.17.1 shipped its notes
//               heading as a literal `## %s - %s` exactly that way. Two things were wrong and this
//               module fixes the first: the extraction lived in CI YAML, which Standard sec 4.1/4.4
//               forbids ("CI configuration MUST contain no validation logic of its own; it MUST only
//               invoke the portable scripts"), and it was therefore unreachable from `release-ready`,
//               which is the gate that runs BEFORE the tag. One implementation, two callers. Two
//               implementations of "find this version's section" is how they drift.
// used-by:      scripts/check-release-notes-section.mjs, which is invoked by
//               .github/workflows/release.yml and registered as a release-ready gate; covered by
//               tests/unit/release-notes-section.test.mjs

/**
 * A version heading that terminates the preceding section: `## 1.2.3` at the start of a line.
 * Deliberately NOT anchored to the version being extracted - any later version heading ends the
 * section, which is what makes "everything up to the next release" the unit rather than "everything
 * to EOF".
 */
const VERSION_HEADING = /^## [0-9]+\.[0-9]+\.[0-9]+/;

/**
 * Does this line open the requested version's section?
 *
 * Ported verbatim from the awk that used to live in release.yml: an EXACT match on `## <version>`,
 * or a line beginning `## <version> ` (heading followed by a space, which is the dated form
 * `## 1.17.1 - 2026-09-01`). The trailing space is load-bearing in the second form: without it
 * `## 1.17.10` would match a request for `1.17.1`.
 */
function opensSection(line, version) {
  const heading = `## ${version}`;
  return line === heading || line.startsWith(`${heading} `);
}

/**
 * Pure. Returns { found, text } for one version's section.
 *
 * `found` is heading PRESENCE, matching what the awk-plus-`[ -s ]` pair in release.yml actually
 * decided - a heading with an empty body still produced a non-empty file and still published. The
 * two callers must agree exactly or the pre-tag gate and the post-tag refusal can disagree about the
 * same file, which is the drift this module exists to prevent. Tightening the rule to "heading AND a
 * non-empty body" is a real option, but it is a POLICY change and belongs in its own change with its
 * own demonstration, not smuggled in under a refactor.
 *
 * Accepts CRLF and LF alike and returns LF, so a notes file authored on Windows extracts the same
 * section it would on the runner.
 */
export function extractSection(notesText, version) {
  const lines = String(notesText).split(/\r?\n/);
  const out = [];
  let inSection = false;
  for (const line of lines) {
    if (opensSection(line, version)) {
      inSection = true;
      out.push(line);
      continue;
    }
    if (inSection && VERSION_HEADING.test(line)) inSection = false;
    if (inSection) out.push(line);
  }
  return { found: out.length > 0, text: out.length > 0 ? `${out.join("\n")}\n` : "" };
}
