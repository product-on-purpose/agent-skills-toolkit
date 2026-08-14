// what-it-is:   the one Markdown table-cell escape used everywhere untrusted text is rendered
// what-it-does: escapes backslashes FIRST, then pipes, then collapses newlines, so a value cannot
//               break out of the cell it was rendered into
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
 * Escape a value that will be rendered as Markdown PROSE, not as a table cell.
 *
 * escapeMdCell keeps a value inside its cell. It does NOT stop the value from being active MARKUP,
 * and for prose that is the bigger exposure: a suppression reason of
 * "![Official status](https://attacker.example/pixel)" survives the cell escape unchanged and renders
 * as a live image in a report published ABOUT the party who wrote it - a tracking pixel, or a
 * trusted-looking link, over our signature.
 *
 * So every inline metacharacter that can OPEN a construct is escaped: link and image brackets, the
 * parentheses that carry their destination, emphasis, code spans, autolink angles, and the bang that
 * turns a link into an image. Backslash-escaping ASCII punctuation is defined by CommonMark, so each
 * one renders as the literal character.
 */
export function escapeMdInline(s) {
  return escapeMdCell(s).replace(/[\[\]()!*_`~<>#]/g, (c) => BS + c);
}
