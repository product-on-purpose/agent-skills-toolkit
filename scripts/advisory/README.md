---
title: "scripts/advisory - folder guide"
---

# scripts/advisory

The advisory screen modules (ADR 0063): deterministic, model-free signals that report beside the tier
and never gate it. `scripts/lib/advisory-registry.mjs` declares ADV1-ADV4's metadata (advisoryId, title,
category, provenance) and runs whichever modules are registered here over a check context.

Four screens ship today, all registered in `scripts/lib/advisory-registry.mjs`'s `ADVISORY_MODULES`:
ADV1 and ADV2, both vendor-cited; ADV3, objective; and, as of W6, ADV4, house.

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
rate, because it was never a candidate the screen claims to cover; this filter applies equally to
files read from disk and to `ctx.agentDocs`/`ctx.commands` content loaded by the runtime.

**The pre-registered false-positive ceiling and every measurement against it moved to
[`docs/reference/health-score.md`](../../docs/reference/health-score.md#adv3-false-positive-ceiling-record)
(W6)**, beside the health number's own pre-registered cut points - both are calibration records for the
same advisory layer, and keeping them in one page is what stops a future reader checking two places for
"what was pre-registered before measurement, and what did the measurement show". `ADVISORY_MODULES`
above still carries ADV3 as of this commit, because the measured family rate cleared the ceiling that
page records.

## ADV4 - substance signals (E61, house)

ADV4 (ADR 0063 sec 2, W6) flags three signals over a plugin's own skills: a body at or under the
pre-registered word-count floor (`BODY_WORD_FLOOR`, 20 words), a description duplicated across sibling
skills at or above the pre-registered Jaccard similarity threshold (`DESCRIPTION_DUPLICATE_THRESHOLD`,
0.7, over the same tokeniser ADR 0039's `triggerSurfaceOverlap()` uses), and a body matching a generic
placeholder-text catalogue (`PLACEHOLDER_PHRASES`) that deliberately contains none of any fixture's
literal words. House provenance: no vendor sets a body-length floor or a similarity threshold, the same
reason ADR 0029 reclassified `U5`'s description scorer as house. `adv4-substance.mjs` also exports
`measure(ctx)`, the raw per-skill signal `scripts/lib/health-score.mjs`'s substance health category
reads - computed straight from `ctx`, never from `check()`'s own findings, so a profile or a
suppression can never move the health number. See
`docs/reference/health-score.md` for the pre-registered cut points and the falsifiable test over
`tests/fixtures/audit-corpus/potemkin-gold/`.

## Inventory

- `adv1-portability.mjs` - ADV1: a top-level SKILL.md frontmatter key outside the Skills API's six-field
  whitelist (`allowed-tools`, `compatibility`, `description`, `license`, `metadata`, `name`). Whitelist
  half only; see the reserved-words note above.
- `adv2-preload-cap.mjs` - ADV2: a subagent `skills:` frontmatter list naming more than 32 distinct
  skills, the count Claude Code preloads into the subagent's startup context.
- `adv4-substance.mjs` - ADV4: the substance-signal screen and `measure()`, the raw per-skill
  measurement the health number's substance category reads. See the ADV4 heading above.
- `security-patterns.json` - the ADV3 pattern catalogue: pipe-to-shell, dangerous-command and
  prompt-injection patterns, each with an id, class, matcher, cited source and known-limits note. See
  the ADV3 heading above for the scope rule; the pre-registered false-positive ceiling and its
  measurements live in `docs/reference/health-score.md`.
- `adv3-security.mjs` - the ADV3 screen module: `listScanTargets()` (the scan-scope implementation and
  the false-positive-rate denominator) and `check(ctx, opts)` (compiles the catalogue and runs it line
  by line over every in-scope target). `opts.catalogue` and `opts.scopeRoots` are test-only injection
  points (the mutation tests and the scope-widening mutant); `scripts/lib/advisory-registry.mjs` never
  sets either. **Registered in `ADVISORY_MODULES`** - see `docs/reference/health-score.md` for the
  measured false-positive rate that cleared the pre-registered ceiling.
