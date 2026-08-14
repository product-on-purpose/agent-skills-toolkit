// what-it-is:   the two Markdown boundaries for untrusted text - a table-cell escape, and an inert span
// what-it-does: escapeMdCell escapes backslashes FIRST, then pipes, then collapses newlines, so a value
//               cannot break out of the cell it was rendered into; mdCodeSpan wraps subject-authored
//               text in a dynamically fenced code span, where no inline construct is processed at all
// why:          this exact defect (CodeQL js/incomplete-sanitization, high) was independently written
//               THREE times by three different authors - report-render.mjs, eval-run-aggregate.mjs, and
//               standards-watch.mjs. Three rediscoveries is not bad luck, it is a shape that invites the
//               mistake, so the opportunity is removed rather than the bug corrected a fourth time
// used-by:      scripts/lib/report-render.mjs, scripts/lib/eval-run-aggregate.mjs,
//               scripts/lib/standards-watch.mjs; covered by tests/unit/md-escape.test.mjs

/**
 * Escape a value for a Markdown table cell.
 *
 * ORDER IS LOAD-BEARING AND IS THE ENTIRE POINT. Escaping the pipe alone is self-defeating: a
 * backslash immediately followed by a pipe survives as one literal backslash plus a BARE pipe, so the
 * value walks out of its cell and opens a new column. Escaping backslashes first makes the pipe pass
 * safe, and the result renders as a literal backslash followed by a literal pipe.
 *
 * Newlines are collapsed to a space because a newline ends the table row outright.
 *
 * This is the shared PRIMITIVE. A caller that also needs to neutralize raw HTML, or to trim, applies
 * that on top; the backslash-then-pipe core belongs here and nowhere else.
 */
const BS = String.fromCharCode(92);

export function escapeMdCell(s) {
  return String(s ?? "")
    .split(BS).join(BS + BS)
    .split("|").join(BS + "|")
    .replace(/[\r\n]+/g, " ");
}

/**
 * Wrap subject-authored text in a Markdown CODE SPAN, so it is rendered as inert literal text.
 *
 * This replaces an escape-the-metacharacters helper that enumerated brackets, parentheses, emphasis,
 * backticks, angles and the image bang. That approach was shown to be UNCOMPLETABLE, not merely
 * incomplete, and the distinction is why this is a boundary instead of a longer list:
 *
 *   - GitHub Flavored Markdown AUTOLINKS a bare "https://attacker.example/pixel" or an email address
 *     with no metacharacter present anywhere in it. There is nothing to backslash-escape. The link is
 *     created from the scheme, so no escape set can prevent it.
 *   - CommonMark DECODES entity references, so an ASCII "&rlm;" written by the subject is turned back
 *     into U+200F by the renderer - re-creating, at render time, exactly the bidi control that
 *     sanitizeSubjectText removed at build time. An escape set that omits "&" hands the sanitizer's
 *     work back.
 *
 * Inside a code span neither happens: CommonMark processes no inline constructs there at all, and the
 * GFM autolink extension explicitly does not apply. One rule covers every construct, including the ones
 * added to Markdown after this was written.
 *
 * NOT FOR A TABLE CELL, and that is a real constraint rather than a style note. A code span does not
 * escape pipes and MUST NOT: inside a GFM table a pipe needs escaping, but outside one a backslash-pipe
 * renders as a literal backslash and corrupts the quotation this exists to keep exact. So the two
 * boundaries do not compose - use escapeMdCell for a cell, this for prose. A test asserts no notice is
 * ever emitted into a table row, because "we happen not to do that today" is not a guarantee.
 *
 * FENCING IS DYNAMIC because the text may itself contain backticks: the fence is one longer than the
 * longest backtick run in the content, which is the CommonMark rule for making a span that cannot be
 * closed early. The single space on each side is the documented round-trip: a code span that both
 * begins and ends with a space has exactly one removed from each end, so the subject's text renders
 * byte-for-byte. Callers pass text already flattened by sanitizeSubjectText, and newlines are collapsed
 * here as well, because a line ending inside a span would become a space and silently alter the quote.
 */
export function mdCodeSpan(s) {
  const flat = String(s ?? "").replace(/[\r\n]+/g, " ");
  // Nothing to quote is not a quotation of nothing. An empty span would render as literal backticks and
  // invite a reader to think something was suppressed, so the caller gets an empty string and decides.
  if (flat === "") return "";
  const runs = flat.match(/`+/g);
  const fence = "`".repeat((runs ? Math.max(...runs.map((r) => r.length)) : 0) + 1);
  // The padding is CONDITIONAL, because CommonMark strips one space from each end only when the content
  // is NOT entirely spaces. Padding unconditionally therefore round-trips ordinary text exactly and
  // silently ADDS two spaces to an all-space value - the one input where the byte-for-byte claim this
  // function makes would have been false.
  const pad = flat.trim() === "" ? "" : " ";
  return `${fence}${pad}${flat}${pad}${fence}`;
}
