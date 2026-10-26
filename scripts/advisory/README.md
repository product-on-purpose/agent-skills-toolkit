---
title: "scripts/advisory - folder guide"
---

# scripts/advisory

The advisory screen modules (ADR 0063): deterministic, model-free signals that report beside the tier
and never gate it. `scripts/lib/advisory-registry.mjs` declares ADV1-ADV4's metadata (advisoryId, title,
category, provenance) and runs whichever modules are registered here over a check context.

Two screens ship today, ADV1 and ADV2, both vendor-cited. ADV3 and ADV4 exist only as metadata in
`scripts/lib/advisory-registry.mjs`; their screens arrive in later changes, following the same
`{ meta, check(ctx) }` shape every `scripts/checks/*.mjs` module already uses.

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
for what is scanned: `skills/**` (every file under a loaded skill's directory - `SKILL.md` and its
bundled files), `agents/*.md` (the runtime-loaded list, recursive - `ctx.agentDocs`, not the narrower
registered `ctx.subagents`), `commands/*.md`, and `hooks/**`. The rule is "content the runtime loads into
an agent's context or executes". `docs/` pages and any `README.md` are OUT of scope by that rule: no
runtime loads or executes them, so a page that discusses or quotes an attack construct to explain it -
this repository's own troubleshooting docs are exactly that case - produces zero findings, not a false
one. A file over 1,000,000 bytes, or carrying a NUL byte in its first 8 KiB (the binary heuristic: a NUL
byte never appears in valid UTF-8 text), is skipped entirely: not scanned, and not counted in the rate
below, because it was never a candidate the screen claims to cover.

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
rate 0/1186 = 0, within the 0.005 ceiling. Audit corpus (the seven trees above; `h05`-`h09` are not
materialized on disk under the corpus's current layout - `build.mjs`'s own path resolution predates the
corpus being moved under a dated folder, so this measurement reconstructed them from `build.mjs`'s own
generator source, unexecuted and read-only, into a scratch directory outside the corpus tree): 20 files
scanned, 0 findings, 0 false fires. **Combined: 1,206 files scanned, 0 findings, 0 false fires -
measured rate 0, well within the 0.005 ceiling.** No genuine fire occurred either (role-hijack, the one
pattern whose known-limits note flagged a real false-positive risk against ordinary persona-assignment
prose, did not fire on any of the 1,206 files), so there is nothing to record as a record note for this
measurement. **Shipped: true. ADV3 is registered in `ADVISORY_MODULES`** (`scripts/lib/advisory-
registry.mjs`) as of this commit, because the measured rate clears the pre-registered ceiling.

This repository's own count: 148 files scanned under this toolkit's own tree, 0 ADV3 findings.

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
