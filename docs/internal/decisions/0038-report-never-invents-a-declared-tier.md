# 0038 - The report never invents a declared tier

## TL;DR
- **Decision:** `deriveModel` in `scripts/lib/report-render.mjs` stops falling back to `report.tier` when `library.json` carries no tier. `declaredTier` is now `lib?.tier ?? null`, and every one of the five render sites states plainly that no tier was declared rather than printing one. The gate verdict, the earned tier, and the finding set are all unchanged; this is a truthfulness fix in the presentation layer only.
- **Why:** the fallback used the **earned** tier as the **declared** tier. A subject with no `library.json` therefore rendered `"<subject> declares the Gold (Advanced) tier and earns Gold"`, and because earned then trivially equalled "declared", the HTML verdict card always read `"matches its declared tier"`. That is a **false PASS on the artifact third parties are shown**, asserting both a declaration that does not exist and a grade that was never earned against the full ladder. The terminal gate said the honest thing about the same bytes the whole time.
- **Scope and honesty:** found by corpus batch 3 (sensor reading 19) on a real third-party target, then reproduced by hand on a minimal fixture before being accepted. Fixed under R2 (v1.8.0 "deep builders, measured advisory") rather than deferred, because R3 (v1.9.0 "marketplace scope") renders one conformance report **per marketplace member**, so shipping R3 on top of this would multiply the defect by the size of every marketplace graded.
- **Status:** Accepted.

- **Date:** 2026-07-26
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- ADR 0030 (calibrate U6/U11) - decided that a plugin which never declared an askit tier must not be reported as having earned one. That decision was implemented in `tier-report.mjs` `humanLine()` and **never mirrored into the renderer**. This ADR finishes it.
- ADR 0034 (resolve profiles in component scope) - the same shape of bug: a code path that looked correct because its sibling path was correct.
- Corpus batch 3, reading 19 (`docs/internal/eval-runs/eval-runs.md`).

## Context and problem statement

`humanLine()` has carried this guard since ADR 0030:

```js
if (r.declaredTier == null && r.tier !== "none") {
  return `Objective checks pass (no askit tier declared; not graded against the tier ladder).`;
}
```

`deriveModel()` carried the opposite:

```js
declaredTier: lib?.tier ?? (isPlugin ? report.tier : null),
```

So the two surfaces disagreed about the same bytes. On a minimal fixture with no `library.json`:

| Surface | Output |
|---|---|
| `check.mjs` (terminal) | `Objective checks pass (no askit tier declared; not graded against the tier ladder).` |
| `evaluate.mjs --report=conformance` | `notier declares the Gold (Advanced) tier and earns Gold. Of the 30 checks in the spine, 30 do not fail` |

The report is the shareable artifact. It is the one a maintainer sends to a stakeholder and the one a showcase would publish. It was the dishonest one.

Batch 3 found this on `TerminalSkills/skills`, where a member rendered "Gold / Advanced (10 checks) - 10 of 10 satisfied" under `--profile plain-plugin` while the same bytes under the default ladder returned seven errors including `G2`, `G5`, `G4`, and `G8`. The JSON `byRule` carried every one of them with `effectiveSeverity: "off"`. **The report had the evidence and printed the opposite.**

## Decision drivers
- **A false PASS is the worst failure mode a grading tool has.** A missed defect is a gap; an asserted pass that is not true is an active misstatement, and it is worse on the artifact built for sharing than in a terminal.
- **The fallback was not a safe default.** Substituting the earned tier for the declared one is not a graceful degradation, it is a fabrication, and it silently converts "ungraded" into "top grade".
- **R3 multiplies it.** Marketplace scope renders one report per member. The defect had to be fixed before that, not after.
- **Presentation only.** No check, no severity, no verdict, no exit code changes, so R2's non-goals (no new check, no severity change, no Standard bump) are respected.

## Considered options
1. **`declaredTier: lib?.tier ?? null`, and every render site handles null explicitly.** (chosen) Detailed below.
2. **Carry `declaredTier` explicitly on the report object from `evaluate.mjs`.** Cleaner in principle, since the renderer would stop inferring anything. Rejected for this release as a larger change to the report contract that other consumers read; the null-handling fix is complete on its own. Recorded as a follow-up.
3. **Suppress the whole tier section when nothing is declared.** Rejected: silence invites the reader to assume the tool did not check, when in fact it checked and the subject opted out of the ladder. Saying so is more useful than hiding it.
4. **Leave it and file for a later release** (the R2-5 default for a batch-3 finding). Rejected: R2-5 exists to stop calibration changes being smuggled into a sensor pass. This is not a calibration, it is a false statement on a public surface, and the release that follows renders it per marketplace member.

## Decision outcome

Option 1, at all five sites that read `m.declaredTier`:

| Site | Before | After |
|---|---|---|
| `deriveModel` | `lib?.tier ?? (isPlugin ? report.tier : null)` | `lib?.tier ?? null` |
| Markdown summary sentence | `"<subject> declares the Gold (Advanced) tier and earns Gold"` | `"<subject> declares no askit tier, so it is not graded against the tier ladder; the objective checks are reported on their own terms"` |
| Markdown identity row | `undefined (undefined)` | `none declared` |
| HTML meta row | `undefined` | `none declared` |
| HTML verdict card | `"Declared X; matches its declared tier"` | `"No askit tier declared; not graded against the tier ladder"` |

**Tests (TDD, RED first).** Two added to `tests/unit/report-render.test.mjs`: a subject with no declared tier must not be reported as declaring one and must say so plainly; and the false-FAIL guard, that a subject which **does** declare a tier still reports it normally. Both assertions are subject-anchored, because a loose `/declares the .*tier/` also matches the glossary row explaining what `library.json` is for - a true sentence, and not the claim under test. Suite 516 -> 518; gate Advanced 0/0.

## Consequences
- **Positive:** the report and the terminal now agree on every subject. A plugin that has not adopted the Standard is described accurately instead of being handed a Gold grade it never claimed. `U1` (`library-json`) already flags the missing manifest, so the reader still learns what to do.
- **Negative / accepted:** a report for an undeclared subject now has a visibly empty "declared tier" field. That is the honest rendering of an absent fact, and preferable to a plausible-looking wrong one.
- **The generalizable lesson, recorded because it has now happened three times.** ADR 0030 made a decision, and the decision was implemented in one of the two places that needed it. The same shape appears in ADR 0034 (a flag validated in one scope and dropped in the other) and in the two CodeQL escaping defects fixed in v1.7.0 (the same mistake in two independently-written functions). **When a decision constrains behavior, grep for every site that implements that behavior, not just the one that prompted the decision.** The renderer had the evidence in `byRule` and printed the opposite for two months.
- **Follow-up filed, not done:** option 2, carrying `declaredTier` explicitly on the report object so the renderer infers nothing at all.

## Implementation sites
Fixed by ADR 0038:
- `scripts/lib/report-render.mjs` - `deriveModel()`: `declaredTier: lib?.tier ?? null`, the root change; the comment above it explains the exact defect this replaces.
- `scripts/lib/report-render.mjs` - verdict card (HTML, line ~801): `m.declaredTier ? ... : "No askit tier declared; not graded against the tier ladder"`.
- `scripts/lib/report-render.mjs` - `declLine` variable (Markdown exec section, line ~234): `m.declaredTier ? "declares the X tier" : "declares no askit tier..."`.
- `scripts/lib/report-render.mjs` - Markdown ID table row (line ~260): `m.declaredTier ? ... : "none declared"`.
- `scripts/lib/report-render.mjs` - Markdown metadata table row (line ~425): `m.declaredTier ?? "none declared"`.

**Missed by ADR 0038, found during Implementation sites retrofit and fixed in feat/adr-implementation-sites:**
- `scripts/lib/report-render.mjs` - HTML exec body paragraph (`htmlDeclLine` variable, line ~815): the symmetric HTML equivalent of `declLine`; was still saying "declares the () tier" when null.
- `scripts/lib/report-render.mjs` - HTML masthead header (line ~807): `escapeHtml(m.declaredTier ?? "none declared")`; was showing empty string.
- `scripts/lib/report-render.mjs` - HTML ID-strip cell (line ~822): `m.declaredTier ? ... : "none declared"`; was showing "null (null)".
- `scripts/lib/report-render.mjs` - HTML metadata section (line ~888): `m.declaredTier ?? "none declared"`; was showing empty string.

The four missed sites were caught by running `grep -rn "declaredTier" scripts/` as part of the Implementation sites retrofit. Two tests were added to `tests/unit/report-render.test.mjs` to assert both the HTML no-declared-tier case and the HTML false-FAIL guard.

Grep anchor: `declaredTier` in `scripts/lib/report-render.mjs` - verify every read guards the null case (either a ternary with a "none declared" branch, or `?? "none declared"`, or `?? null` where null is handled by the calling expression).
