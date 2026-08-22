# Release plan - v1.15.0 "a window that never closes is not a window"

- **Type:** MINOR. **Standard 0.14 to 0.15.** Two windowed checks graduate from `warn` to gate-failing `error`, and one guard is built for a class of defect this repository has now caught three times by eye and zero times by a machine.
- **Baseline:** `main` @ `901cbd9`, gate Advanced 0/0, spine 34, Standard 0.14, 24 skills, 3 evaluation scopes, 1252 tests / 0 failures. npm serves 1.14.0 with signed Sigstore provenance. 0 open PRs, 0 open issues, 0 Dependabot alerts.
- **Branch:** `release/v1.15.0`, cut from `main` after the implementation PRs merge.
- **Thesis:** a migration window is a promise that a thing becomes required **on a date**. If the window's own evidence is re-examined at the boundary and the answer is always "nobody is affected, extend it", the window was never a window - it is a permanent exemption paid in installments. This release closes the two that are due, on evidence, and states plainly what closing them costs.

> **How this document is written.** This file states **intent and acceptance criteria**. It is not a
> status report and will not be edited into one. State belongs in `README.md` in this folder, written
> **last, from the code**.

## The measurements, taken before this plan was written

Every number below was produced on **2026-08-18** against live checkouts, before any scope was committed to. Reproduction commands are in [Appendix: reproducing the measurements](#appendix-reproducing-the-measurements).

### 1. The `U17` census reproduces exactly, and that is the awkward result

[ADR 0052](../../decisions/0052-a-catalogue-manifest-no-scope-can-read-is-a-defect.md) does not merely schedule the graduation; it makes the census a **decision input**: *"If the census still shows zero mixed and zero malformed manifests when 0.15 is cut, gating a check nothing has ever tripped is worth re-examining rather than doing by default. Re-run the manifest census before graduating."*

Re-run across the same population (the seven pinned corpora, all six family members, and the `agent-plugins` registry):

| | 2026-08-14 | 2026-08-18 |
| --- | --- | --- |
| Manifests at `<root>/.claude-plugin/marketplace.json` | 7 | **7** |
| of-plugins | 6 | **6** |
| of-skills | 1 | **1** |
| **mixed** | **0** | **0** |
| **malformed** | **0** | **0** |
| unroutable entries | not measured separately | **0** |

**Unchanged in every cell.** `U17` is still preventive, not corrective.

**One coverage fact the first census did not record.** An eighth `marketplace.json` exists in the population, at `pm-skills/docs/internal/release-plans/v2.21.0/marketplace-repo-skeleton/marketplace.json`. `U17` never sees it, because the check reads exactly `<ctx.root>/.claude-plugin/marketplace.json`. That is correct behaviour and not a gap to fix here, but it means "7 manifests" is *7 manifests U17 inspects*, and the census should say so rather than implying the filesystem holds seven.

### 2. Neither graduation can move a family verdict, because neither check has anything to promote

Every family member graded at its **own** pin:

| Member | Own pin | `_workflows/` on disk / declared | `marketplace.json` | `S3`-workflow + `U17` findings |
| --- | --- | --- | --- | --- |
| `agent-skills-toolkit` | 0.14 | 0 / n/a | absent | **none** |
| `thinking-framework-skills` | 0.8 | **9 / 9** | absent | **none** |
| `writing-style-catalog` | 0.11 | 0 / n/a | absent | **none** |
| `critique-skills` | 0.12 | 0 / n/a | absent | **none** |
| `product-lifecycle-templates` | 0.12 | 0 / n/a | absent | **none** |
| `pm-skills` | no `library.json` | 12 / n/a | present | **none** |

**Zero findings from either check, on every member.** So the graduation cannot move a verdict, an error count or a warning count anywhere in the family.

### 3. The single most important number in this release: the window worked, and it completed

[ADR 0047](../../decisions/0047-workflows-are-a-loaded-component.md) created the workflow-mirror window for one reason, recorded in its own consequences: *"Part 2 without a window costs a tier, measured. `thinking-framework-skills`: Convergent to Universal, errors 1 to 10, `S3` gated errors 0 to 9."*

That member has **since remediated it**:

- At the sha the family registry graded (`dbe71d8`), `library.json` `components.workflows` was **absent**. Those are ADR 0047's nine findings.
- At `thinking-framework-skills` HEAD (`60aa2a0`), all **nine** workflows are declared and the declared names match the on-disk names exactly.
- The commit is **`fd343dd`, 2026-08-15**: *"feat(workflows): declare the nine recipes, and gate the mirror locally."* That is **one day after ADR 0047 was ratified**, and inside the window the ADR created.

A member saw a warning, understood it, and fixed it before the deadline. That is the entire designed behaviour of a warn-first migration, observed end to end for the first time in this repository. **It is also the strongest possible argument for closing the window on schedule**: extending a window whose subject has already discharged it protects nobody and teaches the next member that the date is negotiable.

**A consequence for the record: ADR 0047's cost statement is now falsified.** Its consequences section tells a future reader that graduation costs `thinking-framework-skills` nine errors. It does not, any more. That ADR takes a **dated correction** in this release (the [ADR 0045](../../decisions/0045-restricted-fields-on-plugin-shipped-agents.md) precedent: the decision stands, the forward-looking claim is corrected in place). `STATUS.md`'s v1.14.0 ADR-pack row is **not** touched - it is a correctly-dated historical measurement.

### 4. Both checks demonstrably fire, and the flip is already live in the metadata

A zero measured against an inert check is not evidence. Every failing shape was built and graded at four pins:

| Failing shape | reqId | pin 0.13 | pin 0.14 | pin 0.15 | no pin at all |
| --- | --- | --- | --- | --- | --- |
| `_workflows/orphan.md` on disk, undeclared | `S3` | `warn` | `warn` | **`error`** | **`error`** |
| `marketplace.json` that does not parse | `U17` | `warn` | `warn` | **`error`** | **`error`** |
| `marketplace.json` mixing skill and plugin sources | `U17` | `warn` | `warn` | **`error`** | **`error`** |

**The graduation needs no check-code change.** `until: "0.15"` is already committed at [`catalogue-manifest-shape.mjs:50`](../../../../scripts/checks/catalogue-manifest-shape.mjs) and [`components-index.mjs:25`](../../../../scripts/checks/components-index.mjs), and the ADR 0044 ceiling resolves it. This is exactly what ADR 0052 promised: *"`U17`'s graduation is data in the finding's `migration` metadata, so it fires when a consumer reaches 0.15 with nobody editing anything. The only human obligation is the 0.15 version note."*

The last column is ADR 0044's stated and deliberate consequence, observed rather than restated: an **unpinned** plugin has declared no compatibility floor and takes the error immediately at every stage.

### 5. `E45`'s sketched check would exit 1 today, on its first run

The [backlog entry](../../backlog/enhancements.md)'s design sketch was implemented as a throwaway probe and pointed at this repository: 29 `uses:` pins across 7 files, 8 distinct actions.

| | Result |
| --- | --- |
| Lookup refusals (exit 2) | **0** |
| Pins behind their action's current major | **0** |
| **Labels disagreeing with what the ref resolves to** | **1** |

The one finding: `release.yml:91` pins `softprops/action-gh-release@3d0d9888` with the comment `# v3 pinned 2026-07-26`, and that SHA resolves to tag **`v3.0.2`**.

**State this precisely, because the precision is the ADR's actual question.** That comment is **not false** - `v3.0.2` is a `v3`. It is **under-specified**, and under-specification is the mechanism by which the next drift becomes invisible: when `v3.1.0` ships and someone advances the SHA, `# v3` remains literally true while naming nothing a reviewer can check. The codeql case E45 was filed from was a different and sharper failure (the comment named a *specific different* version). **Whether the check's rule is "the label must not be false" or "the label must name the version the ref resolves to" is a decision with a live instance to decide it against**, which is why this is ADR work and not a script somebody writes on a Tuesday.

## Scope

### W1 - Standard 0.15: graduate the workflow mirror (`S3`) and `U17`

Both move from `warn` to gate-failing `error`. Near-zero code:

- `STANDARD.md`: the **0.15 version note**, plus removing the "held at `warn` until 0.15" qualifiers from sec 3.4 and sec 12 so the normative text and the metadata agree. (The v1.14.0 wave-2 lesson: the shipped Standard contradicted itself across three sections and a test now holds them in agreement.)
- `library.json`: `standard` pin 0.14 to 0.15, and the front-door claims that mirror it.
- **No check-code edit.** The `until: "0.15"` metadata already fires; see measurement 4.
- Tests asserting the shapes are still `warn` **at 0.14** must stay green - the graduation must not retroactively change what a 0.14-pinned consumer sees.
- A **dated correction on ADR 0047**, per measurement 3.
- A **dated addendum to ADR 0052** carrying the census table and ratifying the graduation, because ADR 0052 explicitly reserved this as *"a decision for 0.15, with evidence"*. Writing the decision down is the obligation; the evidence is measurement 1.

**Why `U17` graduates despite a census that argues for re-examination**, stated as the decision it is:

The census is unchanged and will very likely be unchanged at 0.16 too, because nothing in the plan schedules corpus growth. So "extend the window" is not a deferral with a terminating condition; it is a decision that `U17` never gates, made without saying so. The two coherent options are **graduate at 0.15** or **demote it to permanently advisory**, and the second contradicts the warn-first design ADR 0052 ratified and would need its own ADR. Graduating costs zero on every measured subject; extending protects zero subjects. The only party either choice reaches is a future author of a manifest no tool will read, and for that author `error` is the honest severity, because the finding is not a style preference - it is "nothing will ever look at this file you wrote". The maintainer's own 2026-08-14 reasoning applies with equal force: one migration is cheaper for consumers than two.

### W2 - `E45`: a guard for the label nobody checks

ADR-first, per the v1.14.0 pattern that paid. The ADR must settle, in order:

1. **The rule.** Must a pin's comment merely be *not false*, or must it **name the version the ref resolves to**? Measurement 5 supplies the live instance. Recommendation: the stricter rule, because the weaker one passes the exact under-specification that hides the next bump.
2. **Where it sits in the exit code.** Advisory, or a fifth gate inside `npm run release-ready`? Recommendation: mirror `vendor-watch` exactly, because it is the same shape of claim (a fact about someone else's repository, asserted in this one) and the discipline is already proven: **exit 1** when a label disagrees or a pin is behind, **exit 2 when a lookup could not be performed and never a pass**, **write-incapable by construction with a test enforcing it**, and an `--allow-*-unreachable "<reason>"` override that excuses **exit 2 only**.
3. **The zero-code mitigation must be dispositioned, not ignored.** The backlog records it: stop closing Dependabot PRs, and follow a merge with a comment-only correction commit. It costs one extra commit per bump and keeps the dependency visible to Dependabot. The ADR should say why the check is worth building anyway rather than leaving the cheap option unaddressed.
4. **Placement.** `scripts/`, beside `vendor-watch.mjs` and `release-ready.mjs`. **Not** `scripts/checks/`, which is the closed spine registry `registry.mjs` imports by name. A new file there needs a `scripts/README.md` inventory entry or `G8` fails.

### W3 - Records

- `STATUS.md` "Where this is going": v1.15.0 is **the 0.15 cut plus E45**, and the evidence batch (`E16`, `E17`, `E20`, `E15`, publishing the `E13` cells as final) moves to **v1.16.0**. That line currently says v1.15.0 is the evidence batch, and it has disagreed with the release record since 2026-08-17.
- `CHANGELOG.md` `[Unreleased]` promoted to a dated `[1.15.0]` section.
- `RELEASE-NOTES.md` gets a curated user-facing entry with an `### Upgrade` section, because this release **does** move verdicts for consumers who re-pin.

## The governing invariant

**Nothing moves red-ward without a pin change**, unchanged from v1.14.0 and now load-bearing in the other direction. A consumer pinned at 0.14 or below sees no new gate failure from this release; a consumer that re-pins to 0.15 adopts both graduations deliberately. The one population with no window is the **unpinned** plugin, which is ADR 0044's stated consequence and is measured in measurement 4 rather than asserted.

`E45`'s check introduces **no spine number and no finding on any graded plugin**. It grades this repository's own workflows, not anyone else's.

## Acceptance criteria

1. **No family member's verdict moves at its own pin.** Measured per member, before and after every PR, not argued. Baseline in measurement 2.
2. **Every consumer-facing severity change verified across pins 0.14 / 0.15 / 0.16**, not just at HEAD's pin. (v1.14.0's criterion was 0.13 / 0.14 / 0.15; it shifts by one.) The 0.14 column must be **unchanged from measurement 4**, which is what proves the graduation did not reach backwards.
3. **Every fix mutation-proved:** revert it, watch its test go red, restore byte-identically. A mutation that leaves the test green proves nothing however plausible it looks.
4. **The `E45` check must be demonstrated FAILING against a real disagreement**, not only passing. Measurement 5 supplies one. A guard that has never been shown failing is not a guard, and this repository has shipped two of those (a bare-token vendor claim that could never fail, and a README drift guard covering four of five claims).
5. **`E45` must be demonstrated REFUSING**, exit 2, against an unreachable lookup. `vendor-watch`'s refusal branch is still the one half its 2026-08-17 drill never reached; do not ship a second refusal path with the same gap.
6. **Two adversarial review waves, the second pointed away from the first.** v1.13.0's evidence: rounds 2 through 7 sat flat at about five findings each, and round 8, reframed, found four HIGHs.
7. **Every review finding fixed before the tag**, not after. v1.12.0 merged on one round; round 2 then found four findings, three high, all inside round 1's fix code, and shipped as v1.12.1.
8. **`node scripts/release-ready.mjs` exits 0**, on all its gates including whatever `E45` becomes.
9. **The Standard must not contradict itself.** `standard-self-consistency.test.mjs` stays green with the 0.15 text; sec 3.4 and sec 12 must stop saying "held at warn until 0.15" once 0.15 is the pin.

## Execution constraints

**Two hard dates sit inside this release's likely window, and they block by design.**

| Date | Probe claim | What happens |
| --- | --- | --- |
| **2026-09-05** | `agents-dir-registers-every-md` | ages past the 30-day freshness window, `vendor-watch` exits 1, `release-ready` exits non-zero, **no tag can be cut** |
| **2026-09-11** | `components-share-one-namespace` | same |

A probe has no page to re-check, so its age **is** its verification, and the only remedy is a human re-running the reproduction and refreshing `verifiedOn` in [`vendor-claims.json`](../../../../foundation/claims/vendor-claims.json). Hand-editing the date without re-running is what `RELEASE.md` forbids.

- `agents-dir-registers-every-md`: install a plugin whose `agents/` holds `real-agent.md`, `README.md`, `_README.md` and `README.txt`, then list the registered subagents.
- `components-share-one-namespace`: install two plugins shipping the same skill name and observe which resolves.

**These are the maintainer's obligations, not a step this plan schedules**, because both require live plugin loading. If execution runs past 2026-09-05, the refresh is a precondition of the tag.

## Out of scope, deliberately

- **The evidence batch.** `E16` (multi-entry credit gap), `E17` (adjudication path), `E20` (key readable from inside the fixture tree), `E15` (three runner defects), and publishing the `E13` model-triple cells as final. `E16` is not an implementation task - it requires deciding what `precision` should mean when one finding satisfies two planted-defect entries, and the same advisory scored 0.42 against one key version and 1.00 against the next with no change to the advisory. That is a release, not a rider on a Standard bump. **v1.16.0.**
- **Tightening `G8` so a folder-README entry must be described and not merely listed.** It moves verdicts for every plugin that has ever passed the check, so it is ADR work under ADR 0044's ceiling, with a migration window. Recorded in #238's body.
- **`E23`'s remaining half** (provenance beside each check's result and a mix summary in the tier line). Newly visible as of 2026-08-18 and genuinely small, but it changes the gate's primary human output, which deserves its own blast-radius measurement rather than a ride on a release whose invariant is that output does not move.
- **Widening `vendor-watch` beyond Claude Code.** It pins three Claude Code pages; no Codex page and no agent-plugins.org pin is watched, and `standards-watch` is still manual on no schedule. Real, and a separate piece of work.
- **Any change to a family member repository** other than the `agent-plugins` registry pin.

## Appendix: reproducing the measurements

The three harnesses were written to the session scratchpad rather than to `scripts/`, because they are measurements rather than shipped tooling and a new `scripts/` file needs a folder-README inventory entry or `G8` fails. They are reproducible from their descriptions:

1. **Census** - walk each corpus clone, family member and the registry for `marketplace.json`; classify each by importing `underSkills` from `scripts/lib/marketplace/manifest.mjs` and applying `U17`'s branch order. **Import the real classifier; do not reimplement it**, or the census measures the copy rather than the check.
2. **Family radius** - `loadPlugin(root)` then `runGate(root, ctx)` per member, filtering findings to `reqId` in `{S3, U17}`.
3. **Graduation proof** - build each failing shape in a temp directory with a `library.json` whose `standard` is set to each of 0.13 / 0.14 / 0.15 / absent, and read `effectiveSeverity` out of the real gate so the ADR 0044 ceiling is exercised rather than the check in isolation.

**One harness lesson worth keeping, because the first version of measurement 2 was wrong and looked right.** It graded each member with `ctx.library.data.standard` mutated in memory, and reported that `agent-skills-toolkit` fell from Advanced to Convergent at 0.15. That was a **`G4`** generated-docs error, not `S3` or `U17`: `INDEX.md:7` reads *"Standard 0.14"*, so mutating the pin changed what `INDEX.md` regenerates to and the harness fired a check on its own mutation. The correct instrument asks which members produce the two checks' findings **at their real pin** and only then asks what the pin would do to them. `--strict` is also the wrong instrument here: it passes `pinned = undefined`, which makes **every** version constraint go inert at once, so a member pinned below 0.14 would take `U15`, `U16` and `U17`'s `since` as live errors and overshoot the question.

## Dated note, 2026-08-19: the scope grew after this plan was written

**Nothing above is rewritten.** This plan stated a deliberately narrow intent and its "Out of scope"
section is left exactly as ratified, because a plan edited to match what happened stops being evidence of
what was decided.

What happened: the tag was withheld for sign-off, and two further bodies of work merged to `main` before it
was cut. The documentation-hygiene fixes, and the three-skill capability family with ADR 0054. **Both are
folded into v1.15.0** rather than deferred.

**The reason is ordering, not preference.** v1.16.0 relocates `vendor-claims.json` into a top-level
`foundation/` tree, and `release-ready` reads that file as one of its five release-blocking gates.
Rebuilding the machine that certifies releases underneath a release that is already certified and waiting
is the wrong sequence. Ship the ready thing first.

Two consequences worth naming. **Acceptance criterion 6 (two adversarial review waves) is still open** -
wave 2 never ran, the runtime returned a usage-limit error before the reviewer started, and folding more
work in does not make that criterion any more satisfied. And this plan's "Out of scope" line about
`E23`'s remaining half still holds; the capability family did not touch it.

What actually shipped is in [`README.md`](README.md), written last, from the code.
