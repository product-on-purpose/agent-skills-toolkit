// what-it-is:   the deterministic half of the action-pin watch (E45, ADR 0053)
// what-it-does: parses every `uses:` pin out of workflow text, compares each pin's human-readable LABEL
//               against the version its machine-readable REF actually resolves to, and decides one verdict
//               per pin plus one exit code for the run
// why:          a SHA pin's trailing `# vX.Y.Z pinned <date>` comment is the only half a reviewer reads, and
//               Dependabot advances the SHA without touching it, so the two halves silently disagree. Caught
//               by eye in #187, #198 and #225 and never once by a machine. A defect caught three times by a
//               human reading a diff is this repository's standing definition of something that needs a guard
// used-by:      scripts/action-pin-watch.mjs (the CLI, which owns all I/O); covered by
//               tests/unit/action-pin-watch.test.mjs
//
// PURE BY CONSTRUCTION. This module imports nothing at all: no `node:fs`, no `node:child_process`, no
// network. Every fact it needs arrives as an argument. That is what lets the whole verdict layer be tested
// without a network, and it is enforced by the same write-incapability test shape the vendor watch carries,
// because the two modules exist for the same reason: deciding what a change MEANS is a human's job.

/** One verdict per pin. Only two of these can fail a run; see `exitCodeFor`. */
export const VERDICT = Object.freeze({
  /** The label agrees with what the ref resolves to, or the ref needs no label. */
  OK: "OK",
  /** A SHA pin whose comment names a different version than the SHA resolves to. BLOCKING. */
  LABEL_DISAGREES: "LABEL_DISAGREES",
  /** A SHA pin carrying no version at all. BLOCKING: a bare 40-hex string is unreadable by a human. */
  LABEL_MISSING: "LABEL_MISSING",
  /** A tag pin whose comment names a different MAJOR than the ref. BLOCKING: it contradicts the ref. */
  LABEL_CONTRADICTS_REF: "LABEL_CONTRADICTS_REF",
  /** The pin is behind the action's current release. ADVISORY, never blocking. See `exitCodeFor`. */
  BEHIND: "BEHIND",
  /** The lookup could not be performed or the ref could not be resolved. REFUSAL, never a pass. */
  UNRESOLVED: "UNRESOLVED",
});

/**
 * `uses: <owner>/<repo>[/<subpath>]@<ref>` with an optional trailing `# comment`.
 *
 * Anchored to the whole line and tolerant of the two shapes real workflows use (a bare `uses:` key and a
 * `- uses:` list item). It deliberately does NOT match a `uses:` inside a quoted string or a folded block:
 * those are not step definitions, and a parser generous enough to catch them would also catch prose.
 */
const USES_LINE = /^\s*(?:-\s*)?uses:\s*([A-Za-z0-9._-]+)\/([A-Za-z0-9._/-]+?)@([A-Za-z0-9._-]+)\s*(?:#\s*(.*?))?\s*$/;

/** A 40-character lowercase hex string: a full commit SHA, the only ref shape that is opaque to a reader. */
const SHA_REF = /^[0-9a-f]{40}$/;

/** A major-only moving tag: `v4`, `v7`. The ref IS the version, so no label is required. */
const MAJOR_TAG_REF = /^v(\d+)$/;

/**
 * The first version-looking token in a comment: `v4.37.7`, `v3`, `v2.1.0-rc.1`.
 * Returns null when the comment carries no version, which is a distinct case from carrying a wrong one.
 */
export function versionInComment(comment) {
  if (typeof comment !== "string") return null;
  const m = comment.match(/\bv\d+(?:\.\d+)*(?:-[0-9A-Za-z.-]+)?\b/);
  return m ? m[0] : null;
}

/** The major number of a version or tag string, or null when it has none. */
export function majorOf(version) {
  if (typeof version !== "string") return null;
  const m = version.match(/^v?(\d+)/);
  return m ? m[1] : null;
}

/** `sha` (opaque, a label is REQUIRED), `major-tag` (self-describing), or `other` (a full tag or a branch). */
export function classifyRef(ref) {
  if (SHA_REF.test(ref)) return "sha";
  if (MAJOR_TAG_REF.test(ref)) return "major-tag";
  return "other";
}

/**
 * Every `uses:` pin in one file's text, with 1-based line numbers.
 *
 * `file` is carried through rather than resolved here, because this module does no I/O and the caller
 * already knows which path it read.
 */
export function parsePins(text, file) {
  const out = [];
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(USES_LINE);
    if (!m) continue;
    const [, owner, repoPath, ref, comment] = m;
    out.push({
      file,
      line: i + 1,
      owner,
      repoPath,
      // The ACTION is the repository, which is the first path segment. `github/codeql-action/init` and
      // `github/codeql-action/analyze` are two steps of ONE action and must resolve with one lookup, or a
      // three-step CodeQL job spends three API calls to learn the same fact three times.
      action: `${owner}/${repoPath.split("/")[0]}`,
      ref,
      refKind: classifyRef(ref),
      comment: comment ? comment.trim() : null,
      claimed: versionInComment(comment ?? null),
    });
  }
  return out;
}

/**
 * One pin's verdict, given what the registry said about it.
 *
 * `resolution` is `{ resolvedVersion, latestVersion, error }`. A missing or errored resolution is
 * UNRESOLVED rather than OK, because a lookup that did not happen proves nothing - the same reason the
 * vendor watch treats an unreachable page as a refusal instead of a pass.
 *
 * THE RULE, and it is ADR 0053's central decision: a **SHA** ref is opaque to a reader, so its comment MUST
 * name the version it resolves to. A **major tag** ref is self-describing, so it needs no comment; if it
 * carries one anyway, that comment must not contradict the ref's own major.
 */
export function evaluatePin(pin, resolution) {
  const err = resolution?.error ?? null;
  if (pin.refKind === "sha") {
    if (err) return { verdict: VERDICT.UNRESOLVED, detail: `lookup failed: ${err}` };
    const resolved = resolution?.resolvedVersion ?? null;
    if (!resolved) {
      return {
        verdict: VERDICT.UNRESOLVED,
        detail: "the ref resolves to no tag the registry reports; cannot confirm or deny the label",
      };
    }
    if (!pin.claimed) {
      return {
        verdict: VERDICT.LABEL_MISSING,
        detail: `resolves to ${resolved} and carries no version comment; a bare 40-hex ref tells a reviewer nothing`,
      };
    }
    if (pin.claimed !== resolved) {
      return {
        verdict: VERDICT.LABEL_DISAGREES,
        detail: `comment says ${pin.claimed}, the ref resolves to ${resolved}`,
      };
    }
    return { verdict: VERDICT.OK, detail: `label and ref agree on ${resolved}` };
  }

  if (pin.refKind === "major-tag") {
    if (pin.claimed && majorOf(pin.claimed) !== majorOf(pin.ref)) {
      return {
        verdict: VERDICT.LABEL_CONTRADICTS_REF,
        detail: `ref is ${pin.ref}, comment says ${pin.claimed}`,
      };
    }
    // Currency is measured only where the lookup succeeded. An errored lookup on a tag ref is NOT a
    // refusal, because the label question was already answered from the ref alone: there is nothing the
    // registry could have told us that would change this pin's verdict.
    if (!err && resolution?.latestVersion) {
      const latestMajor = majorOf(resolution.latestVersion);
      if (latestMajor && latestMajor !== majorOf(pin.ref)) {
        return { verdict: VERDICT.BEHIND, detail: `pinned ${pin.ref}, current release is ${resolution.latestVersion}` };
      }
    }
    return { verdict: VERDICT.OK, detail: `${pin.ref} is self-describing and current` };
  }

  return { verdict: VERDICT.OK, detail: `ref ${pin.ref} is a full tag or branch; no label contract applies` };
}

/**
 * Every pin with its verdict, plus the counts the exit code and the renderer both read.
 *
 * `resolveFor` is a FUNCTION from pin to resolution, not a map. That is deliberate: currency is a fact
 * about an ACTION (one lookup serves every pin of it) while a SHA resolves per REF, so a by-action map
 * cannot express both. Passing the seam as a function keeps this module ignorant of how the caller
 * batched its lookups, which is the whole reason it stays pure.
 */
export function buildReport(pins, resolveFor) {
  const rows = pins.map((pin) => ({ ...pin, ...evaluatePin(pin, resolveFor(pin)) }));
  const count = (v) => rows.filter((r) => r.verdict === v).length;
  return {
    rows,
    counts: {
      total: rows.length,
      ok: count(VERDICT.OK),
      labelDisagrees: count(VERDICT.LABEL_DISAGREES),
      labelMissing: count(VERDICT.LABEL_MISSING),
      labelContradicts: count(VERDICT.LABEL_CONTRADICTS_REF),
      behind: count(VERDICT.BEHIND),
      unresolved: count(VERDICT.UNRESOLVED),
    },
  };
}

/**
 * The exit code, and the SPLIT is the decision ADR 0053 exists to record.
 *
 * **2 (refusal) outranks everything.** A lookup that could not be performed proves nothing, and a run that
 * passes because it could not reach the registry is worse than no run. Same discipline as the vendor watch.
 *
 * **1 for a LABEL problem only.** A wrong, missing or contradictory label is a defect in THIS repository:
 * its own file says something untrue about its own supply chain, the author can fix it alone, and shipping
 * it means every reviewer reads a misleading line.
 *
 * **BEHIND never affects the exit code.** A pin falling behind is not a defect here; it is news about
 * somebody else's release. Blocking on it would let an upstream release stop this repository's release, on
 * a cadence nobody here controls, for a fact that is merely worth knowing. The vendor watch does not carry
 * that failure mode and this must not import it. `BEHIND` is reported loudly and gates nothing.
 */
export function exitCodeFor(report) {
  if (report.counts.unresolved > 0) return 2;
  if (report.counts.labelDisagrees + report.counts.labelMissing + report.counts.labelContradicts > 0) return 1;
  return 0;
}

const SYMBOL = {
  [VERDICT.OK]: "ok  ",
  [VERDICT.LABEL_DISAGREES]: "FAIL",
  [VERDICT.LABEL_MISSING]: "FAIL",
  [VERDICT.LABEL_CONTRADICTS_REF]: "FAIL",
  [VERDICT.BEHIND]: "note",
  [VERDICT.UNRESOLVED]: "REFU",
};

/** The human report. Every row prints, because a run that only shows failures cannot be read as coverage. */
export function renderReport(report) {
  const lines = ["action-pin-watch", ""];
  for (const r of report.rows) {
    lines.push(`${SYMBOL[r.verdict]} ${r.file}:${r.line}  ${r.action}@${r.ref.slice(0, 12)}${r.ref.length > 12 ? "..." : ""}  [${r.verdict}]`);
    lines.push(`     ${r.detail}`);
  }
  const c = report.counts;
  lines.push("");
  lines.push(
    `${c.total} pins: ${c.ok} ok, ${c.labelDisagrees + c.labelMissing + c.labelContradicts} label problem(s), ${c.behind} behind (advisory), ${c.unresolved} unresolved.`
  );
  const exit = exitCodeFor(report);
  if (exit === 2) {
    lines.push("REFUSAL: a pin could not be resolved. This is never a pass - fix the lookup, then re-run.");
  } else if (exit === 1) {
    lines.push("A pin's LABEL disagrees with what its REF resolves to. Correct the comment; do not change the SHA to match the comment.");
  } else if (c.behind > 0) {
    lines.push("Every label agrees with its ref. The 'behind' rows above are advisory and block nothing.");
  } else {
    lines.push("Every label agrees with its ref, and every pin is on its action's current major.");
  }
  return lines.join("\n");
}
