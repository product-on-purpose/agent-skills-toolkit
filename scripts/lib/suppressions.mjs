// what-it-is:   the suppressions (baseline) matcher (F3)
// what-it-does: tests whether a finding matches a baseline entry (reqId + optional file glob + optional
//               message substring), so a team can durably waive a known finding with a recorded reason
// why:          a persisted, reasoned waiver is the stateful version of "this is intentional, here is why"
//               (linter-vs-judge note); paid once, respected every run, and surfaced (never silent)
// used-by:      scripts/lib/resolve-config.mjs

/**
 * Compile a minimal, dependency-free glob to a RegExp over a slash-normalized path.
 * Supports `**` (any chars including slashes), `*` (any chars except a slash), and literal segments;
 * every other regex metacharacter is escaped. Anchored at both ends so it matches the whole path.
 */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") { re += ".*"; i++; } // ** -> any (crosses slashes)
      else re += "[^/]*";                            // *  -> any non-slash
    } else if (/[.+?^${}()|[\]\\]/.test(c)) {
      re += "\\" + c;                                 // escape regex metacharacters
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

/**
 * Return the first suppression entry that matches the finding, or null. A suppression is scoped to one
 * reqId (exact), optionally narrowed by a `file` glob and/or a case-sensitive `message` substring.
 * The default `file` glob `**` matches any finding including a null-file one; any narrower glob requires
 * a non-null file and a path match (so a file-scoped waiver never silently swallows a fileless finding).
 * Pure and synchronous; first match wins.
 * @param {{reqId:string|null, file:string|null, message:string}} finding
 * @param {Array<{reqId:string, file?:string, message?:string, reason?:string}>} suppressions
 */
export function matchSuppression(finding, suppressions) {
  for (const s of suppressions) {
    if (s.reqId !== finding.reqId) continue;
    if (s.message && !(finding.message ?? "").includes(s.message)) continue;
    if (s.file && s.file !== "**") {
      if (finding.file == null) continue;
      if (!globToRegExp(s.file).test(finding.file)) continue;
    }
    return s;
  }
  return null;
}
