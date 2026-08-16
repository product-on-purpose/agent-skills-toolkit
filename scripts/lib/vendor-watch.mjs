// what-it-is:   the deterministic half of vendor-watch (ADR pack v1.14.0 follow-through)
// what-it-does: given the pinned vendor claims and the fetched text of each source page, decides for every
//               claim whether it still holds, has gone missing, or could not be checked, and how stale it is
// why:          STANDARD.md and four checks cite Claude Code behaviour as FACT. Before this, each citation was
//               a page someone read once and a date they wrote down, and on 2026-08-15 that cost a ratified
//               ADR: 0048 was accepted on a premise the vendor's own docs contradict, which an internal audit
//               had already found five days earlier. A claim nobody re-reads is a claim that silently expires
// used-by:      scripts/vendor-watch.mjs; covered by tests/unit/vendor-watch.test.mjs
//
// PURE BY CONSTRUCTION. Nothing here reads a file, opens a socket, or looks at the clock: the caller passes
// the pin, the fetched text, and `today`. That is what makes the whole decision table testable offline, and it
// mirrors how standards-watch separates its differ from its CLI.

/** Claim outcomes, ordered by how much a human needs to care. */
export const VERDICT = Object.freeze({
  HOLDS: "holds",
  MISSING: "missing",
  UNCHECKABLE: "uncheckable",
  STALE: "stale",
});

/** A claim older than this wants re-verification even when it still holds. */
export const FRESHNESS_DAYS = 30;

// Punctuation a docs pipeline rewrites without changing meaning: curly quotes, and the two long dashes.
// Built from char codes rather than written literally because this repository's own PreToolUse hook refuses
// to write en/em dashes to disk. The rule is about prose, and a regex character class in a source file is
// still bytes on disk, so the constraint holds and this is the honest way to satisfy it.
const SMART_QUOTES = new RegExp("[" + String.fromCharCode(0x2018, 0x2019, 0x201c, 0x201d) + "]", "g");
const LONG_DASHES = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]", "g");

/**
 * Compare page text against a claim the way a READER would, not the way a byte-differ would.
 *
 * A vendor doc page changes constantly - navigation, CSS, unrelated sections - so pinning a page HASH would
 * fire on every one of those and be ignored within a month. What this repository actually depends on is not
 * "the page" but specific SENTENCES, so that is what is pinned and that is what is checked.
 *
 * Normalisation is deliberately narrow: case, whitespace runs, inline-code punctuation, and the characters
 * above. Anything wider would start matching claims that are no longer true.
 */
export function normalizeForMatch(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(SMART_QUOTES, "'")
    // Straight double quotes fold to the SAME character the curly ones do. Folding only the curly ones
    // was the first version, and it failed its own test: a page rendering a sentence with curly quotes
    // never matched a claim written with straight ones, which is the single most likely way a docs
    // pipeline rewrites a quoted phrase.
    .replace(/"/g, "'")
    .replace(LONG_DASHES, "-")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole days from `from` to `to`, both ISO dates. Negative when `from` is in the future. */
export function daysBetween(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

/**
 * Evaluate one claim.
 *
 * `pageText` is null when the source could not be fetched. That is UNCHECKABLE, never HOLDS: a watch that
 * reports a clean run because it could not reach the page is worse than no watch, and it is the failure mode
 * standards-watch already refuses with its own exit 2.
 *
 * A `probe` claim is ALWAYS uncheckable by fetch, and that is a property of the claim rather than a failure.
 * No page states that Claude Code registers every `.md` under `agents/`; it was established by running a
 * probe. The watch can report how old that probe is and name its reproduction, and it must not pretend to
 * have confirmed it.
 */
export function evaluateClaim(claim, pageText, today) {
  const age = daysBetween(claim.verifiedOn, today);
  const stale = age === null ? true : age > FRESHNESS_DAYS;
  const base = { id: claim.id, kind: claim.kind, age, dependsOn: claim.dependsOn ?? [] };

  if (claim.kind === "probe") {
    return {
      ...base,
      verdict: stale ? VERDICT.STALE : VERDICT.UNCHECKABLE,
      detail: stale
        ? `probe last verified ${age === null ? "never (unparseable date)" : `${age} days ago`}; re-run it`
        : "probe claim: no page states this, so a fetch cannot confirm it",
      reproduction: claim.reproduction ?? null,
    };
  }

  if (pageText == null) {
    return { ...base, verdict: VERDICT.UNCHECKABLE, detail: "source could not be fetched" };
  }

  const found = normalizeForMatch(pageText).includes(normalizeForMatch(claim.claim));
  if (!found) {
    return { ...base, verdict: VERDICT.MISSING, detail: "the pinned sentence is no longer on the page" };
  }
  return stale
    ? { ...base, verdict: VERDICT.STALE, detail: `holds, but last verified ${age} days ago` }
    : { ...base, verdict: VERDICT.HOLDS, detail: `holds (verified ${age} days ago)` };
}

/** Evaluate every claim. `pagesById` maps source id to fetched text, or to null where a fetch failed. */
export function buildReport(pin, pagesById, today) {
  const bySource = new Map((pin.sources ?? []).map((s) => [s.id, s]));
  const results = (pin.claims ?? []).map((c) =>
    Object.assign(evaluateClaim(c, pagesById[c.source] ?? null, today), {
      source: c.source,
      url: bySource.get(c.source)?.url ?? null,
      onChange: c.onChange ?? null,
    })
  );
  const count = (v) => results.filter((r) => r.verdict === v).length;
  // SOURCE-level failures, kept SEPARATE from claim verdicts (wave-1 finding). Deriving refusal from
  // claim verdicts alone let a probe-only document hide a failed fetch, because probe claims are
  // uncheckable by nature and are excluded from that test. Whether a page was READ is a property of the
  // source, not of the claims that happen to point at it.
  const sourcesFailed = (pin.sources ?? [])
    .filter((src) => (pagesById[src.id] ?? null) === null)
    .map((src) => src.id);
  return {
    today,
    freshnessDays: FRESHNESS_DAYS,
    results,
    sourcesFailed,
    summary: {
      total: results.length,
      holds: count(VERDICT.HOLDS),
      missing: count(VERDICT.MISSING),
      uncheckable: count(VERDICT.UNCHECKABLE),
      stale: count(VERDICT.STALE),
    },
  };
}

/**
 * 0 = every claim holds and none is stale.
 * 1 = a human must look: a pinned sentence is gone, or a claim has aged past the freshness window.
 * 2 = refused: a source could not be fetched, so the run proved nothing about it.
 *
 * REFUSAL OUTRANKS a clean result and is checked first. The alternative, reporting 0 because the claims we
 * could reach are fine, is exactly the "a killed run is a result" mistake this project has already recorded.
 */
export function exitCodeFor(report) {
  // REFUSAL FIRST, and it covers the two ways a run can prove NOTHING.
  //
  // (a) a SOURCE could not be read, so every claim pointing at it is unverified. Keyed off the source,
  //     not off claim verdicts: a probe-only document would otherwise hide a failed fetch, because probe
  //     claims are uncheckable by nature and are excluded from a verdict-based test (wave-1 finding).
  // (b) the claims document is EMPTY. A document that claims nothing proves nothing.
  //
  // A MISSING claim is NOT a refusal. The page was read and the sentence is gone - that is a finding a
  // human must act on, which is exit 1. Conflating them would report "could not verify" for the case
  // where verification succeeded and returned bad news.
  if ((report.sourcesFailed ?? []).length > 0) return 2;
  if (report.results.length === 0) return 2;
  if (report.summary.missing > 0 || report.summary.stale > 0) return 1;
  return 0;
}


const ICON = { holds: "ok  ", missing: "GONE", uncheckable: "-   ", stale: "OLD " };

/** The human report. Ordered worst-first, because the top of the output is what gets read. */
export function renderReport(report) {
  const rank = { missing: 0, stale: 1, uncheckable: 2, holds: 3 };
  const rows = [...report.results].sort((a, b) => rank[a.verdict] - rank[b.verdict]);
  const out = [`vendor-watch  ${report.today}  (freshness window ${report.freshnessDays} days)`, ""];
  for (const r of rows) {
    out.push(`${ICON[r.verdict]} ${r.id}  [${r.kind}]  ${r.detail}`);
    if (r.verdict === VERDICT.MISSING || r.verdict === VERDICT.STALE) {
      if (r.url) out.push(`       ${r.url}`);
      for (const d of r.dependsOn) out.push(`       depends on: ${d}`);
      if (r.reproduction) out.push(`       reproduce:  ${r.reproduction}`);
      if (r.onChange) out.push(`       on change:  ${r.onChange}`);
      out.push("");
    }
  }
  const s = report.summary;
  out.push("");
  out.push(`${s.total} claims: ${s.holds} hold, ${s.missing} MISSING, ${s.stale} stale, ${s.uncheckable} unchecked.`);
  if (s.missing > 0) {
    out.push("");
    out.push("A MISSING claim means this repository asserts something the vendor no longer says.");
    out.push("Do not update the pin until you have decided what the change means for what depends on it.");
  }
  return out.join("\n");
}
