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
  /**
   * A SHA pin labelled with a FLOATING tag (`# v3`) while the commit also carries a specific version.
   * BLOCKING: the label matches today and will keep matching after the SHA advances, so it can never
   * disagree - which is precisely the drift this check exists to catch. See `evaluatePin`.
   */
  LABEL_FLOATS: "LABEL_FLOATS",
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

/**
 * A YAML block-scalar introducer: `run: |`, `script: >-`, `body: |2+`, `run: | # note`. Its payload is not
 * YAML, so everything indented under it is skipped.
 *
 * The header is `[indentation-indicator][chomping-indicator]` in EITHER ORDER, and a trailing comment is
 * legal after it. The first version allowed only chomping-then-digits and no comment, so it missed
 * `run: |2-` and `run: | # trailing comment` - and did not match its own docstring example `body: |2+`
 * (review finding F5). A missed header means a shell payload gets parsed as YAML, and a `uses:`-shaped line
 * inside a heredoc becomes a pin that BLOCKS the release: the false-finding failure this file's own
 * docblock calls the worst outcome it recognises.
 */
const BLOCK_SCALAR = /^(\s*)(?:-\s*)?[A-Za-z0-9_.-]+\s*:\s*[|>](?:[+-]?\d+|\d+[+-]?|[+-])?\s*(?:#.*)?$/;

/**
 * 40 hex characters, EITHER CASE. Git object ids are case-insensitive and GitHub resolves an uppercase one
 * to the same commit, so a lowercase-only test let a real SHA pin fall through to the `other` branch and
 * bypass the label contract entirely - a real full SHA with a wrong label passed at exit 0.
 */
const SHA_REF = /^[0-9a-fA-F]{40}$/;

/** A major-only moving tag: `v4`, `v7`. The ref IS the version, so no label is required. */
const MAJOR_TAG_REF = /^v(\d+)$/;

/**
 * A version-looking token: `v4.37.7`, `v3`, `V4.37.7`, `2.1.0-rc.1`.
 *
 * The `v` is OPTIONAL and its case is ignored, because `aquasecurity/trivy-action` ships tags named
 * `0.28.0`, and a `v`-only pattern returned null for them - reported as `LABEL_MISSING` against a perfectly
 * good label (review finding F4).
 *
 * A BARE number must carry a dot to count, and that requirement is the whole guard against reading a date
 * as a version: the `2026-08-16` in this repository's own prescribed comment format has no dot in it, so it
 * can never be read as version 2026.
 */
const VERSION_TOKEN = /\b(?:[vV]\d+(?:\.\d+)*|\d+(?:\.\d+)+)(?:-[0-9A-Za-z.-]+)?\b/g;

/** Every version a comment names, in the order it names them. */
export function versionsInComment(comment) {
  if (typeof comment !== "string") return [];
  return [...comment.matchAll(VERSION_TOKEN)].map((m) => m[0]);
}

/**
 * A TIGHT transition between two adjacent version tokens: the text between them is a forward marker and
 * punctuation, and nothing else. ` to `, `, now `, ` -> `.
 *
 * "Tight" is the whole correction from the third review round. R1's first rule took the token after the
 * LAST `to`/`now`/`->` anywhere in the comment, so an ordinary English `to` outranked an explicit `was`
 * sitting directly in front of the old version: `v4.37.7 pinned 2026-08-16 (needed to keep node 22, was
 * v4.36.0)` claimed v4.36.0, a false LABEL_DISAGREES at exit 1 on a correct pin. That is the exact class R1
 * itself was written to remove, reintroduced by R1's own fix.
 *
 * The distinction that holds: a real version transition is written TIGHTLY - `from A to B`, `was A, now B`,
 * `A -> B` - while prose that merely mentions an older version puts words in between. Anchored at both
 * ends, so it can only ever match a complete gap.
 */
const TIGHT_TRANSITION = /^[\s,;:()[\]-]*(?:to|now|->|=>)[\s,;:()[\]-]*$/i;

/** `from`, `was`, `replaces`, `supersedes`, `previously`: what follows one of these is the OLD version. */
const SUPERSEDED_BY_PREFIX = /\b(?:from|was|replaces|replacing|supersedes|superseding|previously)\b[\s,;:(-]*$/i;

/**
 * The version a comment CLAIMS, or null when it names none.
 *
 * **Position alone cannot decide this, and two review findings in a row proved it.** `F4` replaced a
 * first-token rule because Dependabot writes `bumped from v4.37.6 to v4.37.7`, where the first token is the
 * SUPERSEDED version. The fix-code review then found the mirror shape - `v4.1.1 pinned 2026-08-16; replaces
 * v3.0.0` - where the LAST token is the superseded one, and a last-token rule reported a false
 * `LABEL_DISAGREES` at exit 1, the code no reason string can override, on a comment that OPENS with the
 * correct version. `from A to B` puts the claim last; `B ... replaces A` puts it first. Any purely
 * positional rule is wrong half the time, so this one reads the words between the versions:
 *
 * 1. A TIGHT transition (`from A to B`, `was A, now B`, `A -> B`) names what the pin is at now - take the
 *    second token of the last such pair. Tightness is load-bearing: an untethered `to` anywhere in the
 *    comment used to win, which is how the third review round found this rule reintroducing R1's own bug.
 * 2. Otherwise drop every token a SUPERSESSION marker introduces, and take the first survivor.
 * 3. If that leaves nothing, fall back to the last token rather than guess.
 *
 * **THE LOAD-BEARING INVARIANT: the claim is computed from the COMMENT ALONE and never consults what the
 * ref resolves to.** The obvious repair for the mirror shape is to prefer whichever token happens to match
 * a resolved tag - and that is exactly the trap `F3` was. A rule that picks the matching answer can never
 * disagree, so it would pass a comment saying "bumped to v4.37.7" against a SHA that never moved off
 * v4.37.6: the precise Dependabot drift this entire check exists to catch. A test locks the invariant.
 *
 * A comment naming two versions still gets NO verdict of its own. When a label genuinely disagrees,
 * `evaluatePin` lists every token it found, which shows a human the ambiguity without a second verdict.
 */
export function versionInComment(comment) {
  if (typeof comment !== "string") return null;
  const tokens = [...comment.matchAll(VERSION_TOKEN)].map((m) => ({ text: m[0], at: m.index }));
  if (tokens.length === 0) return null;
  if (tokens.length === 1) return tokens[0].text;

  // The LAST tight transition wins, so `was v1, now v2, then v3` reads as v3.
  let transitioned = null;
  for (let i = 1; i < tokens.length; i += 1) {
    const gap = comment.slice(tokens[i - 1].at + tokens[i - 1].text.length, tokens[i].at);
    if (TIGHT_TRANSITION.test(gap)) transitioned = tokens[i].text;
  }
  if (transitioned !== null) return transitioned;

  const survivors = tokens.filter((t) => !SUPERSEDED_BY_PREFIX.test(comment.slice(0, t.at)));
  if (survivors.length > 0) return survivors[0].text;

  return tokens[tokens.length - 1].text;
}

/**
 * A version with its tag prefix stripped and its case folded, for COMPARISON ONLY.
 *
 * Never for display: a detail string must quote what the author actually wrote. `# v4.37.7` against a
 * registry tag literally named `4.37.7` names the same version, and comparing the raw strings reported it
 * as a disagreement, blocking a correct pin (review finding F4).
 */
export function normalizeVersion(version) {
  return typeof version === "string" ? version.replace(/^[vV]/, "").toLowerCase() : null;
}

/**
 * True when a version names a MOVING pointer rather than a release: `v3`, `v3.1`.
 *
 * A floating tag follows its action to every new release commit, so it is not a fact about any particular
 * commit and cannot serve as a label for one. See `evaluatePin` and review finding F3.
 */
export function isFloatingVersion(version) {
  const n = normalizeVersion(version);
  return typeof n === "string" && /^\d+(?:\.\d+)?$/.test(n);
}

/**
 * True when a tag is a version specific enough to serve as a SHA pin's label.
 *
 * "Not floating" is not the same question, and treating it as one was a fix-code review finding: `latest`
 * is not floating by that test, so a commit tagged `v3` and `latest` blocked at exit 1 while the only
 * label the report offered was `# latest` - which parses to no version at all and is therefore
 * `LABEL_MISSING`, also exit 1. An author left with no satisfiable label is the "rule that cannot be
 * satisfied is a false finding with extra steps" trap restated one level down.
 *
 * A tag qualifies only if it is a version the comment parser would read back as itself, AND it does not
 * float. That keeps the advice this module prints to labels that would actually pass.
 */
export function isSpecificVersion(tag) {
  return typeof tag === "string" && versionInComment(tag) === tag && !isFloatingVersion(tag);
}

/** The major number of a version or tag string, or null when it has none. */
export function majorOf(version) {
  if (typeof version !== "string") return null;
  const m = version.match(/^[vV]?(\d+)/);
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
 * commit routinely carries more than one tag: measured live on 2026-08-18, `softprops/action-gh-release`
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

  // CURRENCY IS ONLY COMPARABLE WHEN THE CURRENT RELEASE PARSES AS A VERSION, and review finding F6 was
  // that "latest exists" had been treated as "currency was checked". `github/codeql-action` names its
  // releases/latest tag `codeql-bundle-v2.26.3`: `majorOf` returns null, so the BEHIND guard
  // short-circuited, while `latest` being truthy set `currencyUnknown` FALSE - the report dropped its
  // "Currency was NOT checked" line, and the major-tag branch printed "is self-describing and current",
  // asserting the exact fact it had just failed to establish.
  //
  // The fix is deliberately NOT to parse harder. `codeql-bundle-v2.26.3` is a different numbering series
  // from the action's own `v4` tags; extracting a 2 and comparing it to 4 would report a perfectly current
  // pin as BEHIND, trading a silent gap for a false finding. Not comparable means UNKNOWN, and unknown is
  // reported as unknown.
  const latestMajor = majorOf(latest);
  const currencyComparable = Boolean(latest) && latestMajor !== null;
  const notComparable = latest && !currencyComparable ? ` (current release ${latest} is not a version number, so it could not be compared)` : "";

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
    // Compared NORMALISED, because `# v4.37.7` and a registry tag named `4.37.7` are the same version and
    // the raw string comparison reported them as a disagreement (F4). Detail strings keep the raw spelling.
    const claimedNorm = normalizeVersion(pin.claimed);
    if (!resolved.map(normalizeVersion).includes(claimedNorm)) {
      // When the comment named more than one version, say so. Dependabot writes `from X to Y` and the
      // claim is Y; if Y is wrong, a human wants to see both tokens rather than be told about one.
      const all = versionsInComment(pin.comment);
      // Name the token that WAS read, rather than a position. There is no fixed position any more: the
      // claim is whichever token the transition and supersession markers select, so a sentence saying "the
      // last is read as the claim" described a rule the code had stopped using - output misdescribing its
      // own decision, which is the defect class this repository grades others on. Third-round review, S4.
      const ambiguity =
        all.length > 1 ? ` (the comment names ${all.join(" and ")}; ${pin.claimed} is read as the claim)` : "";
      return {
        verdict: VERDICT.LABEL_DISAGREES,
        detail: `comment says ${pin.claimed}, the ref resolves to ${names}${ambiguity}`,
      };
    }
    // THE LABEL MATCHES. That is not yet enough, and review finding F3 is why.
    //
    // A floating tag (`v3`, `v3.1`) moves to every new release commit, so `resolved` will contain it again
    // after the SHA advances and the label can NEVER disagree. The exact Dependabot drift this check was
    // built for became invisible, in the pin format this repository's own runbook prescribed - and the hole
    // was opened by a correct wave-1 fix for a multi-tag FALSE POSITIVE whose side effect was never weighed,
    // then locked in by that fix's own test. Reviewing the fixes, not just the code, is the lesson.
    //
    // Order matters: this is checked only AFTER a match. A `# v3` label on a commit tagged v4.0.0 is not
    // under-specified, it is WRONG, and LABEL_DISAGREES is the more useful thing to say.
    //
    // The escape hatch is load-bearing: when the commit carries ONLY floating tags, that label is the best
    // one available, and demanding a specific version there would block a pin whose author has nothing
    // better to write - a rule that cannot be satisfied is a false finding with extra steps.
    if (isFloatingVersion(pin.claimed)) {
      const specific = resolved.filter(isSpecificVersion);
      if (specific.length > 0) {
        return {
          verdict: VERDICT.LABEL_FLOATS,
          detail: `comment says ${pin.claimed}, a moving tag that follows this action to every release, so it can never disagree with the SHA; this commit is also tagged ${specific.join(", ")} - name one of those instead`,
        };
      }
    }
    // The label is accurate. Currency is a separate, advisory question - and a SHA pin is exactly where
    // staleness matters most, so the first version returning OK here without ever consulting
    // `latestVersion` meant a fixed SHA pin could never be reported BEHIND at all.
    if (currencyComparable && latestMajor !== majorOf(pin.claimed)) {
      return { verdict: VERDICT.BEHIND, detail: `label ${pin.claimed} is accurate; the current release is ${latest}` };
    }
    return {
      verdict: VERDICT.OK,
      detail: currencyComparable
        ? `label and ref agree on ${pin.claimed} (of ${names}); current release ${latest}`
        : `label and ref agree on ${pin.claimed} (of ${names}); currency NOT checked${notComparable}`,
      currencyUnknown: !currencyComparable,
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
    if (err || !currencyComparable) {
      return {
        verdict: VERDICT.OK,
        detail: `${pin.ref} is self-describing; currency NOT checked${err ? ` (${err})` : notComparable}`,
        currencyUnknown: true,
      };
    }
    if (latestMajor !== majorOf(pin.ref)) {
      return { verdict: VERDICT.BEHIND, detail: `pinned ${pin.ref}, current release is ${latest}` };
    }
    return { verdict: VERDICT.OK, detail: `${pin.ref} is self-describing and current (${latest})` };
  }

  // `other`: a full tag (`v4.1.1`) or a branch (`main`, `feature/x`).
  //
  // This branch returned OK UNCONDITIONALLY, which is review finding F7: a flatly contradicting label
  // passed at exit 0, while the identical contradiction on a bare major tag raised LABEL_CONTRADICTS_REF
  // one branch above. It also never read `resolution.error`, so a 404 or a rate limit printed a clean row.
  //
  // A FULL TAG IS SELF-DESCRIBING IN EXACTLY THE WAY A MAJOR TAG IS, so it takes the same contract: no
  // label is required, and one that is present must not contradict the ref's major. The check stays at
  // MAJOR level for the same reason it does above - `@v4.1.1 # v4.2.0` is a stale comment on a readable
  // ref, not a claim a reader can be misled by, and blocking it would block a pin that says what it is.
  const refMajor = majorOf(pin.ref);
  if (pin.claimed && refMajor !== null && majorOf(pin.claimed) !== refMajor) {
    return { verdict: VERDICT.LABEL_CONTRADICTS_REF, detail: `ref is ${pin.ref}, comment says ${pin.claimed}` };
  }
  if (refMajor === null) {
    // A branch. Nothing about it is a version, so neither the label nor currency can be judged, and the
    // report must not imply either was.
    return {
      verdict: VERDICT.OK,
      detail: `ref ${pin.ref} is a branch; no version contract applies and currency cannot be judged`,
      currencyUnknown: true,
    };
  }
  if (err || !currencyComparable) {
    return {
      verdict: VERDICT.OK,
      detail: `${pin.ref} is a full tag and self-describing; currency NOT checked${err ? ` (${err})` : notComparable}`,
      currencyUnknown: true,
    };
  }
  // Leaving a full-tag pin permanently uncheckable for currency would be F6's blind spot in a second place.
  if (latestMajor !== refMajor) {
    return { verdict: VERDICT.BEHIND, detail: `pinned ${pin.ref}, current release is ${latest}` };
  }
  return { verdict: VERDICT.OK, detail: `${pin.ref} is a full tag and current (${latest})` };
}

/**
 * Every pin with its verdict, plus the counts the exit code and the renderer both read.
 *
 * `resolveFor` is a FUNCTION from pin to resolution, not a map. That is deliberate: currency is a fact
 * about an ACTION (one lookup serves every pin of it) while a SHA resolves per REF, so a by-action map
 * cannot express both. Passing the seam as a function keeps this module ignorant of how the caller
 * batched its lookups, which is the whole reason it stays pure.
 */
export function buildReport(pins, resolveFor, { sources = null } = {}) {
  const rows = pins.map((pin) => ({ ...pin, ...evaluatePin(pin, resolveFor(pin)) }));
  const count = (v) => rows.filter((r) => r.verdict === v).length;
  return {
    rows,
    counts: {
      total: rows.length,
      ok: count(VERDICT.OK),
      labelDisagrees: count(VERDICT.LABEL_DISAGREES),
      labelMissing: count(VERDICT.LABEL_MISSING),
      labelFloats: count(VERDICT.LABEL_FLOATS),
      labelContradicts: count(VERDICT.LABEL_CONTRADICTS_REF),
      behind: count(VERDICT.BEHIND),
      unresolved: count(VERDICT.UNRESOLVED),
      currencyUnknown: rows.filter((r) => r.currencyUnknown).length,
      // How many FILES were read to produce the rows above, when the caller knows. `0 pins` is a clean
      // pass when it comes from files that were read and held none, and a meaningless one when it comes
      // from a directory the tool should never have been pointed at. Review finding F11: those two
      // rendered identically, so the report now says which it was.
      sources: typeof sources === "number" ? sources : null,
    },
  };
}

/** Every blocking label condition, as one number. */
export function labelProblems(counts) {
  return counts.labelDisagrees + counts.labelMissing + counts.labelFloats + counts.labelContradicts;
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
  [VERDICT.LABEL_FLOATS]: "FAIL",
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
    `${c.total} pins${c.sources === null ? "" : ` read from ${c.sources} file(s)`}: ${c.ok} ok, ` +
      `${labelProblems(c)} label problem(s), ${c.behind} behind (advisory), ${c.unresolved} unresolved.`
  );
  const exit = exitCodeFor(report);
  if (exit === 1) {
    lines.push(
      "A pin's LABEL does not correctly name what its REF resolves to. Correct the comment; do not change the SHA to match the comment. A label naming a floating tag such as `# v3` must be replaced with the specific version that commit carries, or it can never disagree."
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
