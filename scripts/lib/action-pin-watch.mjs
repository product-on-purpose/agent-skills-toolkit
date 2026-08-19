// what-it-is:   the deterministic half of the action-pin watch (E45, ADR 0053)
// what-it-does: parses every `uses:` pin out of workflow text, compares each pin's human-readable LABEL
//               against the version(s) its machine-readable REF actually resolves to, and decides one
//               verdict per pin plus one exit code for the run
// why:          a SHA pin's trailing `# vX.Y.Z pinned <date>` comment is the only half a reviewer reads, and
//               Dependabot advances the SHA without touching it, so the two halves silently disagree. Caught
//               by eye in #187, #198 and #225 and never once by a machine. A defect caught three times by a
//               human reading a diff is this repository's standing definition of something that needs a guard
// used-by:      scripts/action-pin-watch.mjs (the CLI, which owns all I/O); covered by
//               tests/unit/action-pin-watch.test.mjs
//
// PURE BY CONSTRUCTION. This module imports nothing at all: no `node:fs`, no `node:child_process`, no
// network. Every fact it needs arrives as an argument. That is what lets the whole verdict layer be tested
// without a network, and it is enforced by a test that asserts the empty import list including the dynamic
// `await import(...)` form, because the first version of that assertion matched only static imports.

/** One verdict per pin. Which of these block is decided in `exitCodeFor`, not here. */
export const VERDICT = Object.freeze({
  /** The label names a version the ref genuinely resolves to, or the ref needs no label. */
  OK: "OK",
  /** A SHA pin whose comment names a version the SHA does NOT resolve to. BLOCKING. */
  LABEL_DISAGREES: "LABEL_DISAGREES",
  /** A SHA pin carrying no version at all. BLOCKING: a bare 40-hex string is unreadable by a human. */
  LABEL_MISSING: "LABEL_MISSING",
  /** A tag pin whose comment names a different MAJOR than the ref. BLOCKING: it contradicts the ref. */
  LABEL_CONTRADICTS_REF: "LABEL_CONTRADICTS_REF",
  /** The pin is behind the action's current major. ADVISORY, never blocking. See `exitCodeFor`. */
  BEHIND: "BEHIND",
  /** The lookup could not be performed, so the label could be neither confirmed nor denied. REFUSAL. */
  UNRESOLVED: "UNRESOLVED",
});

/**
 * `uses: <owner>/<repo>[/<subpath>]@<ref>` with an optional trailing `# comment`.
 *
 * The value may be bare, single-quoted or double-quoted - all three are legal YAML, and the first version
 * of this regex silently missed the quoted forms, so a repository whose only wrong label was quoted exited
 * 0. The ref character class includes `/`, because `owner/action@feature/foo` is a legal branch ref that
 * the first version also missed; `@` is what anchors the split, and `@` never appears in an owner name.
 */
const USES_LINE =
  /^\s*(?:-\s*)?uses:\s*(["']?)([A-Za-z0-9._-]+)\/([A-Za-z0-9._/-]+?)@([A-Za-z0-9._/-]+)\1\s*(?:#\s*(.*?))?\s*$/;

/** A YAML block-scalar introducer: `run: |`, `script: >-`, `body: |2+`. Its payload is not YAML. */
const BLOCK_SCALAR = /^(\s*)(?:-\s*)?[A-Za-z0-9_.-]+\s*:\s*[|>][+-]?\d*\s*$/;

/**
 * 40 hex characters, EITHER CASE. Git object ids are case-insensitive and GitHub resolves an uppercase one
 * to the same commit, so a lowercase-only test let a real SHA pin fall through to the `other` branch and
 * bypass the label contract entirely - a real full SHA with a wrong label passed at exit 0.
 */
const SHA_REF = /^[0-9a-fA-F]{40}$/;

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
 * BLOCK SCALARS ARE SKIPPED, and that is a correctness fix rather than a nicety. A `run: |` step's payload
 * is shell, not YAML, and a heredoc inside one can contain a line that reads exactly like a `uses:` step.
 * Parsing it produced a FALSE FINDING against a structurally correct workflow, which is the worst failure
 * mode this repository recognises: the author who trusts the tool changes correct code.
 */
export function parsePins(text, file) {
  const out = [];
  const lines = String(text).split(/\r?\n/);
  let blockIndent = null; // indent of the introducer while inside a block scalar, else null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.match(/^\s*/)[0].length;

    if (blockIndent !== null) {
      // A block scalar's payload is every following line indented deeper than its introducer. A blank
      // line does not end it; anything at or below the introducer's indent does.
      if (line.trim() === "" || indent > blockIndent) continue;
      blockIndent = null;
    }
    const bs = line.match(BLOCK_SCALAR);
    if (bs) {
      blockIndent = bs[1].length;
      continue;
    }

    const m = line.match(USES_LINE);
    if (!m) continue;
    const [, , owner, repoPath, ref, comment] = m;
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
 * `resolution` is `{ resolvedVersions, latestVersion, error }`. `resolvedVersions` is an ARRAY, because one
 * commit routinely carries more than one tag: measured live on 2026-08-19, `softprops/action-gh-release`
 * has `v3.0.2` and `v3` on one commit, `v2.6.2` and `v2` on another, and `v1` and `v0.1.15` on a third. The
 * first version of this function read only the first tag the registry happened to list, which turned a
 * CORRECT label into a release-blocking FALSE FINDING on response ordering nobody controls - and it did
 * exactly that to this repository's own `release.yml` pin during review wave 1.
 * **A label is correct if it names ANY tag the commit carries.**
 *
 * THE RULE, and it is ADR 0053's central decision: a **SHA** ref is opaque to a reader, so its comment MUST
 * name a version it resolves to. A **major tag** ref is self-describing, so it needs no comment; if it
 * carries one anyway, that comment must not contradict the ref's own major.
 */
export function evaluatePin(pin, resolution) {
  const err = resolution?.error ?? null;
  const latest = resolution?.latestVersion ?? null;
  const resolved = Array.isArray(resolution?.resolvedVersions) ? resolution.resolvedVersions : [];

  if (pin.refKind === "sha") {
    if (err) return { verdict: VERDICT.UNRESOLVED, detail: `lookup failed: ${err}` };
    if (resolved.length === 0) {
      return {
        verdict: VERDICT.UNRESOLVED,
        detail:
          "no tag the registry reported within the pages searched points at this commit; the label can be neither confirmed nor denied",
      };
    }
    const names = resolved.join(", ");
    if (!pin.claimed) {
      return {
        verdict: VERDICT.LABEL_MISSING,
        detail: `resolves to ${names} and carries no version comment; a bare 40-hex ref tells a reviewer nothing`,
      };
    }
    if (!resolved.includes(pin.claimed)) {
      return {
        verdict: VERDICT.LABEL_DISAGREES,
        detail: `comment says ${pin.claimed}, the ref resolves to ${names}`,
      };
    }
    // The label is accurate. Currency is a separate, advisory question - and a SHA pin is exactly where
    // staleness matters most, so the first version returning OK here without ever consulting
    // `latestVersion` meant a fixed SHA pin could never be reported BEHIND at all.
    if (latest && majorOf(latest) && majorOf(latest) !== majorOf(pin.claimed)) {
      return { verdict: VERDICT.BEHIND, detail: `label ${pin.claimed} is accurate; the current release is ${latest}` };
    }
    return {
      verdict: VERDICT.OK,
      detail: latest
        ? `label and ref agree on ${pin.claimed} (of ${names}); current release ${latest}`
        : `label and ref agree on ${pin.claimed} (of ${names}); currency NOT checked`,
      currencyUnknown: !latest,
    };
  }

  if (pin.refKind === "major-tag") {
    if (pin.claimed && majorOf(pin.claimed) !== majorOf(pin.ref)) {
      return {
        verdict: VERDICT.LABEL_CONTRADICTS_REF,
        detail: `ref is ${pin.ref}, comment says ${pin.claimed}`,
      };
    }
    // A failed lookup on a tag ref is NOT a refusal: the label question is fully answered by the ref
    // itself, and nothing the registry could have said would change this pin's verdict. But it must not be
    // reported as CURRENT either - the first version said "is self-describing and current" after a 503,
    // asserting the exact fact it had just failed to establish.
    if (err || !latest) {
      return {
        verdict: VERDICT.OK,
        detail: `${pin.ref} is self-describing; currency NOT checked${err ? ` (${err})` : ""}`,
        currencyUnknown: true,
      };
    }
    if (majorOf(latest) && majorOf(latest) !== majorOf(pin.ref)) {
      return { verdict: VERDICT.BEHIND, detail: `pinned ${pin.ref}, current release is ${latest}` };
    }
    return { verdict: VERDICT.OK, detail: `${pin.ref} is self-describing and current (${latest})` };
  }

  return {
    verdict: VERDICT.OK,
    detail: `ref ${pin.ref} is a full tag or branch; no label contract applies`,
    currencyUnknown: true,
  };
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
      currencyUnknown: rows.filter((r) => r.currencyUnknown).length,
    },
  };
}

/** Every blocking label condition, as one number. */
export function labelProblems(counts) {
  return counts.labelDisagrees + counts.labelMissing + counts.labelContradicts;
}

/**
 * The exit code. **The ordering here is a correction review wave 1 forced, and it is worth reading.**
 *
 * **1 (a label problem) outranks 2 (a refusal).** The first version had it the other way round, on the
 * reasoning that "a refusal is never a pass". That reasoning is right about a run which proved NOTHING and
 * wrong about a run which proved a DEFECT. And the difference was reachable, not theoretical:
 * `release-ready` makes code 2 overridable with `--allow-vendor-unreachable`, so one wrong label plus one
 * unrelated 503 collapsed to exit 2 and a network reason string waved the wrong label straight through -
 * directly contradicting ADR 0053's own claim that no reason can excuse a disagreeing label. A known defect
 * is now reported as a known defect, at an exit code nothing can override.
 *
 * **2 for a refusal**, when that is the only thing wrong: a lookup that did not happen proves nothing, and
 * a run that passes because it could not reach the registry is worse than no run.
 *
 * **BEHIND never affects the exit code.** A pin falling behind is not a defect here; it is news about
 * somebody else's release. Blocking on it would let an upstream release stop this repository's release, on
 * a cadence nobody here controls, for a fact that is merely worth knowing. The vendor watch does not carry
 * that failure mode and this must not import it. `BEHIND` is reported loudly and gates nothing.
 */
export function exitCodeFor(report) {
  if (labelProblems(report.counts) > 0) return 1;
  if (report.counts.unresolved > 0) return 2;
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
    const shortRef = r.ref.length > 12 ? `${r.ref.slice(0, 12)}...` : r.ref;
    lines.push(`${SYMBOL[r.verdict]} ${r.file}:${r.line}  ${r.action}@${shortRef}  [${r.verdict}]`);
    lines.push(`     ${r.detail}`);
  }
  const c = report.counts;
  lines.push("");
  lines.push(
    `${c.total} pins: ${c.ok} ok, ${labelProblems(c)} label problem(s), ${c.behind} behind (advisory), ${c.unresolved} unresolved.`
  );
  const exit = exitCodeFor(report);
  if (exit === 1) {
    lines.push(
      "A pin's LABEL disagrees with what its REF resolves to. Correct the comment; do not change the SHA to match the comment."
    );
  } else if (exit === 2) {
    lines.push("REFUSAL: a pin could not be resolved. This is never a pass - fix the lookup, then re-run.");
  } else if (c.behind > 0) {
    lines.push("Every label is accurate. The 'behind' rows above are advisory and block nothing.");
  } else {
    lines.push("Every label is accurate.");
  }
  // Never claim currency that was not checked. The first version printed "every pin is on its action's
  // current major" after a lookup failure, asserting the exact fact it had just failed to establish.
  if (c.currencyUnknown > 0) {
    lines.push(
      `Currency was NOT checked for ${c.currencyUnknown} pin(s), so "behind" is not a complete answer for this run.`
    );
  }
  return lines.join("\n");
}
