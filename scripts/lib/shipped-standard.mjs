// what-it-is:   the toolkit's OWN shipped Standard edition (E77)
// what-it-does: reads "Standard version X.Y" from this repo's own STANDARD.md, resolved relative to
//               this module's own file rather than any graded plugin's root, and exports the bare
//               regex extraction separately so a missing or malformed header is testable with no file I/O
// why:          E77's informational notice compares a GRADED PLUGIN's declared `standard` against the
//               edition THIS TOOLKIT ships. `ctx.library` is always the SUBJECT being graded, which may
//               not even be this repository - scripts/check.mjs runs against any plugin path - so the
//               toolkit's own edition cannot come from ctx. It is resolved the same way sarif-render.mjs's
//               toolVersion() resolves this repo's own package.json: relative to import.meta.url,
//               wrapped defensively, degrading to null rather than throwing - this is informational
//               metadata, never a gate decision
// used-by:      scripts/check.mjs (newerStandardNotice, E77), scripts/evaluate.mjs; covered by
//               tests/unit/newer-standard-notice.test.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Matches STANDARD.md's own header line, e.g. "> **Standard version 0.17**, amended ...". The same
// shape tests/unit/standard-self-consistency.test.mjs already asserts agrees with library.json's pin,
// so this reads the one declaration that test keeps honest.
const STANDARD_HEADER_RE = /\*\*Standard version (\d+\.\d+)\*\*/;

/** Pure regex extraction, exported so a missing or malformed header is testable with no file I/O. */
export function extractShippedStandard(text) {
  const m = STANDARD_HEADER_RE.exec(String(text ?? ""));
  return m ? m[1] : null;
}

/**
 * The Standard edition THIS TOOLKIT ships, read from its own STANDARD.md header.
 *
 * Wrapped defensively like toolVersion() in sarif-render.mjs: a missing file, an unreadable file, or a
 * header that does not match degrades to null rather than throwing. The notice this feeds (E77) must
 * never be the reason a run crashes, so a read failure here is "the notice does not fire", not an error.
 * @returns {string|null}
 */
export function shippedStandardEdition() {
  try {
    const standardPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../STANDARD.md");
    return extractShippedStandard(readFileSync(standardPath, "utf8"));
  } catch {
    return null;
  }
}
