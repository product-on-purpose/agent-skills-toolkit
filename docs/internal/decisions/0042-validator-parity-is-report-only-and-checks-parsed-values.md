# 0042 - Validator parity is report-only for one release, and checks parsed values, not exit codes

## TL;DR
- **Decision:** `scripts/check-parity.mjs` runs the first-party validators (`claude plugin validate --strict` on the repo root and `templates/seed-plugin`; the `skills-ref` reference validator across every `skills/*/`) and, separately, round-trips every skill's `metadata:` block through the reference PARSER (not just the validator's exit code), because the validator never inspects `metadata` contents at all - only the parser touches them, and only the parser silently rewrote them in the incident this ADR exists to stop recurring. A new CI job, `validator-parity` in `.github/workflows/ci.yml`, runs it on every push and PR. Both the vendor CLIs verified installable and runnable fully offline and unauthenticated (evidence below), so the job installs and runs the real thing - it does not fall back. **Report-only for v1.11.0:** the job always exits 0; `PARITY_MODE = "report-only"` in `scripts/check-parity.mjs` is the one line that flips it. A **documented-exception mechanism** (`PARITY_EXCEPTIONS` in the same file) ANNOTATES, but never hides, a disagreement this project deliberately decided to accept: today exactly one, `templates/seed-plugin` vs `claude plugin validate --strict`, authorized by ADR 0043 (the Bronze scaffold defaults a minimal native manifest). The report's summary distinguishes documented disagreements from undocumented ones, since only the latter are meant to ever gate, and an exception whose cited ADR does not resolve to a real file is itself reported as a finding.
- **Why:** `STANDARD.md` sec 6 claims the Universal tier tracks agentskills.io, and the README claims a Bronze plugin is portable across Claude Code, Codex, and agentskills.io. Until this ADR, the only evidence for either claim was this repository's own gate saying so. ADR 0040 found `agentskills validate` reporting "Valid skill" for all 24 skills while `metadata.chain` was being silently mangled by the reference PARSER, because the reference VALIDATOR does not inspect `metadata` at all. A harness that checks exit codes alone reproduces that exact blind spot in CI and calls it coverage.
- **Status:** Accepted.

- **Date:** 2026-08-11
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- ADR 0040 (re-pin agentskills.io after an editorial metadata clarification) - found the defect this ADR's parsed-values requirement exists to catch in CI going forward, and stated the instruction verbatim: "the parity harness scoped for v1.11.0 should therefore assert on parsed values and not only on exit codes."
- ADR 0041 (warn-first string-shaped chain declarations) - the warn-first-for-one-Standard-minor precedent this ADR's report-only period mirrors, and the process lesson it recorded (verify a claim against the fixture that has something to lose, not the one that already passes) applied here by seeding a real violation rather than only asserting the harness would catch one.
- ADR 0027 (Standard versioning and compatibility policy) - the general warn-first burndown mechanism; this ADR is the harness-level analogue for a NEW signal (a CI job) rather than a tightened check.
- ADR 0029 (reclassify U2/U5 as house provenance) - the precedent this ADR's documented-exception path reuses: when this repository's own requirement is not actually vendor-grounded, the fix is to say so in an ADR and reclassify, not to silently suppress the disagreement.
- ADR 0043 (Bronze scaffold defaults a minimal native manifest) - the authority behind `PARITY_EXCEPTIONS`' one live entry. `templates/seed-plugin` fails `claude plugin validate --strict` on a missing `author`, which ADR 0043 considered fixing with a placeholder and rejected, citing `U5`/ADR 0033's fabricated-content penalty; this ADR's exception mechanism is what makes that decision visible on every parity run instead of only inside ADR 0043's own text.
- `docs/internal/release-plans/plan_v1.10.1/validator-parity-baseline.md` - the dated, one-off manual run this ADR's harness makes structural. That file's reproduction commands are the exact commands `scripts/check-parity.mjs` now runs automatically.
- `docs/internal/release-plans/plan_v1.11.0/RELEASE-PLAN.md` (workstream W4) - the acceptance criteria this ADR discharges, including the open tooling-installability risk resolved below.

## Context and problem statement

The parity invariant, stated in the v1.10.1 baseline and repeated here because this ADR is where it becomes enforceable:

> **Parity invariant.** Nothing the first-party validators reject grades clean at the tier that claims the corresponding portability.

Two things stood between that sentence and a real property: nobody ran the other side's validator except by hand on a release day, and the one time it was run by hand (the metadata.chain incident, ADR 0040), the validator's own exit code did not catch the actual defect - only reading what its PARSER produced did. Both had to be fixed for the invariant to mean anything.

**What "never disagree on facts" means, precisely.** This repository's gate is deliberately STRICTER than the first parties above Bronze - `G8` (folder-readme), `G9` (source-doc docblocks), `U5` (description score), and the whole Advanced/Gold ladder are house or vendor-cited requirements the reference implementations do not check at all. That is the house thesis, not a defect: a plugin the toolkit grades Advanced has cleared MORE bars than Bronze requires, never fewer. So the invariant is not "our gate agrees with the vendor on every rule" - it never has and is not meant to. It is about CONTRADICTION, specifically and only in one direction: for a target `T` declaring a tier that claims a first party `F`'s portability (every askit tier claims Claude Code, since every askit plugin is a Claude Code plugin first; the Universal/Bronze tier additionally claims agentskills.io, via `skills-ref`), if `F`'s OWN validator REJECTS `T`, then `T` must not grade clean (zero gating errors) at that tier in this repository's own gate. The reverse direction - the toolkit rejects something `F` accepts - is the entire point of everything above Bronze and is never a parity violation.

**The parsed-values requirement, with the metadata.chain incident as its evidence.** `skills-ref`'s `validator.py` checks that top-level frontmatter keys are in `ALLOWED_FIELDS` and format-checks `name`, `description`, and `compatibility`. It never inspects the CONTENTS of `metadata` at all. `parser.py`, separately, coerces every `metadata` value through Python's `str()`:

```python
if "metadata" in metadata and isinstance(metadata["metadata"], dict):
    metadata["metadata"] = {str(k): str(v) for k, v in metadata["metadata"].items()}
```

Before PR #204's fix, `metadata.chain` was a YAML list. `agentskills validate` reported "Valid skill" for all 24 skills throughout, because the validator never looked; the PARSER silently rewrote the list to a string containing a Python list repr (`"['askit-skill-author', 'askit-reviewer']"`) that no consumer could parse back into names. **A harness that shells out to `agentskills validate` and checks its exit code would have reported this repository green the entire time.** That is why `scripts/check-parity.mjs` does two structurally different things for `skills-ref`: it runs the real validator (an exit-code check, appropriate there - that IS what "run the validator" means), and it SEPARATELY runs the file through `skills_ref.parser.parse_frontmatter` itself and diffs the result against this repository's own parsed `metadata:` block, key by key. A value "survives" only if it was already a JS string and comes back byte-identical; anything else - a non-string YAML value, or a string the parser altered - is reported with the specific reason.

**Seeded-violation proof, not just a claim.** A `metadata:` block was temporarily changed to a YAML block-sequence list (`audience:` with two list items) on `skills/askit-decision/SKILL.md` and the harness run against it, then the file was restored via `git checkout --`. Verbatim:

```
-- skills-ref (agentskills validate), 24 skill(s)  --
  [PASS] skills/askit-decision
-- metadata.* parsed-values round-trip through the reference PARSER (not the validator's exit code)  --
  [MISMATCH] skills/askit-decision
    metadata.audience: coerced-non-string - ours=["advanced","beginner"] reference="['advanced', 'beginner']"
```

`agentskills validate` PASSED. The parsed-values check caught the identical defect shape as the live metadata.chain incident. That is the requirement discharged, demonstrated against a real, reverted mutation of this repository - not a hypothetical.

**The tooling-installability risk, resolved empirically.** `RELEASE-PLAN.md` (W4) named an open question: can the `claude` CLI, and `skills-ref` via `uv`/`uvx`, be installed and run on a GitHub runner, offline and unauthenticated? Verified locally (2026-08-11), not assumed:

| Check | Method | Result |
|---|---|---|
| `claude plugin validate` needs no credential | `HOME`/`CLAUDE_CONFIG_DIR` pointed at an empty directory, `ANTHROPIC_API_KEY` and `CLAUDE_CODE_OAUTH_TOKEN` unset | Validated correctly, no auth prompt |
| `claude plugin validate` needs no live network for the validate itself | Same isolated env, plus `HTTP_PROXY`/`HTTPS_PROXY` pointed at a closed local port (any real request would fail or hang) | Validated correctly, instantly |
| `uvx --from skills-ref agentskills validate` needs no credential or network for the run itself | `uvx --offline`, same broken-proxy environment | Validated correctly, instantly |
| Both are real, publicly installable packages | `npm view @anthropic-ai/claude-code` -> `2.1.227`, engines `node >=22.0.0`; `pip index versions skills-ref` -> `0.1.1` on PyPI | Confirmed |

Both answers are **yes**. `.github/workflows/ci.yml`'s new `validator-parity` job installs the real `claude` CLI (`npm install -g @anthropic-ai/claude-code`) and `uv` (`pip install uv`, providing `uvx`) and runs the genuine tools - it does not engage the documented fallback. The fallback (`vendorValidateManifest` in `scripts/check-parity.mjs`) still exists and is exercised automatically whenever `claude` is not on `PATH` (a contributor's machine without it installed), so a local run never goes silent; its output is always prefixed `REDUCED-FIDELITY FALLBACK` so it can never be mistaken for the real validator's answer. There is no equivalent fallback for `skills-ref`: if `uvx` is absent, the harness prints `THIS SECTION DID NOT RUN` rather than inventing a JS reimplementation of someone else's parser, on the reasoning that a shaky vendored copy of the exact defect class this ADR exists to prevent (a plausible-looking parse of someone else's validator) is worse than an honest gap.

**A live disagreement the harness found on day one, unprompted - and the alarm-fatigue gap that first exposed.** `claude plugin validate templates/seed-plugin --strict` FAILS:

```
⚠ Found 1 warning:
  ❯ author: No author information provided. Consider adding author details for plugin attribution
✘ Validation failed (--strict treats warnings as errors)
```

`templates/seed-plugin/library.json` declares `"tier": "universal"` (Bronze), and the README claims Bronze installability. This is exactly the class of disagreement the parity invariant exists to surface, found by the harness itself against the live repository, not seeded. It is also **not a defect**: ADR 0043 (Bronze scaffold defaults a minimal native manifest, workstream W5) considered shipping a placeholder `author` to make `--strict` pass unconditionally and rejected it outright, because `U5` (description-score, ADR 0033) already penalizes exactly this shape of defect - fabricated content dressed as real content - for descriptions, and a fabricated `author.name` is the same move applied to a new field. ADR 0043 states plainly that the warning "is CORRECT and is left in place permanently, not a residual gap to close later."

The first version of this harness reported that FAIL as a bare, unannotated line. A report-only harness whose sole output line is an unexplained failure on every single run is the alarm-fatigue failure mode this repository has hit before: people learn to skim past it, and the first genuine regression gets skimmed past with it. Left unfixed, it would also mean the day `PARITY_MODE` flips, CI breaks on a decision the project made on purpose. Both problems are closed the same way: the harness carries a small, explicit `PARITY_EXCEPTIONS` list (target, tool, ADR, reason) and ANNOTATES a matching failure rather than hiding it. Verbatim, current live output:

```
-- claude plugin validate --strict (real CLI, version 2.1.227 (Claude Code)) --
  [PASS] .
  [FAIL, documented exception: ADR 0043] templates/seed-plugin
    documented reason: The raw scaffold genuinely has no author to declare. ADR 0043 considered a
    placeholder (...) and rejected it: U5 (description-score, ADR 0033) already penalizes fabricated
    content dressed as real content, and a placeholder author is the same defect applied to a new
    field. A plugin scaffolded through askit-init-plugin's interview mode supplies a real author and
    passes --strict outright; the unfilled template correctly keeps warning, permanently, not pending
    a future fix.
    ...
-- documented-exception list integrity --
  OK: all 1 documented exception(s) cite a real ADR under docs/internal/decisions/.
-- summary --
  vendor-validate disagreements: 1 found, ALL 1 documented as exception(s) (ADR-authorized - see the
  annotated lines above). Nothing here would block once gating starts.
```

**Proof the undocumented case still reports plainly, in the same run.** `skills/askit-decision/SKILL.md`'s `metadata.audience` was temporarily changed to a flow-style YAML list (`[advanced, beginner]`), which `skills-ref` rejects outright - a genuine, unregistered disagreement with no matching `PARITY_EXCEPTIONS` entry - then reverted via `git checkout --`. In that run, side by side with the annotated seed-plugin line above:

```
  [FAIL] skills/askit-decision
    Validation failed for .../skills/askit-decision:
      - Invalid YAML in frontmatter: ...
...
-- summary --
  vendor-validate disagreements: 2 found - 1 documented, 1 UNDOCUMENTED. The undocumented one WOULD
  block once gating starts.
```

No annotation, no ADR reference, and the summary counted it separately from the documented case. This is the full requirement discharged: a documented exception is visible and explained; an undocumented one still reports as an ordinary failure and is never mistaken for the former.

**Validator identities, and a real measured pin skew.** `docs/internal/standards-watch/upstream-pin.json` pins the `skills-ref` reference-implementation files by GIT BLOB SHA-1 of their SOURCE bytes on GitHub's default branch. `scripts/check-parity.mjs` runs a DIFFERENT identity: the currently-installed PyPI release. These are not expected to always agree - a release is cut at one point in history and does not follow the upstream branch - so the harness reports both and flags skew rather than asserting equality. Measured today, all three reference-implementation files are skewed:

| File | Pinned (GitHub blob) | Installed (PyPI 0.1.1) |
|---|---|---|
| `parser.py` | `690c14e27b61405e3b1346dc22c8678cd3e79b35` | `07bef6527b035f8fd89c0844813dd0fe43f512ba` |
| `validator.py` | `22cf6f8ae5f905d780cb097c0938711cc37016a9` | `958f8cad04a91f39ca206b120f0def06812f4a58` |
| `models.py` | `77fa89ed2ccce99b10068fccd2ca26a2db24b1b1` | `e0bf22f570e947838d71818e1ae05234bc576a6c` |

Investigated by hand for `parser.py` specifically (fetched the pinned upstream `main` branch's actual bytes and diffed against the installed wheel's bytes): the wheel ships the file with CRLF line endings where GitHub stores LF (a packaging artifact, not a behavior change), and exactly ONE substantive line differs - the PyPI 0.1.1 release still calls `skill_md.read_text(encoding="utf-8")`; the current upstream `main` branch has since dropped the explicit encoding argument, relying on the platform default instead. Neither line is alarming by itself; the point is that the skew is REAL, MEASURED, and now REPORTED every run instead of assumed away, which is what the task required.

## Decision drivers
- The parity invariant is worth nothing if evidence for it is a dated, hand-run audit (`docs/internal/release-plans/plan_v1.10.1/validator-parity-baseline.md`) rather than something CI runs on every push.
- ADR 0040's own instruction: a harness that checks exit codes alone reproduces the exact blind spot that let `metadata.chain` corrupt silently for two releases.
- Design Principle 3 (the gate stays deterministic and model-free): the harness is a pure script CI shells out to, matching the standing invariant that `.github/workflows/*.yml` holds no validation logic of its own (Standard sec 4.1/4.4).
- "Do not fake a green job": a parity job that skips its subject and reports success is worse than no job at all - the precise defect class the v1.10.1 predecessor's six adversarial-review rounds spent effort on elsewhere in this codebase. This is why the tooling-installability question was resolved empirically rather than assumed, and why the fallback path is loudly labeled rather than silently substituted.
- A brand-new CI signal should not immediately break every open PR on the day it lands - the seed-plugin `--strict` failure above is concrete proof that gating on day one would do exactly that, before it is annotated as the intentional decision it is.
- **Alarm fatigue is itself a failure mode this harness must not create.** A report-only run whose output contains one bare, unexplained failure on every single execution trains a reader to skim past it - and the first GENUINE regression gets skimmed past along with it. A harness that finds a real, deliberate exception and then reports it identically to an undiagnosed defect has not actually closed the gap between "someone decided this" and "no one has looked."

## Considered options
1. **Report-only for one release, then gating, mirroring ADR 0027's/ADR 0041's warn-first burndown; disagreements this project deliberately decided to accept are ANNOTATED with the authorizing ADR, never hidden.** (chosen) Detailed below.
2. **Gate immediately.** Rejected on the evidence in Context: a real, current disagreement (`templates/seed-plugin` vs `--strict`) already exists, and even though ADR 0043 shows it is a deliberate decision rather than a defect, gating on day one - before this ADR's own exception mechanism had even been built and tested against a live run - would still fail every PR on a decision nobody had yet taught the gate to recognize.
3. **Never gate, permanently informational.** Rejected: a validator this repository never intends to enforce is a comment, not a parity harness, and it undersells the actual claim `STANDARD.md` sec 6 and the README make. The whole reason to run someone else's validator is to eventually mean it.
4. **Skip the parsed-values check and rely on exit codes only, to ship faster.** Rejected outright: this is the exact defect ADR 0040 diagnosed and instructed against. A harness built this way would have shipped green through the entire metadata.chain incident.
5. **Silently suppress a documented disagreement from the report entirely, once an ADR authorizes it.** Rejected: this is the exact failure mode the metadata.chain incident (ADR 0040) exists to warn against, applied to a new surface - silence is precisely how that defect survived undetected. A documented exception must still be VISIBLE and still be reported as a failure, only explained; a reader who never sees `templates/seed-plugin` mentioned at all has no way to notice if the exception's own justification ever stops being true.

## Decision outcome

Option 1. `scripts/check-parity.mjs` exports `PARITY_MODE = "report-only"`; `decideExitCode(mode, hasDisagreement)` returns `0` unconditionally in that mode (proven in `tests/unit/check-parity.test.mjs`, including the `"gating"` branch so the flip is known to behave correctly before it is made, not discovered then). `.github/workflows/ci.yml`'s `validator-parity` job always runs to completion and its exit code is whatever the script decides - today, always `0`. The report-only status is stated four separate ways in the script's own stdout (a banner block at the top, per-target `[PASS]`/`[FAIL]` lines, a `NOT VERIFIED` line for anything that did not run, and a summary block restating the mode and the resulting exit code), so nobody reading a CI log can mistake it for a gate.

**Why report-only for exactly one release, and what evidence flips it.** Two conditions, both concrete rather than a bare time-based rule:

1. **Every disagreement this harness has surfaced is triaged to FIXED or documented-exception before gating turns on.** Today that list has exactly one item, and - unlike when this ADR was first drafted - it is no longer open: `templates/seed-plugin` vs `claude plugin validate --strict` is triaged as a documented exception, authorized by ADR 0043, and the harness annotates it as such on every run (see Context). This condition is now MET for the currently-known disagreement set.
2. **The harness has been observed to alarm truthfully on a real change and clear truthfully once fixed, at least once, on this actual repository - not only in a unit test.** Now proven TWICE: the parsed-values seeded-violation demonstration in Context (mutate, catch, revert, clean), and the exception-path demonstration immediately above it (a documented exception annotated correctly, an undocumented one reported plainly in the SAME run, side by side).

Both conditions are now met, which is itself worth being honest about: it is tempting to read that as "so flip it." This ADR does not, for a narrower reason than either condition above - **the exception mechanism itself has never run in real CI.** Every verification in this document, including the two demonstrations just cited, was run locally against a single machine's environment. `.github/workflows/ci.yml`'s `validator-parity` job has not yet executed on an actual GitHub-hosted runner (that requires a push, out of scope for the work that produced this ADR). Gating a brand-new mechanism the first time it ever runs somewhere other than a developer's own machine is the same category of risk ADR 0027's warn-for-one-Standard-minor precedent exists to absorb, just measured in CI runs rather than Standard versions: let it observe real PRs for a release before its exit code can block one. `PARITY_MODE` stays `"report-only"` through v1.11.0 on that basis. The evidence that flips it is the mechanism completing at least one real release cycle in actual CI with no new undocumented disagreement left unresolved at the point of the flip - not a fixed calendar date, and not (any longer) "wait for W5," which shipped inside this same release.

**The documented-exception path, as built.** There are two directions a disagreement can resolve, and they are not the same thing:
- **The underlying defect gets fixed** (the common case). Not an exception - just a bug, closed the normal way.
- **The disagreement is legitimate and is not going to be fixed**, because on inspection the vendor's rule does not apply to this repository's claim, or the toolkit's behavior is correct and the vendor's is not. ADR 0029 (reclassify U2/U5 as house provenance) is this repository's existing precedent for exactly this shape of decision: when a requirement turns out not to be vendor-grounded after all, the fix is a NEW ADR that says so on the record and reclassifies, not a silent suppression. A legitimate parity exception follows the identical path and is now MECHANICALLY enforced, not only described:
  - `PARITY_EXCEPTIONS` in `scripts/check-parity.mjs` is a small, hand-maintained array - deliberately NOT a general suppression engine - with one entry per known exception: `target`, `tool`, the authorizing `adr`, and a human-readable `reason`. Today it carries exactly one entry.
  - `findException()` matches a failing result to its exception by exact target and tool (no glob, no prefix - an exception can never silently widen to cover a target nobody reviewed for it), and `applyExceptions()` attaches it without changing `pass`/`ran`/`detail`: a documented disagreement is still reported as failing, only annotated.
  - `formatResultLine()` renders the annotation on the status line itself - `[FAIL, documented exception: ADR 0043] templates/seed-plugin` - with the reason printed immediately below, so a reader never has to leave the report to know why a first-party FAIL is expected.
  - `validateExceptions()` resolves every entry's `adr` against real files under `docs/internal/decisions/`; an entry that does not resolve is reported as its own `exception-integrity` finding and counts as UNDOCUMENTED for gating purposes (see `anyDisagreement()`) - an authorization nobody can check is worse than none.
  - `summarizeDisagreements()` splits every vendor-validate failure into documented and undocumented counts, and the summary line states plainly which case applies: "ALL N documented... nothing here would block" or "N documented, M UNDOCUMENTED... would block once gating starts."

  This was scoped as machine-readable future work in the first draft of this ADR, reasoned as "nothing gates yet, so there is nothing for it to suppress." **That reasoning turned out to be wrong, for a reason this ADR itself predicted and then immediately demonstrated:** a real exception (`templates/seed-plugin`/ADR 0043) landed in this SAME release, inside the SAME harness's first live run, and rendered as a bare, unexplained `[FAIL]` with nothing distinguishing it from an undiagnosed regression - the alarm-fatigue failure mode named in Decision drivers, observed rather than hypothesized. A real, live instance of the exact problem the mechanism exists to solve is categorically better evidence for building it now than any argument for deferring it, so it was built in this same release rather than left for the day gating turns on.

## Consequences
- **Positive:** the parity invariant is now measured on every push and PR, not once per release by hand. The parsed-values check closes the exact blind spot the metadata.chain incident exposed, proven against a real (seeded, then reverted) mutation rather than asserted. Both vendor CLIs are confirmed installable and runnable offline and unauthenticated, so the CI job runs the real tools rather than a reduced-fidelity stand-in.
- **Positive:** the harness found a real, live disagreement (`templates/seed-plugin` vs `--strict`) on its first run against this repository, unprompted - direct evidence it works rather than only a design that should - and, once ADR 0043 landed alongside it, the harness now correctly recognizes that disagreement as a decision rather than a defect and says so on its own status line.
- **Positive:** the documented-exception mechanism was built in response to a REAL instance of the problem it solves, inside the same release, rather than speculatively ahead of one - directly falsifying this ADR's own first-draft reasoning that deferring it was safe (see Decision outcome), which is stronger evidence for the design than the original hypothetical would have been.
- **Negative / accepted:** report-only means a disagreement (documented or not) cannot yet fail a PR, so the harness's value this release is entirely in visibility and correct classification, not enforcement. That is deliberate - see Decision outcome - and is the same trade ADR 0041 made for string-shaped chain declarations.
- **Negative / accepted:** the vendored `claude`-validate fallback (`vendorValidateManifest`) is reduced-fidelity by construction (only the manifest-exists-and-has-a-name check, not the full rule set `--strict` enforces). It is scoped to local runs without the CLI installed; CI itself never falls back to it, per the empirical result in Context.
- **Negative / accepted:** `PARITY_EXCEPTIONS` is a hand-maintained array a human must remember to update when a new documented disagreement is decided. `validateExceptions()` catches the "entry cites a dead ADR" failure mode but cannot catch "a real, deliberate exception was decided and nobody added the entry" - that gap is still closed the same way it always was, by a human reading the report before merging, which is exactly what report-only preserves the ability to do.
- **Scheduled:** `PARITY_MODE` flips from `"report-only"` to `"gating"` once the mechanism has completed at least one real release cycle in actual CI with no undocumented disagreement outstanding at the point of the flip (see Decision outcome). The flip is a one-line change in `scripts/check-parity.mjs`, with a comment at that line pointing back to this ADR.

## Implementation sites
- `scripts/check-parity.mjs` - `PARITY_MODE`, the one-line gating flip; `diffMetadataParity()`, the parsed-values comparison (the requirement this ADR exists to satisfy); `gitBlobSha1()`, the pure git-blob-sha1 formula used for pin-skew comparison; `summarizePinSkew()`, the pin-vs-installed identity comparison; `vendorValidateManifest()`, the reduced-fidelity local-only fallback; `decideExitCode()` and `anyDisagreement()`, the gating-flip logic exercised now so it is known correct before it is used; `runReferenceParse()` and `REFERENCE_PARSE_SCRIPT`, the reference-PARSER invocation (not the validator) that the parsed-values check depends on; `runVersionProbe()` and `VERSION_PROBE_SCRIPT`, the validator-version and pin-identity probe; `readOurMetadata()`, this repository's own side of the parsed-values comparison; `main()`, the orchestration and report renderer.
- `scripts/check-parity.mjs` - the documented-exception path: `PARITY_EXCEPTIONS`, the hand-maintained exception list (today: `templates/seed-plugin` / ADR 0043); `findException()`, exact target+tool matching; `applyExceptions()`, attaching an exception to a failing result without changing its `pass`/`ran`/`detail`; `resolveAdrFile()` and `validateExceptions()`, the exception-list integrity check (an unresolved ADR reference is itself an `exception-integrity` finding); `summarizeDisagreements()`, the documented-vs-undocumented split; `formatResultLine()`, the annotated status-line renderer.
- `.github/workflows/ci.yml` - the `validator-parity` job: installs the real `claude` CLI and `uv`/`uvx`, then runs `node scripts/check-parity.mjs .`. Holds no validation logic of its own, per the standing CI invariant (Standard sec 4.1/4.4) restated in this file's header comment.
- `tests/unit/check-parity.test.mjs` - unit coverage for every pure function above, including a reproduction of the metadata.chain incident's exact shape (`diffMetadataParity: reproduces the metadata.chain incident`), both branches of the gating flip (`decideExitCode`), and the exception path (`findException`, `applyExceptions`, `resolveAdrFile`, `validateExceptions`, `summarizeDisagreements`, and `formatResultLine`'s two contract tests - a documented exception is annotated and not dropped, an undocumented one still reports as an ordinary failure).
- `scripts/README.md` - the `check-parity.mjs` inventory entry.
- `docs/internal/decisions/0043-bronze-scaffold-defaults-a-minimal-native-manifest.md` - the ADR `PARITY_EXCEPTIONS`' one live entry cites; its own rejection of a placeholder `author` (option 5 there, citing `U5`/ADR 0033) is the `reason` text carried into the exception entry.
- `docs/internal/release-plans/plan_v1.10.1/validator-parity-baseline.md` - the dated manual precursor this ADR's harness automates; its reproduction commands are the commands `scripts/check-parity.mjs` now runs.

Grep anchor: `PARITY_MODE` in `scripts/check-parity.mjs` (the flip point). For the parsed-values requirement specifically: `diffMetadataParity` in the same file and in `tests/unit/check-parity.test.mjs`. For the documented-exception path: `PARITY_EXCEPTIONS` in the same file.
