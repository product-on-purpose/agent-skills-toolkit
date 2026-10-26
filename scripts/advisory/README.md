---
title: "scripts/advisory - folder guide"
---

# scripts/advisory

The advisory screen modules (ADR 0063): deterministic, model-free signals that report beside the tier
and never gate it. `scripts/lib/advisory-registry.mjs` declares ADV1-ADV4's metadata (advisoryId, title,
category, provenance) and runs whichever modules are registered here over a check context.

Three screens ship today, all registered in `scripts/lib/advisory-registry.mjs`'s `ADVISORY_MODULES`:
ADV1 and ADV2, both vendor-cited, and ADV3, objective. ADV4 exists only as metadata in
`advisory-registry.mjs`; its screen arrives in a later change, following the same `{ meta, check(ctx) }`
shape every `scripts/checks/*.mjs` module already uses.

**ADV1's reserved-words half is deliberately NOT shipped.** `adv1-portability.mjs` screens only the
Skills API's six-field frontmatter whitelist (E86). The platform.claude.com Agent Skills page also
states that a Skills API `name` cannot contain the reserved words "anthropic" or "claude", but that
text is a bullet fragment, not a quotable sentence, so pinning it needs a `probe` claim and a third
vendor-watch freshness clock. The maintainer has not ruled on minting that probe - see
`docs/internal/roadmap.md` section 7 ("Blocked and awaiting a ruling"), "One item awaits a maintainer
ruling as of 2026-10-25: whether ADV1 (portability) mints a third vendor probe." No reserved-word
matcher, no platform.claude.com source, and no probe claim exist in this repository until that ruling.

## ADV3 - the security screen (RS-E4, objective)

ADV3 (docs/internal/decisions/0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md)
carries RS-E4 (docs/internal/roadmap.md, heading "RS-E4") and E6
(docs/internal/backlog/enhancements.md). It is a deterministic, data-driven pattern screen: no scoring,
no judgment, no model, and never a safety review - every finding's message says so. The catalogue lives
at `scripts/advisory/security-patterns.json`; every pattern carries an id, a class, a matcher (a regex
source plus flags, never a stateful one), a cited source, and a known-limits note. A pattern whose only
basis is this repository's own preference is house provenance and may not enter the catalogue (ADR
0063). The three classes are ADR 0063's ADV3 row: pipe-to-shell installers (curl/wget piped to a shell,
and process-substitution forms such as `bash <(curl ...)`), dangerous commands (destructive `rm`/`chmod`/
`mkfs`/`dd`, and download-then-execute), and prompt-injection phrases (instruction-override wording).
Secrets are deliberately NOT a class here: `U11` (`scripts/checks/mcp-valid.mjs`) already scans for
inline committed secrets, and a secrets class in ADV3 would double-report the same defect.

**Scan scope.** `scripts/advisory/adv3-security.mjs`'s `listScanTargets()` is the single source of truth
for what is scanned: every file under each loaded skill's directory (`SKILL.md` and its bundled files),
`ctx.agentDocs` (the runtime-loaded `agents/*.md` list, not the narrower registered `ctx.subagents`),
`ctx.commands` (`commands/*.md`), and every file under `hooks/`. The rule is "content the runtime loads
into an agent's context or executes". The plugin's root `README.md` and `docs/` pages are OUT of scope
by that rule: no runtime loads or executes them, so a page that discusses or quotes an attack construct
to explain it - this repository's own troubleshooting docs are exactly that case - produces zero
findings, not a false one. A `README.md` that lives inside one of the four scanned roots (a skill's own
directory, `agents/`, `commands/`, `hooks/`) IS scanned, same as any other bundled file there. Known
limits of this scope rule: a shared folder outside any loaded skill's own directory (for example a
`skills/_shared/` or `skills/_template-fixture/` helper several skills import but that is not itself a
loaded skill) is out of scope, as is a hook script referenced from `hooks.json` but living outside
`hooks/`. A file over 1,000,000 bytes, or carrying a NUL byte in its first 8 KiB (the binary heuristic: a
NUL byte never appears in valid UTF-8 text), is skipped entirely - not scanned, and not counted in the
rate below, because it was never a candidate the screen claims to cover; this filter applies equally to
files read from disk and to `ctx.agentDocs`/`ctx.commands` content loaded by the runtime.

**The false-positive ceiling (pre-registered 2026-10-25, BEFORE any measurement commit; ADR 0063 /
RS-E4's required ceiling, criterion 1).**

> **At most 1 false fire per 200 scanned files, a rate of 0.005 or below, over the family corpus. If
> the measured family rate exceeds this ceiling, the catalogue does not ship:** ADV3 is committed
> (module, catalogue, fixtures, tests) but left out of `ADVISORY_MODULES` in
> `scripts/lib/advisory-registry.mjs`, and the measurement is recorded anyway, never silently omitted.

- **Denominator** = the number of files `listScanTargets()` returns over a tree (every in-scope file
  that passes the size and binary filter above). This is the same function `check()` scans, so the
  count a measurement reports can never drift from what was actually scanned.
- **Numerator** = the number of findings, among those produced over the denominator's files, that are
  **false fires** on manual examination. A false fire is a finding whose matched text is NOT a genuine
  instance of the construct its pattern's class names - the regex over-matched ordinary, unrelated text
  (for example, `prompt-injection-role-hijack`'s `you are now a/an ...` matching a benign persona
  assignment that names no prior instruction at all). A finding where the construct genuinely IS
  present - a real pipe-to-shell installer, a real destructive command, a real instruction-override
  phrase - is a **genuine fire** and never counts against the ceiling, regardless of whether the author's
  intent was malicious: the screen reports presence of the construct, not intent (RS-E4's own design
  constraint). A genuine fire is recorded as a record note instead of a false-positive count. Genuine
  fires are additionally split, where it matters to the record, into "an instruction to actually run the
  construct" versus "prose that discusses or names the construct without instructing its execution" -
  this split is informational and never changes the false-fire classification, because ADV3 is a
  presence screen, not an intent classifier.
- **Population: the family corpus and the audit corpus are measured and reported SEPARATELY, and their
  rates are never pooled.** The family corpus is this repository (the main checkout) plus the five
  `askit-own-plugins` clones (`critique-skills`, `pm-skills`, `product-lifecycle-templates`,
  `thinking-framework-skills`, `writing-style-catalog`) - six trees, all the maintainer's own work. The
  audit corpus is the seven trees the 2026-09-04 audit (`_local/audit/2026-09-04_fable-5-1-max/`)
  labelled as deserving their declared tier: `02-excellent-orphan`, `11-malformed-grader-config`,
  `h05-crlf`, `h06-bom`, `h07-latin1`, `h08-non-english`, `h09-yaml-anchors`. The audit corpus is not
  tracked under `tests/fixtures/` as of this change (W5a's item 4 in ADR 0063 sec 4 extracts the labelled
  set as a tracked fixture; until then it is read from its `_local/` location, gitignored and read-only
  to this change).
- **A pattern may be fixed BEFORE the measurement commit** if it is plainly wrong (for example, one that
  matches a single common word alone, with no surrounding construct). After the measurement commit, any
  change to a pattern requires a full re-measurement, and both measurements are recorded here, never
  only the second.

**Measured 2026-10-25 (RS-E4 criterion 1), after the ceiling above and the implementation were both
already committed.** Family corpus (this repository's main checkout, plus the five `askit-own-plugins`
clones; six trees, all read-only to this measurement): 1,186 files scanned, 0 findings, 0 false fires -
rate 0/1186 = 0, within the 0.005 ceiling. Audit corpus (the seven trees above): of the 20 files the
labelled set carries, **14 were scanned directly from the two trees materialized on disk**
(`02-excellent-orphan`, `11-malformed-grader-config`) and **6 (`h05`-`h09`) could not be checked
independently** - those five trees are not materialized on disk under the corpus's current layout
(`build.mjs`'s own path resolution predates the corpus being moved under a dated folder), so this
measurement reconstructed their file content from `build.mjs`'s own generator source, unexecuted and
read-only, into a scratch directory outside the corpus tree, rather than from a committed, independently
re-runnable source. Both halves scanned 0 findings, 0 false fires. **Combined: 14 verified files + 6
reconstructed files = 20 files, 0 findings, 0 false fires.** The pre-registered ceiling gates on the
family rate only (**rate 0/1186 = 0, well within the 0.005 ceiling**); the audit-corpus rate is reported
for completeness, with its 14/6 split stated plainly rather than presented as 20 equally-verified files.
No genuine fire occurred either (role-hijack, the one pattern whose known-limits note flagged a real
false-positive risk against ordinary persona-assignment prose, did not fire on any of the 1,206 files),
so there is nothing to record as a record note for this measurement. **Shipped: true. ADV3 is registered
in `ADVISORY_MODULES`** (`scripts/lib/advisory-registry.mjs`) as of this commit, because the measured
family rate clears the pre-registered ceiling.

This repository's own count: 148 files scanned under this toolkit's own tree, 0 ADV3 findings.

**Measurement 2 (2026-10-25, after a post-measurement-1 pattern fix).** The timing test that
accompanied measurement 1 used a generic adversarial-line heuristic that never actually entered any
pattern's backtracking region (confirmed: it passed in under a millisecond against every pattern even
while three were genuinely quadratic). Once the timing test was corrected to build a per-pattern
adversarial line from each pattern's own unbounded sub-expression, three patterns failed it:
`dangerous-command-rm-recursive-force` (2339ms against a 100,000-character line), and
`dangerous-command-curl-download-execute` / `dangerous-command-wget-download-execute` (1312ms against a
220,000-character line) - all three measured well over the 2000ms liveness bound. Per this heading's
own pre-registered rule ("a pattern may be fixed BEFORE the measurement commit if it is plainly wrong
... after it, any pattern change requires a full re-measurement, and both measurements are recorded
here"): this is AFTER measurement 1's commit, so the fix is recorded as its own measurement rather than
silently folded into measurement 1. All three matchers were bounded (the vendor's unbounded `.*`/`\w*`
spans capped at 8-300 characters, which does not change which real-world command lines match - no
legitimate command line carries an 8-letter flag run or a 300-character argument) and re-measured:
family corpus 1,186 files / 0 findings, audit corpus 14 verified + 6 reconstructed files / 0 findings,
combined 1,206 files / 0 findings - the same zero rate as measurement 1, because bounding a matcher only
narrows it and cannot introduce a match that was not already there. **Shipped: still true; no change to
the registration.** This measurement's own timing test still used only a letter-run adversarial line per
pattern (the shape that caught these three); it did not yet try a plain space-run or repeated-token
line, which is what measurement 3 below catches on four OTHER patterns - this fact is recorded here, not
edited into the past, so the gap in measurement 2's own test coverage is visible in the record.

**Measurement 3 (2026-10-25, after a review of measurement 2 found four further patterns genuinely
quadratic).** A review of measurement 2 found that its per-pattern adversarial lines - each a trigger
word followed by a run of a repeated LETTER - never entered the backtracking region of four OTHER
patterns whose unbounded span is `\s+` followed by `.*` or `.*\|`: a run of plain SPACES (which `\s+` can
itself absorb in many different splits) is what is needed to enter that region, not a run of letters.
Measured directly against the then-current (post-measurement-2) catalogue, before any further change:
`pipe-to-shell-curl` 2936ms, `pipe-to-shell-wget` 2920ms, `pipe-to-shell-curl-sudo` 2933ms, and
`dangerous-command-dd-to-device` 2790ms, each against a `"<trigger> " + " ".repeat(100_000)` line (all
well over the 2000ms bound); a second repeated-token shape (`"<trigger> ".repeat(20_000)`) measured
337-589ms at a single length (60,000-100,000 characters) on the same four patterns - one data point per
pattern, not a multi-length series, but consistent with the same quadratic growth the review's own
4,000-to-50,004-character series showed directly on this shape before bounding. All four matchers were bounded the same way as
measurement 2's three (the unbounded `.*`/`\s+.*` span capped at 300 characters, which does not change
which real-world command lines match - no legitimate single command line carries a 300-character
argument between `curl`/`wget`/`dd` and the pipe or `of=/dev/`) and re-measured at 7-37ms against the
same lines. The timing test (`tests/unit/adv3-security.test.mjs`) was restructured to check every
pattern against three generic adversarial shapes (a space run, a repeated-token run, and a letter run,
each built from the pattern's own trigger word) plus a pattern-specific line where one is needed, rather
than one hand-picked shape per pattern, so a fifth matcher shaped like these four cannot pass the same
way these four did against measurement 2's narrower test. Re-measured: family corpus 1,186 files / 0
findings (rate 0/1186 = 0, within the 0.005 ceiling - this is what the pre-registered rule gates on).
Audit corpus: the 14 verified files (`02-excellent-orphan`, `11-malformed-grader-config`) were
re-scanned directly from disk, 0 findings. **The 6 reconstructed `h05`-`h09` files were NOT re-scanned
this round** - the scratch reconstruction measurements 1 and 2 used no longer exists (it was session-
scoped scratch, not a committed artifact), and `build.mjs`'s own path resolution is confirmed broken
under the corpus's current layout (verified directly: it resolves `REPO` to a doubled, invalid Windows
path), so reconstructing them again was not attempted this round rather than silently skipped. By the
same narrowing argument stated above, bounding a matcher cannot have introduced a match in those 6
files that measurement 2 did not already find (0), but that is an inference from the matcher change,
not a measurement - it is recorded as such, not folded into a false "re-measured" combined count. This
round's audit-corpus total is therefore **14 scanned, 0 findings**, not 20; the combined scanned count
for measurement 3 is **1,200 files, 0 findings**, not the 1,206 of measurements 1-2. `addLoaded()` (the `ctx.agentDocs`/
`ctx.commands` loader inside `listScanTargets()`) was also found, in the same review, to skip the
1,000,000-byte size filter and the NUL-byte binary filter that `addFromDisk()` already applied; it now
applies both, which does not change this measurement's denominator (no family or audit-corpus file in
scope is oversized or binary-looking) but closes the gap for a future tree that has one. Measurement 2's own text above states the
`dangerous-command-curl-download-execute`/`wget` figure as "1312ms ... well over the 2000ms liveness
bound" - 1312 is in fact under 2000, so that sentence is inconsistent with the figure it reports. Left
as written rather than silently edited; the record does not show why it was written that way, and this
is flagged here as a record note for the main loop rather than resolved with an invented explanation.
**Shipped: still true; no change to the registration.**

**Correction to measurement 2 (2026-10-25, by measurement, not inference).** The original
`dangerous-command-curl-download-execute` and `dangerous-command-wget-download-execute` matchers (from
commit `dbb36a8`) were re-timed against the same `"curl " + " && chmod x".repeat(n)` shape at five
lengths. Each doubling of the line roughly quadrupled the time: about 21ms at 27,505 characters, 84ms
at 55,005, 331ms at 110,005, 1,314ms at 220,005, and 5,209ms at 440,005. So both matchers were
genuinely quadratic, and bounding them was right. What measurement 2 got wrong is one clause: at
220,005 characters they took about 1,314ms, which is UNDER the 2000ms bound, not "well over" it. The
timing test would not have failed on them at that length. The same re-timing confirms
`dangerous-command-rm-recursive-force`'s figure: 2,383ms at 100,004 characters, over the bound. **The
timing test's lines are now 300,000 characters** (`LINE_LENGTH` in `tests/unit/adv3-security.test.mjs`),
three times the length the measurements used, because the four patterns measurement 3 bounded had
failed the bound by only 40 to 48 percent at 100,000 characters.

## Inventory

- `adv1-portability.mjs` - ADV1: a top-level SKILL.md frontmatter key outside the Skills API's six-field
  whitelist (`allowed-tools`, `compatibility`, `description`, `license`, `metadata`, `name`). Whitelist
  half only; see the reserved-words note above.
- `adv2-preload-cap.mjs` - ADV2: a subagent `skills:` frontmatter list naming more than 32 distinct
  skills, the count Claude Code preloads into the subagent's startup context.
- `security-patterns.json` - the ADV3 pattern catalogue: pipe-to-shell, dangerous-command and
  prompt-injection patterns, each with an id, class, matcher, cited source and known-limits note. See
  the ADV3 heading above for the scope rule and the pre-registered false-positive ceiling.
- `adv3-security.mjs` - the ADV3 screen module: `listScanTargets()` (the scan-scope implementation and
  the false-positive-rate denominator) and `check(ctx, opts)` (compiles the catalogue and runs it line
  by line over every in-scope target). `opts.catalogue` and `opts.scopeRoots` are test-only injection
  points (the mutation tests and the scope-widening mutant); `scripts/lib/advisory-registry.mjs` never
  sets either. **Registered in `ADVISORY_MODULES`** as of this commit - see the ADV3 heading above for
  the measured false-positive rate that cleared the pre-registered ceiling.
