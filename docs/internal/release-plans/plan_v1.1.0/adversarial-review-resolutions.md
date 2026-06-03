# v1.1.0 adversarial review: findings and resolutions

A read-only 4-lens adversarial Workflow reviewed the unreleased v1.1.0 build-out (`v1.0.0...HEAD`,
262 files, 27 agents, 22 findings, each independently verified against source and against the repo's
own bundled `mermaid@11.15.0`) on 2026-06-03, before the maintainer-gated v1.1.0 tag. The Codex
adversarial-review CLI was attempted first and hung (the documented Windows failure mode), so the
review ran as an own-agent Workflow, the same pattern every P0-P6 phase gate used.

This document records every finding, its verified verdict, and how it was resolved. The fixes land on
branch `fix/adversarial-review-v1.1.0`. Review verdict before fixes: `release_ready: no`,
`blocking_count: 1`. After the fixes below: gate Advanced 0/0, 280 tests green.

## Summary

| # | Finding | Verified severity | Resolution |
| - | ------- | ----------------- | ---------- |
| 1 | U12 false-rejects Mermaid opening with `%%{init}%%` / `%%` comment / `---` frontmatter (BLOCKER) | major (2 lenses) | Fixed |
| 2 | U12 bracket rule false-positives on a bracket inside a `%%` comment | major -> minor | Fixed |
| 3 | gen-docs-site drops reference-style link defs on a CRLF checkout | major (latent) | Fixed |
| 4 | G8 inventory parser does not strip fenced examples (masks drift / phantom) | major -> minor | Fixed |
| 5 | U8 manifest-drift version drift is only WARN; gate not authoritative for the tag invariant | minor | Fixed |
| 6 | G10 architecture-pair resolution is readdir-order-dependent on a duplicate marker | observation | Fixed |
| 7 | RELEASE-NOTES per-version section is not tag-blocking (silent full-file publish) | minor | Fixed (CI half) |
| 8 | ci.yml comment attributes generation to a non-existent `prebuild` hook | minor | Fixed |
| 9 | G10 runtime message overclaims "the 3-line decision summary" | (verify nit) | Fixed |
| 10 | No Standard-versioning/compatibility policy; tightening shipped as a minor bump | major | Deferred -> ADR 0027 (Proposed) |
| 11 | G8/G9/G10/U12 hard-code this repo's house style with no per-plugin config | minor | Deferred (roadmap) |
| 12 | Generating docs at astro.config load is impure/non-idempotent | minor | Deferred (comment half fixed) |
| 13 | CRLF is a whole bug class; `.gitattributes eol=lf` would close it | minor | Deferred (own PR) |
| 14 | G7 description colon-space rule grades prose shape, not validity | minor | Deferred (intentional per ADR 0024 D3) |
| 15 | G10 `## TL;DR` spelling + NNNN ADR filename pattern are strict | minor | Deferred (normative in STANDARD.md) |
| 16 | G9 SCOPE_ROOTS is the literal repo layout (tools/ omitted) | observation | Deferred (roadmap) |
| 17 | G10 should accept Starlight slug links | refuted | No change |
| 18 | G8-G10 are thin proxies "masquerading" as quality gates | partially refuted | Partly addressed (#4, #9) |

## Fixed in this PR

### 1. U12 mermaid-valid false-rejection (the blocker)
**Issue.** `scripts/checks/mermaid-valid.mjs` took the first non-blank body line and required it to
`startsWith` a diagram keyword, with no handling of the three constructs Mermaid documents BEFORE the
diagram-type line and strips before type detection: a `%%{init: {...}}%%` theming directive, a `%%`
comment, and a `---`-fenced YAML config block. A validly branded diagram (the v1.1.0 notes tout
"branded mermaid") was rejected with `does not start with a recognized diagram keyword`. U12 is a
Bronze/Universal MUST gating every tier, and the toolkit's own diagrams use none of these constructs,
so the defect was invisible in dogfooding while it would false-fail third-party plugins, contradicting
the Standard's grade-other-libraries promise. A secondary defect: findings cited `b.startLine` (the
fence opener), not the offending body line.

**Solution.** Added `diagramLine(bodyLines)`, which skips a leading `---` frontmatter block and any
`%%` directive/comment lines, then returns the first real diagram line and its index; the keyword test
and the finding's line number now use it. Added committed golden diagrams (init directive, leading
comment, `---` config block) to `tests/fixtures/golden/mermaid-ok/docs/diagram.md` so the repo's own
U12 self-scan dogfoods all three constructs (a regression now turns the gate red), plus five temp-dir
regression tests.

### 2. U12 bracket false-positive on a comment bracket
**Issue.** `bracketsBalanced` scanned the whole body honoring only `"..."` spans; a lone `(` or `[`
inside `%%` comment prose (or inside an init directive's JSON braces) made a valid diagram fail.

**Solution.** Added `stripComments(s)`, which removes `%%`-to-end-of-line (honoring quoted spans) before
bracket counting. Covered by the golden comment-with-stray-bracket diagram and a temp-dir test.

### 3. gen-docs-site CRLF reference-style link bug
**Issue.** `site/scripts/gen-docs-site.mjs` `rewriteBodyLinks` split on `'\n'`, so on a CRLF checkout
every line kept a trailing `\r`. The reference-style definition regex (`[label]: target`) could not
consume the `\r` (`.` excludes it; `$` without `/m` will not match before it), so those targets were
left un-rewritten and would be browser-broken on the published site. Same bug class as the
previously-fixed fence-trim bug; latent today (zero relative reference-style defs in the tree) and the
14.11 link guard would turn a leak into a red build rather than a silent bad publish.

**Solution.** Split on `/\r?\n/` (rejoined with `\n`, normalizing generated output to LF). Added a
`transform()` regression test feeding a CRLF reference-style definition.

### 4. G8 folder-readme fenced-example parsing
**Issue.** `parseInventory` walked raw lines, so a `- \`name\`` list item inside a fenced EXAMPLE block
both counted as a listed child (masking a real under-listed child) and could inject a phantom error.
G10's sibling check already strips fences; G8 did not (an inconsistency within the same release).

**Solution.** Added a local `stripFences(text)` and parse the inventory over the stripped text. Two
temp-dir tests: a fenced example must not inject a phantom; a child listed only inside a fence must
still be flagged under-listed.

### 5. U8 manifest-drift version drift to ERROR
**Issue.** `manifest-drift` (U8) compared the native manifests' version to library.json but emitted
`warn`; the gate's exit code only counts errors, so a maintainer who bumped library.json/package.json
but forgot the native manifests would see a green local gate (exit 0). The only hard guard for that
exact invariant was the CI tag shell in release.yml, not the portable gate a contributor runs.

**Solution.** Version drift now emits `SEVERITY.ERROR` (name drift stays WARN, the cosmetic case the
tag guard does not gate on), so a single `node scripts/check.mjs .` is authoritative for what the tag
guard enforces. Tests updated; no impact on the toolkit's own gate (its five manifests are consistent
at 1.1.0). This is itself a tightening of an existing check; see ADR 0027 and the note below.

### 6. G10 architecture-pair order-independence
**Issue.** `docs-presence` rule 3 assigned overview/detailed by last-writer-wins over an unsorted
`readdir`, so two pages carrying the same `doc-role` marker made pass/fail filesystem-order-dependent
(NTFS vs ext4 vs APFS). The toolkit itself is safe (its apparent second marker is inside a fenced
example, never parsed as frontmatter).

**Solution.** Collect all overview and all detailed pages; emit an explicit duplicate-marker error when
either count exceeds one (names sorted so the message is identical across filesystems); resolve the
link only when the pair is unambiguous. Temp-dir test added.

### 7. RELEASE-NOTES per-version guard (CI half)
**Issue.** release.yml extracted the `## <version>` section, but on a miss did `cp RELEASE-NOTES.md
RELEASE_BODY.md`, silently publishing the whole changelog as the release body; G5 only checks
presence/non-emptiness/distinctness, never a per-version heading.

**Solution.** Replaced the `cp` fallback with `exit 1` and an actionable error, so a missing
`## <version>` section fails the tag instead of mispublishing. (The 1.1.0 section exists and extracts
correctly.) The cross-plugin G5 assertion of a version heading is a contract tightening and is deferred
under the same reasoning as ADR 0027.

### 8 and 9. Doc/message accuracy
- ci.yml's comment attributing generation to a "prebuild hook" is corrected to "when astro.config.mjs
  loads" (the `astro.config.mjs` and recipe comments were already accurate). 
- G10's ADR-missing-TL;DR message no longer claims "the 3-line decision summary" (the check verifies
  the heading's presence, not a line count); it now reads "a decision summary under a ## TL;DR heading".

## Deferred (documented, not changed in this PR)

These are real but were left out deliberately, each for a stated reason. None blocks the v1.1.0 tag.

- **10. Standard-versioning/compatibility policy (major).** The gate never reads `library.json.standard`,
  and v0.10 added four hard checks as a minor bump, so a plugin pinned to 0.9 can be silently re-graded
  and regress. This reshapes the public conformance contract and the gate's grading semantics, so it is
  a maintainer decision, recorded as **ADR 0027 (Proposed)** with a recommended burndown + standard-aware
  gate design. Latent today (the toolkit is the only graded plugin).
- **11 / 16. House-style hard-coding and SCOPE_ROOTS (minor/observation).** G8/G9/G10/U12 bake in
  concrete tokens (Diataxis names, `## TL;DR`, `doc-role` values, the four-field docblock vocabulary,
  `SCOPE_ROOTS = scripts/site/scripts/hooks` with `tools/` omitted). Making these configurable via
  `library.json` (defaulting to the toolkit's values) is a feature with config-schema design surface;
  deferred to the roadmap and tied to ADR 0027's pinned-standard work. No current victim (sole grader).
- **12. Generation as a config-load side effect (minor).** Moving `generate()` out of `astro.config.mjs`
  into a content-collection loader or an explicit prebuild step is a design change; deferred. The
  concrete defect it cited (a stale "prebuild hook" comment) is fixed in #8.
- **13. `.gitattributes eol=lf` (minor).** Committing `* text=auto eol=lf` would close the entire CRLF
  bug class for every check and the generator at once, but it triggers a repo-wide renormalization diff
  with a large blast radius, so it belongs in its own focused PR. The actual reference-style-link bug is
  fixed in code (#3), so the class's one live instance is closed.
- **14. G7 description colon-space rule (minor).** The verify found this is intentional per ADR 0024 D3
  (a U5 description-shape convention and anti-trigger-artifact rule), not a YAML-validity proxy.
  Loosening it would change the normative Standard, so it is deferred to the same configurability/
  versioning track rather than altered unilaterally.
- **15. G10 `## TL;DR` spelling and NNNN ADR filename pattern (minor).** STANDARD.md normatively pins
  the literal `## TL;DR`; broadening the accepted headings/filenames requires amending the Standard, so
  it rides with ADR 0027 / the configurability work.

## Refuted / no change

- **17. G10-by-slug (refuted).** The documented authoring convention is filesystem-relative `.md`; the
  generator and the 14.11 link guard treat a slug-in-source as broken. Accepting slug links in G10 would
  introduce inconsistency, not remove it. No change.
- **18. "Thin proxy / masquerade" (partially refuted).** The binding STANDARD.md text for G8-G10 already
  claims only presence/linkage, not prose quality, and routes "is it a good guide" to the behavioral
  `askit-evaluate` path. The two surviving sub-points are addressed: the G8 fenced-example soundness hole
  (#4) and the overclaiming runtime message (#9).

## Verification

- `npm test`: 280 pass / 0 fail (was 270; +10 regression tests across U12, the generator, G8, U8, G10).
- `node scripts/check.mjs .`: Tier Advanced, 0 errors, 0 warnings (the new golden mermaid diagrams are
  dogfooded by the repo's own U12 self-scan; the manifest-drift ERROR change leaves the gate green
  because the five manifests are consistent at 1.1.0).
