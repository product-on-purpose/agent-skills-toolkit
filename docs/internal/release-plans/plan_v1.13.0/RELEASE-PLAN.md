# Release plan - v1.13.0 "the contract you adopted"

- **Type:** MINOR. **Standard 0.12 to 0.13.** Two scheduled graduations discharged, **E26 closed** (the pin ceiling stops being config-overridable), one new spine check (**30 to 31**, ratified by ADR 0045), and one generator fix carrying a migration.
- **Baseline:** `main` @ `8b55840` (tag `v1.12.1`), gate Advanced 0/0, spine 30, Standard 0.12, 24 skills, 3 evaluation scopes. npm serves 1.12.1 as of 2026-08-12.
- **Branch:** `release/v1.13.0`.
- **Thesis:** ADR 0027 promised that a plugin is graded against the ruleset it adopted. The promise is broken in two directions at once. It is broken for a check that is *tightened*, because the two tightenings scheduled for Standard 0.13 can only happen by a human editing a constant, taking every consumer at once. And it is broken for a check that is merely *introduced*, because the pin downgrade runs before configuration resolves, so a consumer's own `rules` override beats it (E26, filed and unfixed since 2026-08-11). Both are the same defect wearing different clothes: **a ceiling applied at the wrong point in the resolution order.** This release replaces both with one ceiling computed from `(pin, since, until)` and applied last, discharges the two scheduled graduations through it, adds the check the marketplace scope has been detecting without requiring, and pays off the generator defect that has been shipping a false instruction into other people's repositories since v1.10.0.

> **How this document is written.** This file states **intent and acceptance criteria**. It is not a
> status report and will not be edited into one. State belongs in `README.md` in this folder, written
> **last, from the code**. If you are reading this mid-release, every line is "what we set out to do",
> not "what is".

## The governing invariant

**Nothing moves red-ward.** A plugin carrying a valid pin below 0.13, graded without `--strict` and
without `published-verdict` mode, never fails a gate after this release that it passed before, whatever
its `askit.config.json` says.

v1.12.0's invariant was "no existing verdict moves". This release cannot borrow it, because tightening
the contract is the point of a Standard minor.

**This is the third wording, and the first two failed for the same reason, which is worth recording
because the failure is instructive.** Draft 1 claimed the unqualified "no verdict moves without a pin
change"; round 1 of the adversarial review produced four counterexamples, three of which that draft
itself listed as exceptions a few lines below. Draft 2 narrowed the scope into the sentence and claimed
verdicts are **identical** inside it; round 2 falsified that too, and again from this plan's own text -
closing E26 changes a plugin pinned at 0.12 carrying `rules.U13 = "error"` from red to green, and item 4
of "Four things" admits it four paragraphs later.

The error both times was claiming **symmetry**. A release that fixes a hole necessarily moves some
verdicts, and the promise a consumer actually needs is not "nothing changes" but "nothing I depend on
breaks". So the invariant is now **directional**: red-ward movement is forbidden, green-ward movement is
allowed and enumerated.

**The green-ward movements inside the scope, listed exhaustively rather than as a category:** exactly
one, the E26 closure. A consumer whose `askit.config.json` overrode a post-pin check back to `error`
loses that override, because the ceiling now runs after configuration resolves. No family member does
this; verify rather than assume, per the compatibility matrix.

An invariant with enumerated exceptions is a slogan with footnotes. An invariant with an enumerated
**direction** is a promise, and this one gets the release-gate test.

So the scope is stated in the invariant itself rather than beneath it. The four paths deliberately
**outside** it, each with the reason it is out:

1. **No pin, or an unparseable pin: full-strength grading, immediately.** `isAfter` returns false for
   both, which is ADR 0027's existing and deliberate back-compat rule, not a new one invented here. A
   plugin that never declared which contract it adopted cannot be graded against the one it adopted.
2. **A pin already at or above 0.13: graduations apply on upgrade.** Such a plugin declared 0.13 before
   0.13 existed, which is a claim to the newest contract. Honouring it is the promise, not a violation.
3. **`--strict`: by definition ignores the pin, and it is a RED-WARD path in this release.**
   `check.mjs:41` already skips the downgrade under strict, and this release makes the ceiling obey the
   same rule, so strict stops meaning "ignore my pin except where a cap disagrees". The consequence,
   which round 14 found stated nowhere: **W2 makes `U13` and `S4` emit `error`, and strict disables the
   ceilings that would lower them**, so a *local* `--strict` run at pin 0.12 goes green to red without
   any published-verdict involvement. Strict has always meant "grade me against the newest spine", so
   this is the flag working - but it is a second red-ward path, and an earlier revision claimed
   published-verdict was the only one. Matrix row 22 measures it.
4. **`published-verdict` mode: excluded because this release deliberately tightens it.** W1 closes E38
   by adding a floor, so a subject-owned reduction of an objective or vendor-cited finding can now fail
   a gate that previously passed. That is a red-ward movement, it is the entire point of the fix, and it
   is why the mode sits outside the promise rather than inside it with an asterisk.
   **The red-ward safety holds ONLY where a BINDING ceiling lowers the finding again**, and that
   qualification is load-bearing rather than pedantic. For a capped check like `U13` at a pin below
   0.13, the trust step raises a subject-lowered finding and the ceiling immediately lowers it back, so
   the result is the `warn` it is today (matrix row 14). **For an UNCAPPED check there is no ceiling to
   lower it, at any pin** - `U4` has `since: "0.x"` and no `migration`, so a subject-owned
   `plain-plugin` at pin 0.12 goes green to red (matrix row 21). Rounds 12 and 13 both had to correct
   text asserting the unqualified version of this claim; it survived the first correction because that
   correction reasoned about `U13`, and the capped checks are exactly the ones that look safe.

The invariant is the part that gets a test. The four exclusions get the compatibility matrix in the
verification protocol, so that "we thought about it" is recorded as a run rather than as a sentence.

## The measured baseline, taken before the plan was written

Every tightening in this release was measured against all six family members at `8b55840`, because a
written argument about blast radius was falsified by one command during the v1.12.0 cut and the fix was
reverted (E35). Reproduce with `node scripts/evaluate.mjs ../agent-plugins`.

| Tightening | Findings across the family | Verdicts moved |
|---|---|---|
| `U13` flipped to `error` | 0, and **the check evaluates on 5 of 6, not 6 of 6** - see the correction below | **0** |
| ADR 0041's `S4` string-shape cap lifted | 0 | **0** |
| `U14` (A6 restricted fields) | 0 across **69** agent `.md` files, recursive, frontmatter-scoped | **0** |
| E35's `gen-index` fix, **uncapped** | `product-lifecycle-templates`: Advanced 0/0 to Convergent, 1 `G4` error | **1** |

The last row is why E35 ships with a migration cap rather than an upgrade instruction. The first three
are why this Standard bump is safe to make now rather than deferred again.

**A correction to this table's first row, kept rather than quietly fixed, because the distinction is the
one this project cares most about.** An earlier draft claimed `U13` "evaluates on 6 of 6, so this is a
pass, not a no-op" - a sentence written specifically to preempt the objection that the measurement might
be meaningless. For `pm-skills` it was exactly that objection, and it was correct. `pm-skills` has no
`library.json`, and its `marketplace.json` carries one entry whose `source` is an **object**
(`{source:"url", url, ref}`), not a string. `resolveRegistrationSource` passes that object to
`skillNameFromPath`, which returns null for a non-string, so the set is empty, the deliberate
`set.size > 0` guard declines, rung 3 returns `null`, and `check()` returns `[]` at
`skill-registration.mjs:68`. That is a **skip under R-REG-4** - correct behaviour for a
marketplace-of-plugins, and by design.

**The measurement survives; the argument for it did not.** Zero verdicts moved, and that is true whether
a member passes or is skipped. What was false was the reason offered to make the zero credible. A skip
and a pass produce identical evidence and mean opposite things - `registry.mjs:48` flat-maps findings,
so both return `[]`.

**Making that distinction visible is filed as E39, deliberately NOT in this release.** It briefly sat in
W1's acceptance and was pulled back out, because separating a skip from a pass needs a new
execution-result protocol across the registry, every check, both evaluation scopes, marketplace
aggregation, the JSON contract and every renderer. **Until E39 lands, this table's applicability column
is a manual finding, established by reading `resolveRegistrationSource` against each member's manifest,
and it must be re-established by hand rather than inferred from an empty result.**

## Five things this release will surface that look like failures and are not

**1. The family marketplace still grades RED.** `pm-skills` declares no tier and carries 235 errors;
`thinking-framework-skills` declares advanced and earns convergent. Neither is in scope here and neither
is fixed by this release. The collection verdict is published red on purpose at
`docs/reference/family-registry.md` and stays that way.

**2. A plugin pinned at 0.13 or above goes green to red on UPGRADE, without touching its pin.** This
was worded as "a consumer who adopts 0.13 may go green to red, and that is the feature", which framed it
as a consequence of *changing* a pin. Round 16 was right that this is misleading: a plugin that
predeclared 0.13 before 0.13 existed changes nothing at all and still reddens the moment the toolkit
ships, because `U13`, `S4` and `U14` all become effective at that pin. **The invariant's scope is a
valid pin BELOW 0.13**, which is what makes this consistent rather than a violation - but "nothing moves
without a pin change" is false as a general sentence and appears nowhere in this plan any more. Rows
24a, 24b and 24c measure each check independently.

**3. `--strict` output will change for anyone carrying a capped finding.** Under strict, the ceiling goes
inert along with the pin-based downgrade. This is a correction, not a new behavior: `check.mjs:41`
already skips `applyStandardDowngrade` under strict, so strict already means "ignore my pin", and the cap
surviving it made strict mean "ignore my pin except where a cap disagrees".

**4. A consumer whose `askit.config.json` overrode a post-pin check back to `error` will see that
override stop working.** That is E26 being closed, and it necessarily changes output for exactly the
configurations that were exploiting the hole. It is a verdict moving without a pin change, in the
green-ward direction, on a path the invariant's scope covers - so it is the one place this release
knowingly trades strict compatibility for correctness. **Measure it before shipping:** the compatibility
matrix in W1 exists partly to size this, and no family member is expected to be affected, since none
carries an `askit.config.json` `rules` override for `U13` or `S4`. Verify that rather than assume it.

**5. A `published-verdict` run can now fail where it passed, and that is the fix, not a regression.**
Closing E38 means a subject-owned `rules.X = "warn"` no longer buys a green published verdict for an
objective or vendor-cited finding. `resolve-config.mjs:23-24` currently guarantees the opposite - that
turning the mode on "can never flip a passing gate to failing" - and ADR 0044 **deliberately reverses
that guarantee**, in this mode only, for subject-owned settings only. A guarantee that protects the
subject is the wrong guarantee in the one mode built to publish a verdict *about* the subject. This is
**one of FOUR** red-ward paths in this release, each measured by its own matrix row:
1. A subject-owned reduction under **`published-verdict`** (rows 1 and 21) - outside the invariant.
2. **`--strict` at any pin**, where W2's newly-emitted `error` meets a disabled ceiling (row 22) -
   outside the invariant.
3. An **unpinned or garbage-pinned** plugin, which has never had a migration window (row 20) - outside
   the invariant.
4. **A plugin that already pinned 0.13 or above, graded locally, non-strict, with default config**
   (row 24) - **also outside the invariant**, whose scope is a valid pin *below* 0.13, and it is the
   most ordinary path of the four: such a plugin declared the newest contract before it existed, and
   `U13`, `S4` and `U14` all become effective on upgrade.

An earlier revision called this "the only red-ward movement", and the correction after that named
three. Round 15 found the fourth by reading the plan's **own exclusion 2** back against its own
enumeration - the paths a guarantee excludes are the paths nobody re-traces.

**The guarantee is quoted in five places, not one, and all five move together.** An earlier revision
promised to correct only the source comment, which would have shipped code contradicting its own
published contract - the exact failure the `askit-verify-dont-notice` lesson names, where a fix resolves
inside our own tree and leaves the surface other people actually read. The full set:
`resolve-config.mjs:23-24` (the source comment), **`docs/reference/gate-config.md`** and its **`site/`
mirror** (the published promise about published-verdict mode), **`tests/unit/config.test.mjs:174-179`**
(a contract test asserting the old behaviour, which is rewritten rather than deleted, so the change is
visible in the diff), and **`STANDARD.md`**, which today describes only an off-to-warn clamp. The
docs-site page carries the four-file rule and the site must be built before route parity runs. Historical
`CHANGELOG` entries are left alone: they describe what older releases did, and editing them would
falsify a record rather than fix a contract.

## A deliberate narrowing, stated up front

`docs/internal/STATUS.md` assigns the whole vendor-alignment ADR pack (commands-as-skills, frontmatter
vocabulary strictness, `U5` scope per E14, standing up vendor-watch) to v1.13.0 alongside everything
here. That is four independent workstreams in one release, three of them gated on ADRs nobody has
drafted. They move to v1.14.0 "current with the vendors", which is what that release was already named
for.

**E34** moves with them, and for a reason worth recording rather than a scheduling one: it asks which of
the marketplace scope's finding classes belong on the spine at all, and the prior question is unanswered.
A plugin cannot unilaterally fix a skill-name collision with a sibling it does not know it is catalogued
beside, so at least some of those classes are properties of a collection rather than requirements a
plugin can be held to. Graduating the set wholesale to get a Standard bump's worth of value out of one
release is exactly the reasoning that should not decide it.

## Workstreams

### W1 - One post-resolution Standard ceiling, closing E26 (ADR 0044)

- **Why:** the repository has three version-gating mechanisms and only one reads the pin.
  `applyStandardDowngrade(findings, pinned)` compares `meta.since` to `library.json.standard` and works.
  ADR 0041's `migration: {capAt, until, reason}` cap is an unconditional ceiling: `until` is **read** in
  exactly one place in the codebase, the notice string at `resolve-config.mjs:62`, where it is
  interpolated into a message and compared to nothing. `U13`'s graduation is a hand-edited constant whose own comment concedes the gap ("the
  per-check-flip mechanism; the gate has no `enforcedSince` field"). So "graduates at Standard 0.13" is
  currently a promise kept by someone remembering, in two files, with no test that fails if they do not.
- **The design this workstream ships is the SECOND one, and the first is recorded because its failure is
  instructive.** The first draft threaded `pinned` into `resolveFindings` and made ADR 0041's existing
  cap conditional, leaving everything else alone. The pre-implementation adversarial review killed it in
  one line: **a cap is a ceiling, and removing a ceiling cannot promote anything.** `chain-contract.mjs`
  emits `SEVERITY.WARN` on both string-derived branches (`:106`, `:150`), so lifting a warn-ceiling off a
  warn finding yields a warn, and `S4` would never have graduated at all. The plan had specified exactly
  the right primitive for `U13` (emit the target severity, let the ceiling lower it) and then failed to
  apply it to `S4` three paragraphs later. That is the sixth instance of fix-one-place-leave-the-sibling
  across three releases, and this one occurred inside the plan written to fix the mechanism.
- **Scope: one post-resolution ceiling, replacing two mechanisms rather than parameterising one.**
  - **Checks emit their TARGET severity** - the severity the finding carries at the newest Standard. No
    check hand-encodes a migration state any more.
  - `applyStandardDowngrade`'s pre-pass **goes away as a pre-pass.** Its logic moves into
    `resolveFindings` as a ceiling applied **last**, after profile, per-rule override, suppression and
    the trust step (step 3 of the canonical algorithm below, which replaces the old published-verdict
    clamp), computed from `(pinned, meta.since, migration.until)`:
    `isAfter(since, pinned)` yields a `warn` ceiling (the check did not exist at your pin);
    `isAfter(until, pinned)` yields the finding's `capAt` ceiling (the tightening has not reached your
    pin); the effective severity is the minimum by `SEVERITY_RANK`. It never raises, exactly as today.
  - **This closes E26**, which the first draft did not know existed. `enhancements.md:372` records that
    `applyStandardDowngrade` is equally overridable by config and names `U13` as its live instance:
    because the downgrade runs *before* `resolveFindings`, a consumer's `rules.U13 = "error"` beats it
    today. Any design that leaves the `since` downgrade as a pre-pass inherits that hole, and `U14`
    would have shipped straight into it - a plugin pinned at 0.12 with `rules.U14 = "error"` would take
    a gate-failing error from a check that did not exist at its pin, moving a verdict with no pin change
    and breaking the invariant on this release's own new check.
  - Four call sites, all of which already read the pin one line before calling: `check.mjs:47`,
    `evaluate.mjs:73`, `evaluate.mjs:103`, `tier-report.mjs:19`. The marketplace scope needs no change of
    its own: it reaches `resolveFindings` through the per-member path in `evaluate.mjs` and never calls
    it directly, which is the property ADR 0034's rooted-per-member invariant was built to give.
- **The distinction the ADR must name,** because two mechanisms each invented a private substitute for it
  independently: `since` governs an **introduction** and `until` governs a **tightening**. They are two
  inputs to one ceiling, not two mechanisms. A new check needs no migration metadata **only because the
  ceiling now runs after overrides**; under the old ordering that claim was false, which is precisely how
  the first draft got `U14` wrong.
- **The published-verdict floor, E38, is CLOSED HERE - and it took three rounds to find a version that
  works.** Round 1 found the hole: after graduation a subject can set `rules.U13 = "warn"` and publish
  green, because `resolve-config.mjs:55` clamps only `off` and suppressed findings, only to `warn`, and
  the ceiling can never restore `error`. Round 2 killed the obvious fix: a blanket "config cannot lower
  an objective or vendor-cited finding" restores `U4` to `error` under `plain-plugin`, because
  `profiles.mjs:43` deliberately sets `U4: "warn"` per ADR 0031, and would fail plugins that pass today
  in the mode this project relies on for honest third-party grading. Round 4 then closed off the
  deferral: **before this release `rules.U13 = "warn"` is a no-op**, since `U13` already emits `warn`, so
  graduating it and adding `U14` creates two bypassable gate-failing requirements that do not exist
  today. Deferring would have shipped them.
- **The resolution is a concept this codebase does not currently have: CONFIG PROVENANCE.** Every
  resolved setting is either **grader-owned** (a CLI flag: the person running the grader chose it) or
  **subject-owned** (read from the subject's `askit.config.json`, including its `profile` key). The
  policy, stated once and in one direction: **in `published-verdict` mode, a subject-owned setting
  cannot WEAKEN an objective or vendor-cited finding. It can strengthen one, and grader-owned settings
  can do either.**

- **THE CANONICAL ALGORITHM. This block is the single authority; every other passage in this plan
  describes it and none of them restates it.** Three separate rounds found a stale prose restatement
  still mandating a superseded rule - "restore the declared severity", "below the post-ceiling declared
  severity", "after the published-verdict clamp" - each one an implementable instruction contradicting
  the one beside it. Prose paraphrase of an algorithm is a defect generator, so the algorithm is written
  as code and the prose points here.

  ```
  # ---- HELPERS, stated here so nothing has to be inferred ----
  # rank(sev)          SEVERITY_RANK from resolve-config.mjs: off=0, warn=1, error=2.
  # lower(a, b)        the lower of two severities BY RANK - never lexically. Lexical order is
  #                    actively wrong here: lexical min("error","warn") is "error", rank-lower is
  #                    "warn". Every min/max in this block is by rank.
  # latest(versions)   the greatest Standard version by compareStandard() from standard-version.mjs -
  #                    NOT numeric or lexical max, both of which order "0.9" after "0.10".
  # apply(sev, p, r)   profile then per-rule override, normal precedence; returns sev unchanged when
  #                    neither matches.
  #
  # A finding carries { check, severity, message, file, reqId, migration, line } and NOTHING ELSE.
  # It has no `provenance` and no `meta`: provenance is looked up per reqId, and `since` lives in the
  # check registry. Both must be PARAMETERS, or this algorithm is not executable against a real finding.
  #
  # `config` is ORIGIN-BEARING - this is the W1 change, and every field below depends on it:
  #     config.profile         = { value, origin }                     origin: grader|subject|default
  #     config.rules[reqId]    = { value, origin }
  #     config.suppressions[]  = { reqId, file?, message?, reason?, ORIGIN }
  # The suppression origin must be STAMPED ON THE ENTRY AT LOAD TIME. `matchSuppression` returns the
  # config entry itself (suppressions.mjs:46) and that entry's documented shape carries no origin, so
  # there is nowhere else to recover it from once matching has happened.
  #
  # There is no `strict` parameter. Under --strict the CALLER passes `pinned: undefined`, and isAfter()
  # returns false for an unparseable pin, so every constraint goes inert with no second flag to keep
  # in sync.
  resolve(finding, config, pinned, mode, provenanceByReq, sinceByReq):
    provenance      = provenanceByReq.get(finding.reqId) ?? "objective"   # NOT finding.provenance
    since           = sinceByReq[finding.reqId] ?? BASELINE               # NOT finding.meta.since
    declared        = finding.severity                       # what the module emitted

    # STEPS 1-2 - profile, then per-rule override, then suppression matching.
    subjectResolved = apply(declared, config.profile, config.rules)
    sup             = matchSuppression(finding, config.suppressions)

    # STEP 3 - the trust step. Replaces the published-verdict clamp entirely.
    if mode == "published-verdict" and provenance != "house":
        graderProfile = config.profile.origin == "grader" ? config.profile : NONE
        graderRules   = every entry of config.rules whose origin == "grader"
        trusted       = apply(declared, graderProfile, graderRules)   # subject settings absent;
                                                             # a grader rule beats a grader profile,
                                                             # same precedence as steps 1-2
        if rank(subjectResolved) < rank(trusted):            # RAISE-ONLY. A stricter subject survives.
            effective   = trusted
            trustNotice = "<what was restored, which subject-owned setting was overruled>"
        else:
            effective   = subjectResolved
        if sup and sup.origin == "subject":                  # INDEPENDENT of the severity branch
            sup = null
            trustNotice = "<... and the subject-owned suppression was cleared>"
    else:
        effective = subjectResolved

    postTrust      = effective                  # severity after steps 1-3, BEFORE any ceiling
    configReduced  = rank(postTrust) < rank(declared)   # a CONFIG-caused reduction survived the trust
                                                # step. This is the ONLY way to tell rows 7 and 14
                                                # apart; see the disposition predicates.

    # STEP 4 - the Standard ceiling, always last, never raises.
    # activeConstraints takes the WHOLE migration object, because an `until` constraint's ceiling value
    # is migration.capAt - passing `until` alone leaves c.ceiling unconstructible.
    constraints = activeConstraints(pinned, since, finding.migration)   # [] when pinned is undefined
    for c in constraints:                       # c = { cause, due, ceiling }; only {cause,due} is public
        effective = lower(effective, c.ceiling) # BY RANK. since -> "warn"; until -> migration.capAt

    binding = rank(effective) < rank(postTrust) # did the ceiling ACTUALLY lower anything?

    # Per-constraint, NOT derived from `binding` - see the note in the return below.
    bindingUntilConstraint = the constraint in `constraints` with cause == "until"
                             where rank(finding.migration.capAt) < rank(postTrust)

    return {
      effectiveSeverity: effective,             # the field name every consumer already reads
      suppressed: !!sup, trustNotice, configReduced,
      # migrationNotice SURVIVES. The old cap branch both applied the cap and wrote this notice, and
      # replacing that branch without re-specifying it would silently delete a public explanation that
      # check.mjs, evaluate.mjs, --json and both renderers consume.
      #
      # bindingUntilConstraint is EXACTLY: the `until` constraint is in `constraints` (version-active)
      # AND `rank(finding.migration.capAt) < rank(postTrust)` - i.e. THIS constraint, considered alone,
      # would lower the finding. That predicate is deliberately per-constraint rather than derived from
      # the aggregate `binding`: in the dual-constraint case at pin 0.11 both a `since` ceiling (warn)
      # and an `until` ceiling (capAt) are active and may be EQUAL, and an aggregate test cannot say
      # which one did the work. Equal ceilings mean BOTH bind; the notice is emitted.
      migrationNotice: bindingUntilConstraint
        ? `capped at ${finding.migration.capAt} until Standard ${finding.migration.until} ` +
          `(${finding.migration.reason}); severity before the cap was ${postTrust}`
        : null,                                  # null for since-only, non-binding, lifted, and strict
                                                 # (strict passes pinned undefined, so nothing binds)
      # `ceiling` is ALWAYS PRESENT and is null when no ceiling BINDS - not omitted, not an empty array.
      ceiling: binding
        ? { pinned,
            from: postTrust,
            to:   effective,
            due:  latest(constraints.map(c => c.due)),   # by compareStandard, NOT numeric max, and
                                                         # NOT `max(c.due)` - `c` is the loop variable
                                                         # and is out of scope here
            constraints: constraints.map(c => ({ cause: c.cause, due: c.due })) }  # `ceiling` dropped
        : null,
    }
  ```

  **Five further implementability defects, found in the final pre-implementation audit of this block.**
  Every one is the same class the earlier rounds kept hitting - a symbol used without being bound:
  - `profile` and `rules` were free variables; they are fields of `config`.
  - `graderOwnedProfile` and `graderOwnedRules` were never derived from anything. They are now filtered
    from the origin-bearing config, which is the whole point of W1's provenance work and was missing
    from the one block that consumes it.
  - **`sup.origin` did not exist.** `matchSuppression` returns the config entry (`suppressions.mjs:46`)
    and that entry has no origin field, so the origin must be stamped at load time or it is
    unrecoverable after matching.
  - `min` and `max` were unqualified. **Lexical `min("error","warn")` is `"error"`; the rank-correct
    answer is `"warn"`** - an implementer following the block literally would have inverted the ceiling.
  - `max(c.due)` referenced the loop variable `c` **outside its loop**, and Standard versions do not
    order under numeric or lexical max anyway ("0.9" after "0.10").

  **Three contract defects round 12 found in the previous version of this block, all of them the kind
  that only appear when you trace a real consumer through it:**
  - It returned **`effective`**, while `gatingFindings`, the gate projection, tier calculation, the
    summaries and the new disposition predicates every one read **`effectiveSeverity`**. Implemented
    literally, gating would have seen no errors while the tier path fell back to raw `severity`.
  - It described `ceiling: null` as "OMITTED" in the same line that set it, leaving the inactive JSON
    shape contradictory.
  - **`from` was `declared`, which is wrong when config already moved the severity.** The ceiling
    lowers from the post-trust value, not from what the module emitted, and reporting otherwise
    overstates what the pin is holding back.

  **Round 10 found the first version of this block reading `finding.provenance` and `finding.meta.since`,
  neither of which exists.** `finding()` in `findings.mjs` emits seven fields and neither is among them;
  the real resolver already receives `provenanceByReq` as its third argument, and `since` lives in
  `SINCE_BY_REQ`. Implemented literally, house-owned `S4` would have been treated as non-house (breaking
  table row 6) and `U14` at pin 0.12 would have received no introduction ceiling and gated immediately,
  contradicting W3. **A block declared "the single authority" was not executable against the data
  structure it claims to govern** - which is the precise hazard of writing pseudocode from memory of a
  shape rather than from the shape.

  Five properties this encodes that prose kept losing: the trust step **raises only**; suppression is
  decided **independently** of severity; the ceiling runs **last** and **never raises**; `house`
  provenance is **never** touched by the trust step; and provenance and `since` are **looked up, never
  read off the finding**.
- **Origin is currently ERASED before resolution, so the contract must be built, not merely stated.**
  `check.mjs:46` builds `effectiveConfig = { ...config, ...(mode ? {mode} : {}), ...(profile ? {profile} : {}) }`
  and hands one flat object to `resolveFindings`; `evaluate.mjs:72` and `:102` do the same. By the time
  the resolver runs, a CLI-selected profile and a file-selected profile are indistinguishable. W1
  therefore ships an **origin-bearing configuration shape** from `loadConfig` through the merge to
  `resolveFindings`, rather than a rule the resolver has no data to apply:
  - **Grader-owned:** anything supplied by the caller as an option - `--mode`, `--profile`, and any
    future flag. In the marketplace scope, the caller's options are grader-owned for every member.
  - **Subject-owned:** everything read from the target's own `askit.config.json`, including its
    `profile`, `rules` and `suppressions`. **Under ADR 0034 each marketplace member's config is rooted
    at that member's own directory, so it is that member's subject-owned config** - grading a catalogue
    does not make the grader the owner of a member's file.
  - **Defaults are a third category and need no ownership**, because the floor only ever acts on a
    setting that **lowers** a finding, and a default lowers nothing: the default `rules` is `{}` and the
    default profile is the identity profile. The same is true of the malformed-config fallback. Stating
    this explicitly stops an implementer inventing an owner for a value that never triggers the rule.
  - **Parity is a requirement, not an expectation.** Five entry points build config independently -
    `check.mjs`, `evaluate.mjs` plugin scope, `evaluate.mjs` component scope, the marketplace per-member
    path, and `tier-report.mjs` - and an implementation that threads origin through one of them passes a
    gate test while publishing a different verdict from `evaluate`. Every path is tested for the same
    ownership answer on the same input.
  - `plain-plugin`'s `U4: "warn"` survives when a grader passes `--profile plain-plugin`, which is the
    real use of the mode: publishing an honest verdict *about* a third-party plugin against a rubric the
    grader chose. ADR 0031's calibration is untouched.
  - A subject writing `profile: "plain-plugin"` into its own config gets no reduction in published mode,
    so the exemption cannot be self-granted. That is the half round 2 correctly said the naive
    profile-exemption handed straight back.
- **A claim that was here and was WRONG, kept as a correction rather than quietly deleted.** Two
  revisions of this plan asserted that provenance also corrects an existing over-fire, on the grounds
  that the clamp lifts an objective finding a grader deliberately turned off via `--profile
  plain-plugin`. **That situation cannot arise today.** `plain-plugin` turns off only `HOUSE_REQIDS`,
  and the clamp explicitly skips house-provenance findings; the one non-house entry it touches is
  `U4: "warn"`, and the clamp acts only on `off` and suppressed findings, never on a `warn`. So no
  grader-owned `off` of an objective finding is reachable through any public entry point - `--mode` and
  `--profile` are the only grader-owned inputs the CLI accepts, and neither `rules` nor `suppressions`
  can currently be grader-owned at all.
- **What that means for the design, which is a narrowing rather than a retreat:** provenance is
  justified entirely by the *subject-owned* half - closing E38 - and not by any current grader-side
  defect. The grader-owned branch is a **forward guarantee**: the moment anyone adds a `--rules` or
  `--suppress` flag, or lets a caller pass config programmatically, the resolver already knows not to
  distrust it. Matrix cell 8 (a grader-owned suppression stays suppressed) is therefore honestly a
  **resolver-level unit test of an input path that does not exist yet**, and it is labelled as such
  rather than presented as evidence about today's behaviour.
- **The floor governs the whole DISPOSITION, not severity alone - and getting this wrong would have made
  the entire fix bypassable.** `gatingFindings` requires `effectiveSeverity === "error"` **and**
  `!suppressed`, and `suppressed` is computed independently of severity. A floor that only raises
  severity therefore leaves a subject-owned suppression intact: the finding reads `error`, satisfies the
  literal floor, and still publishes green.
- **The floor REPLACES the published-verdict clamp; it does not run beside it.** An earlier revision
  said the two notices "compose", which round 6 correctly called hand-waving: if the floor runs first it
  clears the suppression and the clamp never fires, and if the clamp runs first it writes "clamped to
  warn" onto a finding the floor then restores to `error`. Either way the report contradicts itself.
  There is one trust step, not two, and it is specified as an exact state machine:
  1. **Profile, then per-rule override** produce `effectiveSeverity`, each carrying the **origin** of the
     setting that won.
  2. **Suppression matching** produces `sup`, also carrying its origin.
  3. **The trust step**, which runs only in `published-verdict` mode and only for `objective` and
     `vendor-cited` findings. **It resolves to the TRUSTED RESOLUTION, not to the module's declared
     severity**, and it treats severity and suppression as two independent decisions:
     - **Severity:** recompute exactly as in step 1 but with every subject-owned setting absent -
       module declared severity, then grader-owned profile, then grader-owned rule, in the normal
       precedence order. That value is the result.
     - **Suppression:** if the matching suppression is subject-owned, clear `suppressed` and
       `suppressionReason`; if it is grader-owned, leave it exactly as it is. This is decided on its
       own, never as a side effect of the severity branch.
     - A single `trustNotice` records what was restored and which subject-owned setting was overruled.
       House-provenance findings are never touched.
     **"Restore the declared severity" was wrong and round 7 caught it.** With a grader-owned
     `--profile plain-plugin` (which resolves `U4` to `warn`) and a subject-owned `rules.U4 = "off"`,
     the subject's rule wins step 1, so an atomic reset to the declared severity produces `error` -
     discarding the grader's own deliberate `warn` and violating this workstream's own rule that
     grader-owned reductions pass through untouched. Rolling back to the trusted resolution yields
     `warn`, which is what the grader asked for. The same atomicity mishandled mixed ownership between
     severity and suppression, which is why the two are now resolved separately.
  4. **The Standard ceiling** lowers the result for `since`/`until`, last.
  - **`trustNotice` is ADDITIVE and `clampNotice` is deprecated, not deleted.** An earlier revision said
    `clampNotice` was "retired", which round 7 correctly called an undefined contract change: the field
    is consumed by `check.mjs` and `evaluate.mjs` terminal rendering, by `evaluate.mjs`'s `dispositions`
    (both the `clamped` count and the `profileConformance` predicate, which excludes clamped findings),
    by `report-render.mjs`'s Markdown and HTML view models, by `report-render` and `config` unit tests,
    by a published JSON example in the docs, and it is exposed directly through **both** JSON CLIs.
    Deleting it either breaks that automation or silently removes the trust explanation from shareable
    reports. So: `trustNotice` is added and set on **every** trust action; `clampNotice` continues to be
    populated for one minor **only on the paths where the old clamp would have fired AND the final
    severity is `warn`** - which is precisely the set of findings whose old semantics it can still state
    truthfully.
    **"Mirror it wherever the trust step acted" was wrong, and round 8 caught it.** A declared-`error`
    objective finding carrying a subject-owned suppression now ends **unsuppressed at `error`**. Mirroring
    `clampNotice` onto it would stamp the literal words "clamped to warn" on a gate-failing error, while
    `dispositions` counted the same finding as both a real issue and a clamped one, and
    `profileConformance` - which excludes every `clampNotice` finding - silently dropped it. A
    compatibility field that lies is worse than one that is absent, because the automation reading it has
    no way to tell. Contract tests assert the three cases that distinguish the two rules:
    suppression-to-`error`, `warn`-to-`error`, and grader-profile-`warn` beneath a subject suppression.
    **SARIF is explicitly out of scope** - it serialises no notice field today, so an earlier promise to
    assert notice text in SARIF was describing something that does not exist. The ceiling metadata got
    exactly this compatibility treatment two rounds ago; the trust field was left without it.
  - **Narrowing the mirror costs an AGGREGATE signal, so `dispositions` gains `trustActions`.** Round 9
    caught this: today, a declared-`error` objective finding carrying a subject-owned suppression yields
    `warn`, unsuppressed, `clampNotice` present, and `dispositions` of `realIssues: 0, clamped: 1`.
    Under this plan it yields `error`, unsuppressed, **no** `clampNotice`, and `realIssues: 1,
    clamped: 0`. Any automation watching `dispositions.clamped` to detect *attempted disabling* silently
    reads zero - a per-finding `trustNotice` does not replace an aggregate counter. So:
    - **`profileConformance` is corrected to count REDUCTIONS only.** It currently keys off
      `downgradedFrom != null`, which now also catches a subject *increase* - row 11's `U7` raised from
      `warn` to `error` would land in both `realIssues` and `profileConformance` while `clamped` stayed
      zero, contradicting the documented split three ways at once.
    - **An ORDERED, EXHAUSTIVE partition with EXACT predicates, first match wins.** Round 10's version
      named the buckets but not their tests, and round 11 was right that the ordering alone cannot
      preserve the existing house-error semantics. Written against the real predicates at
      `evaluate.mjs:53-57`:
      1. **`suppressed`** - `f.suppressed`.
      2. **`clamped`** - `f.clampNotice != null` (the deprecated compatibility bucket).
      3. **`realIssues`** - `effectiveSeverity === "error" && provenance !== "house"`. Unchanged, and
         still explicitly **excludes house errors**, which is the existing public meaning.
      4. **`profileConformance`** - `(effectiveSeverity === "error" && provenance === "house")` **or**
         **`configReduced === true`**. An unreduced house error stays here, exactly as today.
      5. **`warns`** - **residual**: every remaining live finding.
    - **`configReduced` is a returned field, not an inference.** Round 12 produced the pair that
      motivated it: **row 7a** (`U13`, pin 0.12, **local**, subject `rules.U13="warn"`) and **row 14**
      (`U13`, pin 0.12, **published**, the same subject rule) have the same declared severity and the
      same final `warn`. In 7a config did the lowering (`profileConformance`); in 14 the trust step
      raised it back to `error` and the *ceiling* lowered it (residual `warns`).
      **A correction round 13 forced, and it matters because the reasoning changed even though the
      design did not.** The previous text claimed `ceiling != null` also fails to separate those two.
      Once the binding rule landed, that became false: 7a's constraint is version-active but
      non-binding, so `ceiling` is `null`, while 14's binds and is non-null. **`configReduced` is still
      the right predicate, for a better reason than the one originally given** - it states the cause
      directly, where `ceiling == null` only correlates with it. The correlation breaks immediately: a
      subject-reduced `U4` at pin 0.13 has `configReduced: true` and `ceiling: null` because `U4` is
      uncapped and has no constraint at all, and an unreduced finding at the same pin has
      `configReduced: false` and `ceiling: null` too. Classifying on the absence of a ceiling would put
      those two in the same bucket.
    - **A ceiling-caused reduction is NOT profile conformance**, and this is the one predicate that
      changes rather than merely reorders. Today `downgradedFrom != null` catches every change including
      a Standard ceiling, so pin-driven debt is filed under "profile conformance", which it is not.
      Standard debt is already reported by `standardDebtLine` and the `ceiling` field; a ceiling-lowered
      warning now falls through to `warns`.
    - **The public meaning changes this creates, named rather than discovered.** Today's buckets already
      overlap - a live non-house error reduced by config is counted in **both** `realIssues` and
      `profileConformance`, and a warn reduced from error is in both `warns` and `profileConformance` -
      so "sum to the finding count" was never true of the current code either. Under first-match-wins,
      each of those findings lands in exactly one bucket, so `profileConformance` and `warns` both
      **shrink**. That is the cost of a partition consumers can actually sum, and it is recorded in the
      ADR with before/after counts for matrix rows 2, 6, 9 and 11.
    - A test asserts the five sum to the finding count, with counterexample rows for an unreduced house
      error, a ceiling-lowered warning, a `null`-reqId config finding, and a finding carrying both a
      suppression and clamp metadata.
    - **`trustActions { raised, suppressionsCleared }` and `byProvenance` are ORTHOGONAL metrics,
      explicitly excluded from that sum.** Round 10 showed the exclusivity claim was unsatisfiable as
      written, and the two counterexamples are worth keeping: **row 2**, where `U4` declares `error` and
      a grader profile reduces it to `warn`, belongs to `profileConformance` **and** to `warns` under
      the current live-warning predicate; and **row 9**, where one finding increments both `raised` and
      `suppressionsCleared`. Making `warns` a residual fixes the first; declaring `trustActions`
      orthogonal fixes the second. Overlap tests use exactly those two rows.
    - **This redefines `warns` from "every live warning" to "every live warning not already counted",
      which is a public meaning change** and is recorded in the ADR rather than slipped in. The
      alternative - leaving the buckets overlapping - means no consumer can ever sum them, which is
      what everyone already assumed they could do.
  - **The old off-to-warn behaviour is subsumed, and the difference is the reversal itself.** A
    subject-owned `off` on an objective finding used to become `warn`; it now returns to the trusted
    resolution, which for a check declaring `error` is `error`.
  - Exact final values for `effectiveSeverity`, `suppressed`, `suppressionReason` and `trustNotice` are
    asserted per cell, together with disposition counts and the terminal, JSON, Markdown and HTML
    renderings - because a state machine that is right in one renderer and stale in another is how
    `downgradedFrom` came to mean two things.
- **THE RANK GUARD: the trust step only ever raises. A stricter subject stays strict.** The step 3
  algorithm computes the trusted resolution, but it must not apply it unconditionally -
  `effectiveSeverity = max(subjectResolved, trustedResolution)` by `SEVERITY_RANK`, so the trusted value
  is taken **only when the subject's own result ranks lower**. Equal or stricter subject results survive
  untouched.
  **Without this guard the fix inverts into the defect it exists to prevent.** `U7`
  (instruction-budget) is vendor-cited and declares `warn`. A subject writing `rules.U7 = "error"` is
  being *stricter about itself*, and an unconditional recomputation drops it back to `warn` - taking a
  deliberately failing published verdict and turning it green, by way of the mechanism built to stop
  verdicts being turned green. The same happens whenever a grader profile selects `warn` and the subject
  raises the rule to `error`. **The policy authorises rejecting subject-owned REDUCTIONS and nothing
  else**, and three revisions of this text said "restore" where they meant "raise to at least".
- **Two matrix cells exist for exactly this**, added because nothing in cells 1 to 10 varied a subject
  *increase*: (11) pin 0.13, published, subject-owned `rules.U7 = "error"` on a module that declares
  `warn` -> stays **`error`**; (12) a grader-owned profile selecting `warn` beneath a subject-owned rule
  of `error` -> stays **`error`**. A thirteenth covers grader-owned rule versus grader-owned profile
  disagreement, where normal precedence applies and neither is distrusted.
- **Ordering, which must be asserted rather than assumed:** trust step first, ceiling last. At pin 0.12
  a subject-lowered `U13` is raised to `error` by the trust step and then lowered to `warn` by the
  ceiling, so the result is `warn` - unchanged, and the red-ward invariant holds. At pin 0.13 it is
  raised to `error` and the ceiling is inactive, so it gates. **The trust step can never lift a finding
  above its ceiling**, which is exactly why closing E38 cannot break the invariant. Note that the
  suppression clearing above is **not** repaired by the ceiling: the ceiling ranks severity and never
  touches `suppressed`, so that half of the disposition has to be right the first time.
- **Ceiling provenance is part of this workstream, not a consequence of it.** `standard-gate.mjs:37` is
  today the sole producer of `downgraded`, `since` and `pinned`, and five surfaces consume it:
  `check.mjs:95` (`standardDebtLine`), `check.mjs:111` (the per-finding debt annotation),
  `evaluate-marketplace.mjs:122` (per-member `standardDebt`), and `report-render.mjs:1108` and `:1209`
  (the Markdown and HTML collection columns). Moving the decision without moving the record would delete
  Standard debt from four report surfaces while every report still rendered, showing a plausible zero -
  the hardest class of regression to notice. So the ceiling stamps **one public field named `ceiling`**,
  whose value is **`{ pinned, from, to, due, constraints: [{ cause: "since" | "until", due }] }`** or
  **`null` whenever no constraint BINDS** - which includes the case where a constraint is
  version-active but changed nothing because config had already lowered the finding. Never an empty
  object, never an empty array, so `if (f.ceiling)` is the whole check a consumer needs.
  **"Null when no constraint is active" was the wording here for one round after the binding rule was
  introduced in the canonical block**, and round 13 was right that the two definitions disagree on
  exactly the phantom-debt case the binding rule exists to remove. Binding-only is the definition,
  stated identically in both places.
  **The name and shape are fixed here because round 11 found three spellings of them in this document**
  (`ceilingConstraints` in the pseudocode, `constraints` in the compatibility rules, `ceilingConstraints`
  again in the matrix), with the serialized element permitting only `{cause, due}` while the severity
  loop needed a `ceiling` value on it. Following any one of those instructions violated another.
  **The internal constraint object carries a third member, `ceiling`, and it is NOT serialized** - the
  loop needs it, a reader does not, and `since` constraints always cap at `warn` while `until`
  constraints cap at `migration.capAt`. The value is an **array**,
  because a singular cause is provably ambiguous: at pin 0.11, `U13` is under an introduction ceiling
  (`since: "0.12"`) **and** a tightening ceiling (`until: "0.13"`) at the same time, and a singular field
  would report the finding as due at 0.12 while it is in fact still capped until 0.13. The top-level
  `due` is the **maximum** across active constraints, since the finding is only free when the last one
  lifts. Round 3 found this; the earlier singular shape would have shipped a wrong due version to every
  reader at any pin more than one minor behind.
- **`--json` is an external contract and gets compatibility, with the mapping SPECIFIED rather than
  promised.** `check.mjs --json` and `evaluate.mjs --json` expose complete finding objects to automation
  outside this repository, so the plan's list of five in-repository consumers was not the whole
  population - the same mistake as assuming the family is the whole consumer population. Round 3 added
  the compatibility promise; round 4 was right that a promise without a mapping is undefined behaviour
  in the dual-constraint case, and would have left an external contract dependent on whichever
  constraint an implementation happened to pick. The rule:
  **Each legacy field is specified independently, because treating them as an atomic "triple" produced
  a self-contradiction** - an earlier revision said the triple is emitted only when an introduction
  constraint participates *and* that `downgraded` stays true whenever any constraint is active, which
  cannot both hold for an `until`-only ceiling. Round 5 caught it. The rules:
  - **`downgraded`: true whenever a constraint BINDS - not merely whenever one is version-active.**
    Round 12 caught the difference, and it produces phantom debt. Constraints activate purely from the
    pin and the versions, so in matrix row 7 a local `rules.U13="warn"` has already lowered the finding
    before the ceiling runs; the ceiling then changes nothing, yet the earlier rule still emitted
    `downgraded: true` and full ceiling metadata. Every migrated debt consumer would then report that
    the pin is holding this finding back and that it becomes gate-failing at the due version, while the
    unchanged config keeps it a warning either way. **A version condition that changes no outcome is not
    debt.** Binding is `rank(afterCeiling) < rank(postTrust)`, computed in the canonical block, and it
    gates both the legacy field and the `ceiling` object together so the two can never disagree.
    This also protects the external meaning of `downgraded`, which has always meant "an applied
    downgrade" and would otherwise have silently become "a potentially non-binding version condition".
  - **`pinned`: emitted whenever a constraint binds.** It is the plugin's pin and is cause-independent.
  - **`since`: emitted ONLY when an introduction constraint participates**, and always equal to that
    constraint's version. It is never derived from an `until`, because a tightening does not change when
    a check was introduced, and setting it from `max(due)` would tell a reader the check appeared in a
    version it did not.
  - **Consequence, and it is not optional:** `check.mjs:95`'s `standardDebtLine` currently selects on
    `downgraded` and then reads `since`, which is now absent for an `until`-only hold. **Every
    in-repository debt consumer moves to `constraints` and `due`**; the legacy fields exist for external
    `--json` readers only. Leaving `standardDebtLine` on `since` would print an undefined version for
    every `G4` legacy-index hold and every `U13` hold at pin 0.12 - which is most of them.
  - **The marketplace report's PROSE explanation of Standard debt moves too, not just its number.**
    `report-render.mjs`'s Markdown and HTML marketplace sections define Standard debt as findings that
    **postdate the member's pin** - an introduction-only definition that becomes false the moment debt
    includes tightenings. A `U13` hold at pin 0.12 or a `G4` legacy-index hold at 0.13 contributes to
    `standardDebt` while the check does **not** postdate the pin. Round 14 caught this: the column would
    have been arithmetically correct beside a published sentence explaining it wrongly, which is the
    same defect class as a compatibility field that lies. New definition, used in both renderers:
    **findings held below their severity by a binding introduction OR tightening ceiling**, with
    renderer tests for an `until`-only debt case.
  - Documented as deprecated for this minor, with contract tests asserting the **exact JSON keys and
    values** for all five shapes: introduction-only, tightening-only, dual-constraint, fully lifted, and
    `--strict`.
- Two further consequences that must be handled rather than discovered:
  - `check.mjs:111`'s text is `since`-shaped ("introduced in Standard X, after pinned Y") and is wrong
    for an `until` ceiling - it would report a `U13` tightening as due at 0.12 when it is due at 0.13.
    The annotation branches on `cause`.
  - `evaluate.mjs:54` counts `downgradedFrom != null` as **profile conformance**. A ceiling-lowered
    finding would be misfiled as a profile downgrade, so that predicate must exclude ceiling causes the
    same way it already excludes `clampNotice`.
- **Under `--strict`, `pinned` is passed as undefined**, so both ceiling inputs go inert together.
- **Acceptance: THE compatibility matrix, defined here once and referenced everywhere else.** The
  verification protocol points at this definition rather than restating it, because round 3 found two
  copies that had already drifted - one carried a profile axis and the other did not.
  - **Axes.** Pins {none, garbage, 0.11, 0.12, 0.13, **0.14**} x config {default, `rules.X="error"`,
    `rules.X="warn"`, `rules.X="off"`, suppression} x profile {`askit-library`, `plain-plugin`, each
    both **CLI-selected and subject-configured**} x mode {`local`, `published-verdict`} x
    **`--strict` {on, off}**.
    **`--strict` and `mode` are INDEPENDENT axes, not alternatives.** An earlier revision listed
    `normal`, `--strict` and `published-verdict` as three values of one axis; the CLI accepts
    `--strict` together with `--mode published-verdict`, so that framing left the combination
    unspecified. Strict makes the **ceiling** inert; it says nothing about trust, and the trust step
    still runs.
  - **Subjects, corrected twice, and the second correction is the instructive one.** A profile axis is
    worthless over checks no profile touches. `U13` is objective and `U14` is vendor-cited, and neither
    appears in any profile's rule map, so round 2's profile axis over those two exercised nothing.
    Round 3 added `S4` and `U4` and called `S4` "the only subject where the ceiling and a profile
    interact on a changed path". **Round 4 falsified that too:** W4 gives `G4` a
    `migration: {capAt: warn, until: "0.14"}`, and `G4` is in `HOUSE_REQIDS` (`profiles.mjs:20`), so
    `plain-plugin` turns it off. `G4` is a second such subject, and the sentence claiming uniqueness was
    written in the section added to stop exactly this mistake. **The lesson is now encoded as a rule
    rather than a list: every check whose emitted severity or migration metadata this release touches is
    a matrix subject, and the matrix is derived from that set rather than enumerated by hand.**
  - **The resulting subjects:** `U13` (`until`-gated, objective), `U14` (`since`-gated, vendor-cited),
    `S4` (`until`-gated, off under `plain-plugin`), `U4` (vendor-cited, lowered to `warn` by
    `plain-plugin` - the calibration that killed the naive floor, kept measured even though the floor is
    deferred), and **`G4` in two variants: an `INDEX.md` matching the legacy rendering exactly (the
    capped migration case) and one drifted for any other reason (which must stay a hard error)**.
  - **Pins include 0.11 and 0.14.** 0.11 produces a finding under **both** ceiling causes at once.
    **0.14 is required by `G4`**: without it the matrix never proves the `G4` ceiling actually lifts, and
    an inert `G4` graduation would pass exactly as the inert `S4` graduation passed round 1.
  - **Assert the outputs a reader depends on, not just the severity:** gate result, earned tier,
    blocked-tier list, disposition counts, and the notice text.
  - **THE CELLS, as an explicit table.** Three rounds of hand-enumerated prose produced a matrix that
    was missing `G4`, missing pin 0.14, missing every subject *increase*, and expressed cells 11 to 13
    as a paragraph elsewhere in the document. Round 9 was right that a wrong implementation could pass
    the declared gate. Every cell below states its inputs and its complete expected disposition, and
    each one is here because it fails a different wrong implementation. `sev` is
    `effectiveSeverity`; `sup` is `suppressed`.

    | # | pin | mode | strict | profile (owner) | `askit.config.json` | **fixture / `library.json`** | subject | sev | sup | gate | kills |
    |---|---|---|---|---|---|---|---|---|---|---|---|
    | 1 | 0.13 | published | off | default | `rules.U13="warn"` | unregistered skill dir | `U13` | `error` | false | fail | the bypass itself |
    | 2 | 0.13 | published | off | `plain-plugin` (**grader**) | none | name/dir mismatch | `U4` | `warn` | false | pass | a floor that ignores provenance |
    | 3 | 0.13 | published | off | `plain-plugin` (**subject**) | none | name/dir mismatch | `U4` | `error` | false | fail | a self-granted exemption |
    | 4 | 0.13 | published | off | default | `rules.U7="warn"` | oversized instruction | `U7` (declares `warn`) | `warn` | false | pass | a hard-coded `error` floor |
    | 5 | 0.13 | published | off | default | suppression on `U13` | unregistered skill dir | `U13` | `error` | **false** | fail | a severity-only floor |
    | 6 | 0.13 | published | off | default | `rules.S4="off"` | string chain decl | `S4` (**house**) | `off` | false | pass | a floor that defends house checks |
    | 7a | 0.12 | **local** | off | default | `rules.U13="warn"` | unregistered skill dir | `U13` | `warn`, `configReduced: true`, `ceiling: null` | false | pass | a floor leaking into local CI |
    | 7b | 0.12 | **local** | off | default | `rules.U13="off"` | unregistered skill dir | `U13` | `off`, `configReduced: true`, `ceiling: null` | false | pass | a ceiling that fires on an already-off finding |
    | 7c | 0.12 | **local** | off | default | suppression on `U13` | unregistered skill dir | `U13` | `warn`, `configReduced: false`, `ceiling` **non-null** | **true** | pass | conflating suppression with a config reduction |
    | 8 | 0.13 | published | off | default | **grader**-owned suppression | unregistered skill dir | `U13` | `error` | **true** | pass | clearing the grader's own waiver |
    | 9 | 0.13 | published | off | default | subject rule **and** subject suppression | unregistered skill dir | `U13` | `error` | false | fail | ownership taken from the merged config |
    | 10 | 0.13 | published | off | `plain-plugin` (**grader**) | `rules.U4="off"` | name/dir mismatch | `U4` | **`warn`** | false | pass | "restore the declared severity" |
    | 11 | 0.13 | published | off | default | `rules.U7="error"` | oversized instruction | `U7` (declares `warn`) | **`error`** | false | fail | **an unconditional reset (the rank guard)** |
    | 12 | 0.13 | published | off | `plain-plugin` (**grader**) | `rules.U4="error"` | name/dir mismatch | `U4` | **`error`** | false | fail | a rank guard that ignores grader reductions |
    | 13 | 0.13 | published | off | `plain-plugin` (**grader**) **+ grader** `rules.U4="error"` | none | name/dir mismatch | `U4` | `error` | false | fail | grader rule vs grader profile precedence |
    | 14 | **0.12** | published | off | default | `rules.U13="warn"` | unregistered skill dir | `U13` | **`warn`** | false | pass | **the red-ward invariant** (trust raises, ceiling lowers) |
    | 15 | **0.11** | local | off | default | none | unregistered skill dir | `U13` | `warn` | false | pass | a singular ceiling cause (`due` must read 0.13) |
    | 16 | **0.12** | published | **on** | default | `rules.U13="warn"` | unregistered skill dir | `U13` | `error`, `ceiling: null` | false | **fail** | **an implementation that ignores `--strict`** |
    | 17 | **0.14** | local | off | default | none | legacy `INDEX.md` | `G4` | **`error`** | false | fail | **an inert `G4` graduation** |
    | 18 | 0.13 | local | off | default | none | legacy `INDEX.md` | `G4` | `warn` | false | pass | a `G4` cap that never applies |
    | 19 | 0.13 | local | off | default | none | `INDEX.md` drifted **otherwise** | `G4` | `error` | false | fail | a cap that swallows real drift |
    | 20a | **no `standard` key** | local | off | default | none | agent with `hooks:` | `U14` | `error` | false | fail | a ceiling that guesses at a missing pin |
    | 20b | **`standard: "banana"`** | local | off | default | none | agent with `hooks:` | `U14` | `error` | false | fail | a garbage pin parsed as a real one |
    | 21 | **0.12** | published | off | `plain-plugin` (**subject**) | none | name/dir mismatch | `U4` (**uncapped**) | `error`, `ceiling: null` | false | **fail** | **the false "no red-ward below the graduation pin" guarantee** |
    | 22 | **0.12** | **local** | **on** | default | none | unregistered skill dir | `U13` | `error`, `ceiling: null` | false | **fail** | **the claim that published-verdict is the only red-ward path** |
    | 23a | **0.12** | local | off | default | none | **`library.json` `selfValidation: "banana"`** | `U1` subrule | `warn`, `ceiling` non-null, `migrationNotice` set | false | pass | **a new SUBRULE inheriting its check's `since`** |
    | 23b | **0.13** | local | off | default | none | **`library.json` `selfValidation: "banana"`** | `U1` subrule | `error`, `ceiling: null` | false | **fail** | a cap that never lifts |
    | 23c | **0.12** | local | **on** | default | none | **`library.json` `selfValidation: "banana"`** | `U1` subrule | `error`, `ceiling: null`, **no `migrationNotice`**, neutral `reason` in `--json` | false | **fail** | **an activation-specific `reason` under strict** |
    | 24a | **0.13** | local | off | default | none | unregistered skill dir | `U13` (objective) | `error` | false | **fail** | an inert `U13` at an adopted pin |
    | 24b | **0.13** | local | off | default | none | **STRING-shaped chain decl only** - no array form, no pre-existing signal | `S4` (**house**) | `error` | false | **fail** | an inert **string-derived** `S4`, which an array fixture would mask |
    | 24c | **0.13** | local | off | default | none | agent with `hooks:` | `U14` (vendor-cited) | `error` | false | **fail** | an inert `U14` at an adopted pin |

    **Rows 23 and 24 were each one row until round 16, and both had the row-7 disease.** Row 23's input
    lived in the `subject config` column, but `selfValidation` is a **`library.json`** field, not an
    `askit.config.json` one - a literal fixture would not have exercised `U1` at all. Row 24 bundled
    `U13`, `S4` and `U14` behind one severity and one gate result, so **any one of the three could have
    stayed inert while a sibling's error kept the aggregate failing** - the exact masking that forced
    row 7 apart, repeated four rounds later. They also split by provenance: `S4` is house and the other
    two are not, so they land in different disposition buckets and cannot share an expectation.

    **Row 22 is a red-ward path with no published-verdict involvement at all.** W2 makes `U13` emit
    `error`, `--strict` disables the ceiling that would lower it, and a plugin pinned at 0.12 running
    its own local strict gate goes green to red on upgrade. Strict has always meant "grade me against
    the newest spine", so this is correct behaviour - but it went unstated for thirteen rounds while
    two separate passages asserted published-verdict was the only way a verdict could redden.
    **Row 21 is the release's other genuine green-to-red case and it exists because a guarantee was
    wrong.**
    `U4` has `since: "0.x"` and no `migration`, so **no ceiling can lower it back** at any pin. A
    subject-owned `plain-plugin` lowers it to `warn` today; the trust step restores `error`; nothing
    intervenes. Rounds 12 and 13 both had to correct text claiming this could not happen, and the
    measurement it demands - an older-pinned, uncapped, published-verdict subject - is precisely the
    case the capped `U13` rows make look safe.

  - **Rows 14 and 16 differ in exactly one input and that is the point.** Both are `U13` at pin 0.12
    under `published-verdict` with a subject-owned `rules.U13="warn"`. With strict **off** the trust
    step raises to `error` and the active `until: "0.13"` ceiling lowers it back to `warn` (pass). With
    strict **on** the ceiling is inert, so the result stays `error` (fail). An earlier revision put the
    only strict row at pin **0.13**, where `U13` has no active constraint in either mode - so an
    implementation ignoring `--strict` entirely passed all twenty rows. Round 10 caught it. **A control
    variable must be varied where it can change the answer**, which sounds obvious and was wrong here
    for a full round.
  - **Every cell additionally asserts** `suppressionReason`, `trustNotice`, `ceiling`, the
    disposition counts, earned tier and blocked-tier list - not `sev` alone. Row 15 asserts **two**
    active constraints with `due` = 0.13; row 16 asserts an **empty** constraint set.
- **Check-applicability observability is REMOVED from this workstream and filed as E39.** It entered W1
  in an earlier revision as a single acceptance bullet - "a skip must be distinguishable from a pass" -
  written in response to the `pm-skills` correction, and round 6 was right that it is a feature wearing
  an acceptance criterion's clothes. `registry.mjs:48` is `CHECKS.flatMap((m) => m.check(ctx))`: a
  passing check and a skipped check both return `[]`, so they are indistinguishable **by construction**.
  Separating them needs a new execution-result protocol threaded through the registry, every check
  module, plugin and component evaluation, marketplace aggregation, the JSON contract and every
  renderer. None of that is a severity ceiling, config provenance, or a trust floor. Folding it in would
  have made W1 a fifth feature that can be half-implemented while the evidence stays misleading, which
  is the precise failure this plan's own narrowing section objects to in its predecessor.
  **The motivating problem does not go away, so it is recorded rather than dropped:** this plan's
  evidence table had to be corrected by hand because a `U13` skip on `pm-skills` looked exactly like a
  pass. Until E39 lands, that inference stays a manual step, and the evidence table says so.
- **The horizon test guards the failure mode that replaces the old one.** Under the hand-edited design
  the risk was forgetting to graduate; here there is nothing to forget, because a ceiling with
  `until: "0.13"` is never removed - it is what keeps giving a consumer pinned at 0.12 a warn. The new
  risk is an `until` that never arrives. The test asserts every registered `until` **parses as a real
  Standard version** (not the `0.x` sentinel, not garbage) and is **at most one minor beyond the version
  `STANDARD.md` declares**. The review noted this test would have passed while `S4` was behaviourally
  inert, which is true and is why it is paired with the matrix above: the horizon test guards the data,
  the matrix guards the behaviour, and neither substitutes for the other.

### W2 - The two scheduled graduations, discharged through W1

- **Why:** both were promised for 0.13 by ratified ADRs (0035 for `U13`, 0041 for `S4`) and neither can
  be delivered by the mechanism that promised it.
- **Both checks emit the TARGET severity. Neither encodes a migration state itself.** That sentence is
  the whole workstream, and the first draft got it right for one check and wrong for the other.
  - `U13_SEVERITY` in `scripts/checks/skill-registration.mjs` becomes `SEVERITY.ERROR` permanently, with
    **`migration: { capAt: "warn", until: "0.13", reason: "..." }`** on its findings - the full triple,
    because `migrationNotice` reads `reason` and an earlier revision specified only `{capAt, until}`,
    which would have rendered `undefined` into a published explanation. The same applies to `G4`'s
    `{ capAt: "warn", until: "0.14", reason: "..." }` in W4. The comment instructing a future maintainer
    to hand-edit the constant is deleted, because there is no longer a hand-edit to instruct.
  - **`chain-contract.mjs`'s two string-derived branches change from `SEVERITY.WARN` to `SEVERITY.ERROR`**
    (`:106`'s `preexistingSignal ? ERROR : WARN` and `:150`'s `shape === "array" ? ERROR : WARN`), each
    still carrying `STRING_SHAPE_MIGRATION`. The array-shaped and legacy-array paths keep emitting
    `ERROR` with no migration field and are untouched, exactly as ADR 0041 specified. `STRING_SHAPE_
    MIGRATION` itself needs no edit; what changes is the severity the ceiling is lowering **from**.
  - **Why this reads as a tightening and is not one:** a string-derived `S4` finding resolves to `warn`
    for every pin below 0.13, which is what it resolves to today. The emitted value changed; the
    resolved value did not, for anyone who has not adopted 0.13.
- `GRADUATION_NOTE`'s wording moves from "becomes an error at Standard 0.13" to "becomes an error once
  you pin Standard 0.13", because the semantics move from calendar to opt-in and a note that outlives its
  accuracy is the drift class this repository keeps rediscovering.
- **The `reason` is STATIC and activation-neutral; only the run-specific NOTE and NOTICE are derived
  after resolution.** Round 15 identified the problem - at pin 0.12 under `--strict` the ceiling is
  disabled, `S4` is already an `error`, and a note promising it "becomes an error once you pin 0.13" is
  false in that very run - but round 16 showed the fix as first written was **not executable**: the
  canonical algorithm reads `finding.migration.reason` to build `migrationNotice`, so the reason cannot
  be a post-resolution derivation, and the raw `migration` object stays visible through `--json`
  regardless. Withholding it leaves a binding notice without its required input; keeping a run-specific
  claim in it publishes a falsehood under strict. So the two are separated:
  - **`migration.reason` is a static property of the SHAPE** - "a string-shaped chain declaration is
    newly parsed at Standard 0.12" - stating what the migration is *about*, with no claim about what
    any particular run did. It is safe in `--json` at any pin, in any mode.
  - **`GRADUATION_NOTE` and `migrationNotice` are run-specific** and are emitted only when the `until`
    constraint actually bound. Under strict, both are absent.
  - **The RESOLVER owns both, and `chain-contract.mjs` stops appending the note at emit time.** Round 17
    was right that the previous wording had no executable data path: the check appends
    `GRADUATION_NOTE` while building the finding, where the pin and strict mode are not known, so a
    conditional note cannot be produced there at all. `resolveFindings` already computes
    `bindingUntilConstraint`, so it derives **both** strings from `finding.migration` at the one point
    that knows whether the constraint bound. **`STRING_SHAPE_MIGRATION` therefore DOES need an edit** -
    an earlier revision said it needed none, which cannot hold alongside a `reason` whose current text
    claims the finding "stays capped at warn until Standard 0.13", false in any strict run.
  - **The existing direct-check tests that assert the raw message contains the 0.13 note are replaced,
    not preserved.** They assert a property the design deliberately moves: the note is now a property of
    a resolved finding, not of an emitted one. Their replacements assert the resolved output for
    default, lifted, non-binding and strict runs - which is strictly more than the old assertion
    covered, and is why replacing them is a widening rather than a loss.
  An `S4` counterpart of row 22 asserts that strict terminal and JSON output carries the neutral
  metadata and **no graduation promise**.
- **Acceptance, and the second half is the one the first draft would have failed:** the family
  measurement is re-run and still moves zero verdicts; a fixture pinned at 0.12 with an unregistered
  skill gets a `warn` and the same fixture pinned at 0.13 gets a gate-failing `error`; **and the
  identical pair for an `S4` string-shaped chain declaration, asserted under DEFAULT config** - not under
  a `rules.S4` override, since an override happening to produce the right answer is exactly how the
  inert-graduation defect stayed invisible.

### W3 - `U14`, A6 as a numbered plugin-scope check (E33)

- **Why:** Claude Code does not support `hooks`, `mcpServers` or `permissionMode` on a plugin-shipped
  agent. v1.12.0 detects this across the members of a catalogue and does not detect it when a single
  plugin is graded on its own, which is how almost everyone runs the gate. Same silent-no-op class as the
  v1.10.0 phantom-subagent discovery: the author believes they configured something and the runtime
  refuses it.
- **W3 depends on W1 and cannot ship before it.** A new module
  `scripts/checks/agent-restricted-fields.mjs` with
  `reqId: "U14", tier: "universal", provenance: "vendor-cited", since: "0.13"`, carrying no migration
  metadata because `since` alone governs an introduction. **That is true only under W1's reordering.**
  Under today's ordering the `since` downgrade is a pre-pass and a consumer's `rules.U14 = "error"` beats
  it (E26), so `U14` would hand a gate-failing error to a plugin pinned at 0.12 for a check that did not
  exist at its pin - a verdict moving with no pin change, on this release's own new check. The first
  draft of this plan asserted the no-metadata claim as a property of `since`; it is a property of
  **`since` plus post-override placement**, and shipping W3 without W1 reintroduces E26 rather than
  avoiding it.
- `PLUGIN_AGENT_UNSUPPORTED_FIELDS` moves out of `scripts/lib/marketplace/analyze.mjs` into a module both
  scopes import, so the field list exists once rather than twice. Spine goes 30 to 31:
  `tests/unit/registry-sync.test.mjs`, `STANDARD.md` and the provenance map move together, which the
  tests enforce by construction.
- **`U14` gets its own ratified decision record, ADR 0045**, rather than being ratified by a workstream
  description. E33 is filed ADR-gated, and this release defers E34 and the whole vendor-alignment pack
  precisely *because* their ADRs are undrafted; promoting a vendor-dependent requirement into the
  normative Universal spine on a plan paragraph while doing so is incoherent, and the pre-implementation
  review was right to call it. The ADR decides three things a workstream description cannot: which agent
  targets the requirement applies to, what happens when the vendor's documentation changes (the quote has
  already survived one host move), and whether a field the vendor later supports is a Standard revision
  or a silent re-read.
- **ADR 0045 is a REQUIRED deliverable, not a gate with a fallback.** An earlier revision said "if it is
  not ratified, W3 defers and the spine stays at 30", and round 2 was right that this was incoherent
  rather than cautious: W5 registers `U14` in `STANDARD.md` unconditionally, so the 30-branch would have
  published a normative requirement with no enforcing check, and `tests/unit/registry-sync.test.mjs`
  asserts an exact spine count that only one branch satisfies. A half-specified fallback nobody verifies
  is worse than no fallback. **ADR 0045 is written and ratified as part of this cut. If it turns out it
  cannot be, the release is re-planned rather than executed down an unverified branch** - a decision made
  with the packet open, not silently at implementation time.
- **Re-verify the vendor quote against the live page at implementation time** rather than trusting the
  copy in `analyze.mjs`. The docs host has already moved once: `docs.claude.com` now 301s to
  `code.claude.com`.
- **Acceptance:** a fixture agent carrying a forbidden field produces a `U14` finding naming the field
  and citing the vendor doc; an agent carrying only supported fields produces nothing; the marketplace
  scope's own A6 reading produces identical field detection from the shared module; spine is 31 and the
  registry-sync test agrees.

### W4 - E35, the generator fix, with a capped `G4`

- **Why:** `gen-index` emits `Self-validating: node scripts/check.mjs` unconditionally into every plugin
  it generates an index for, including plugins that consume this toolkit rather than vendoring it and
  therefore have no such path. Unlike a wrong instruction in our own docs, this one ships inside a
  consumer's own repository over their signature. Found by executing the repository's own published npm
  instruction from a clean directory, which is the third time consumer-position execution has found
  something no amount of reading found.
- **Scope: `npx agent-skills-toolkit .` is the default for every plugin, and the vendored form is emitted
  only when the plugin DECLARES it, via the `library.json` `selfValidation` enum specified below.** This
  is the fourth design for this one line. The first three were heuristics that guessed at identity from
  a side effect, and each is recorded because the acceptance fixtures exist to kill them.
  - Draft 1 keyed on `existsSync(<root>/scripts/check.mjs)`. Round 3: `scripts/check.mjs` is a generic
    path, so a consumer with an unrelated file there gets an `INDEX.md` telling readers to self-validate
    by running **someone else's program** - E35 again, failing silently instead of loudly.
  - Draft 2 keyed on the `G2` self-hosting condition. **Round 4: `G2` proves nothing about identity.**
    `self-hosting.mjs` never calls `existsSync` on the gate at all; it regex-matches workflow YAML for
    `scripts/check.mjs`, or for an npm script name whose definition matches. A consumer whose CI merely
    *references* that path - including one where the file does not exist - satisfies `G2` and receives
    the same false instruction. A check that answers "does your CI mention the gate" was read as
    answering "are you the gate".
  - Draft 3 keyed on `library.json` name equalling `agent-skills-toolkit`. **Round 5: a name in a
    target's own manifest is authored data, not authenticated identity.** A fork, a rename, or an
    unrelated plugin that simply uses that name - with no vendored gate - receives the same false
    instruction, and `G4` accepts it because the checker calls the same renderer. Three drafts, three
    proxies: a path, a CI mention, a name. Each felt like identity and none of them was.
  - **The shipped rule stops inferring and starts reading a DECLARATION - a NAMED field with a CLOSED
    schema.** Round 6 was right that "an explicit optional declaration" was not a specification: an
    unnamed, untyped, unvalidated field can be false or malformed and still make `gen-index` and `G4`
    agree on the same wrong instruction, leaving the gate green while publishing exactly the defect E35
    exists to remove.
    - **Field:** `library.json` gains an optional `selfValidation`, whose value is one of exactly two
      strings: **`"vendored"`** or **`"npx"`**. Absent means `"npx"`.
    - **It is an ENUM, not a command string, and that is deliberate.** A free-text command would let a
      plugin write arbitrary text into its own `INDEX.md` through our generator, and would give `G4` a
      value it cannot check. The renderer owns the command text for each of the two cases; the manifest
      only selects between them.
    - **`U1` (library-json) validates it, and that finding CARRIES ITS OWN CEILING** -
      `migration: { capAt: "warn", until: "0.13", reason: ... }`. Present-and-not-one-of-the-two is a
      finding, and the generator falls back to `"npx"` - the safe default - rather than honouring an
      unparseable value. Absent is not a finding.
    - **Why the ceiling, which round 15 caught and which is the same defect as E26 one level down:**
      `U1` is registered with `since: "0.x"`, so a **new subrule added under an existing reqId inherits
      that reqId's `since` and gets no migration window at all**. A plugin pinned at 0.12 carrying an
      arbitrary `selfValidation` value passes today, because an unknown `library.json` field is simply
      ignored, and would have failed immediately after this release - **a red-ward movement inside the
      governing invariant's scope, not one of its exclusions.** The check-level `since` mechanism cannot
      see a subrule, so the subrule needs the finding-level ceiling. Matrix row 23 measures it at pin
      0.12, local, non-strict, default config.
    - **This generalises and belongs in ADR 0044:** every new or tightened SUBRULE under an existing
      reqId needs finding-level `migration` metadata, because `meta.since` describes when the *check*
      appeared and says nothing about when a rule inside it did.
    - **It is deliberately absent from the generated native manifests.** It is an askit-house field with
      no meaning to Claude Code or Codex, `U8` compares only name and version, and adding it would put a
      field into someone else's ecosystem manifest for our own generator's benefit.
    - Both `gen-index` and `G4`'s `renderIndex` read this one field, so generator and checker cannot
      disagree. A plugin that declares it falsely misleads only its own readers about its own
      repository - a far smaller failure than this toolkit asserting the same thing on their behalf.
      **A generator should not infer a fact about a repository that the repository can simply state.**
  - **Acceptance fixtures, each defeating one rejected draft or one malformed input:** no
    `scripts/check.mjs` (npx form); an **unrelated** `scripts/check.mjs` (npx - kills draft 1); an
    unrelated `scripts/check.mjs` plus a workflow referencing it so `G2` passes (npx - kills draft 2);
    **a plugin NAMED `agent-skills-toolkit`** with no vendored gate and no declaration (npx - kills
    draft 3); **`selfValidation: "banana"`** and **`selfValidation: 7`** (a `U1` finding, and the npx
    form is generated, proving a malformed declaration cannot influence generation); and this
    repository (vendored form, `INDEX.md` byte-identical). `G4` agrees with the generator in all seven. `renderIndex` gains an internal legacy-rendering path with exactly one
  caller. `index-drift.mjs` (`G4`) compares a drifted file against that legacy rendering, and **only when
  it matches the legacy output exactly** attaches `migration: {capAt: warn, until: "0.14"}`. Every other
  form of drift stays a hard error, so strictness is unchanged for every case except the one this
  toolkit caused.
- **The test that asserts the wrong behavior on purpose is inverted, not deleted.**
  `tests/unit/gen-index.test.mjs`'s "the self-validation line is still emitted unconditionally" exists so
  the defect could not be silently re-fixed without meeting E35. Meeting it means replacing the
  assertion, and leaving a test that still names the reason.
- **Acceptance:** measured, not argued - all six family members graded before and after, with
  `product-lifecycle-templates` holding Advanced and taking one warning rather than dropping to
  Convergent; a scaffolded plugin with no `scripts/check.mjs` generates the `npx` form; this repository
  generates the vendored form and its committed `INDEX.md` stays byte-identical; a file drifted for any
  other reason still errors.

### W5 - Standard 0.13, the pin, and the public page

- **Scope:** `STANDARD.md` moves to 0.13, registers `U14`, rewrites the sec 7.7 burndown text for
  pin-driven semantics (that section currently describes a calendar), and **adds `selfValidation` to the
  sec 5.1 normative field schema** as an optional closed enum whose absence means `npx` at every tier.
  Sec 5.1 is the schema tooling is required to validate against, so enforcing the field in `U1` while
  leaving it out of 5.1 would have Standard 0.13 contradicting its own implementation.
- **Two pins move, not one, and the second is enforced by a test.** `library.json.standard` in this
  repository moves 0.12 to 0.13 - measured safe at 0 `U13`, 0 `S4`, 0 `U14` - **and so does
  `templates/seed-plugin/library.json.standard`**. `tests/unit/init-anatomy.test.mjs:32` asserts the
  seed pin equals the root pin, for the stated reason that a plugin scaffolded today has no legacy to
  protect and must be born on the current ruleset. Bumping only the root fails `npm test`; worse, a
  scaffold that quietly kept 0.12 would opt every newly created plugin out of every check introduced
  since. The Bronze seed may omit `selfValidation` entirely, since absent means `npx`, which is correct
  for a scaffolded plugin.
- A public reference page states what adopting 0.13 costs a consumer and says plainly that an unpinned
  plugin gets no migration window.
- **The four-file rule applies to the new page**, per the house trap this repository has already been
  bitten by: the page, its folder README, the route manifest, and the CHANGELOG entry. The site must be
  **built** before route parity is checked, or the check fails as "baseline route removed".
- **Acceptance:** the site builds; route parity passes after a build; the page carries `G7` frontmatter;
  no quadrant is emptied; `node scripts/check.mjs .` is still Advanced 0/0 after this repository's own
  pin bump.

### W6 - E37, the shell-probe timing budget

- **Why, and why it moved into scope after this plan was first drafted:** E37 was filed as a flaky test.
  It is measurably more than that. `scripts/check-release-counts.mjs:210` compares **both** halves of a
  stated count (`c.total !== authoritative.total || c.failures !== authoritative.failures`), so while
  E37 fails locally, `npm run release-counts` reports drift against any truthful "N tests, 0 failures"
  claim and exits non-zero. This plan's own verification protocol calls that command non-negotiable, and
  `docs/internal/RELEASE.md` has since v1.11.0. A release therefore cannot complete its own stated
  verification on the maintainer's machine while E37 stands. Measured at `8b55840`: 1013 tests / 1
  failure locally, the same two cases 2-of-9 failing in isolation, `validate-windows` green on CI for the
  same commit.
- **Scope: TWO fixes, because the two failing cases do not share a mechanism.** An earlier revision of
  this workstream prescribed one fix for both, inherited from E37's own backlog entry. Round 3 of the
  pre-implementation review found that the entry was wrong, and the correction has been written back
  into it: applying the single prescription would have fixed one case, left the other failing, and left
  `npm run release-counts` non-zero, which is the entire reason this workstream exists.
  - **Case A, "a taskkill helper that starts and stays alive"** (`resolve-bash.test.mjs:373`). Uses
    `_testStuckHelper`, which its own comment describes as "genuinely long-running (but
    self-terminating)". Here the bar **is** the helper's lifetime, and that is the only thing separating
    "the process did not wait" from "the process waited and the helper happened to die". **Widen the
    gap, never the bar:** the helper's lifetime moves to 30 s or more so an exit at 5 s is unambiguous
    under any plausible scheduling delay, and the assertion keeps measuring against the helper's
    lifetime rather than a fixed number.
    **The helper must then be reaped by the OUTER harness, and this is not optional.** A 30 s
    self-terminating helper left running is six times the residency of the 5 s one, and the acceptance
    protocol below deliberately runs this case repeatedly under load - so the fix as first written would
    have added background processes to the very suite E37 exists to stabilise, and amplified E32's
    measured five-orphans-per-run rather than leaving it neutral. The outer harness records the helper
    PID, proves the inner Node process exited independently (which is the actual assertion), then
    terminates the helper, and **asserts no helper survives the case**. Deferring E32 is a decision about
    the production supervisor; it is not licence for this release to leak more.
  - **Case B, "write-then-hang"** (`resolve-bash.test.mjs:213`). **There is no helper lifetime here to
    widen.** The candidate is `while true; do sleep 1; done`, which hangs indefinitely, and line 237
    asserts `elapsedMs < 700 + 2000 + 3000` - `timeoutMs`, plus the module's `KILL_GRACE_MS`, plus a
    3000 ms margin. Because the candidate never exits on its own, **any finite bound proves the
    supervisor enforced its own timeout**, so the margin is the one genuinely arbitrary term and
    widening it costs no discriminating power at all. Fix: raise the margin **and derive the bound from
    the module's own constants** as `timeoutMs + KILL_GRACE_MS + MARGIN`, rather than three literals
    that can drift from the values they are supposed to track.
    **Deriving it is REQUIRED, not preferred.** An earlier revision wrote "and, better, express the
    bound as...", which round 4 correctly read as optional: an implementation could satisfy the written
    criterion by widening another duplicated literal and keep the exact drift mechanism the correction
    exists to remove. `KILL_GRACE_MS = 2000` is a module-private `const` at `_resolve-bash.mjs:191` and
    only functions are exported today, so **this workstream exports a test-visible timing contract** and
    the test asserts against that value. Acceptance includes grepping the test for a literal `2000`,
    which must not appear.
- **This touches the test fixtures' timing only.** `killProcessTree` and `runUnderSupervisor` are not
  hardened further here: that is E32, it was deliberately stopped after four review rounds, and its
  remaining half needs OS-level containment rather than another patch.
- **Acceptance, per case rather than in aggregate**, because an aggregate pass is how one of these two
  stayed hidden inside "E37 fails":
  - Each case is run **repeatedly under load** on this workstation and passes every time, reported
    separately. "The suite went green once" is not evidence for a timing test.
  - `npm run release-counts` exits 0 against a truthful count.
  - **A seeded regression that makes the supervisor genuinely wait for the candidate still fails each
    case independently.** A timing test that cannot fail is worse than one that flakes, so the
    discriminating power is demonstrated per case, not assumed from the pair.
  - `validate-windows` stays green on CI.

### W7 - Records

- **ADR 0044** (the Standard ceiling, config provenance, and the published-verdict floor), which W1
  implements. It supersedes the ordering half of ADR 0027 rather than sitting beside it, and it carries
  two ratifications that are decisions rather than bug fixes: **config provenance** (grader-owned versus
  subject-owned settings, a distinction the codebase does not currently draw) and the **deliberate
  reversal** of `resolve-config.mjs:23-24`'s stated guarantee that "turning the mode on can never flip a
  passing gate to failing". In `published-verdict` mode it now can, for a subject-owned reduction of an
  objective or vendor-cited finding. That reversal is the point, not a side effect, and it must be
  written down as such.
- **E38 is CLOSED by W1**, not deferred. Its backlog entry is updated with the resolution and with both
  rejected designs, since each was killed by a different counterexample and both are easy to re-derive.
- **ADR 0045** (`U14`, restricted fields on plugin-shipped agents), a required deliverable of W3.
- **E26 and E38 are both closed by W1**, and both entries are updated with the resolution **and with the
  designs that were rejected** - the blanket floor killed by `plain-plugin`'s `U4`, and the deferral
  killed by the fact that `rules.U13 = "warn"` is a no-op until this release graduates `U13`. A closed
  entry that records only the answer invites the next person to re-derive the two wrong ones.
- **E26 is closed by W1** and its backlog entry updated to point at ADR 0044. It was filed 2026-08-11
  from the v1.10.1 round-2 review, names `U13` as its live instance, and the first draft of this plan
  designed around it without knowing it existed.
- **The public surfaces that state the guarantee ADR 0044 reverses**, listed by name so W7 cannot be
  discharged without them: `docs/reference/gate-config.md` plus its `site/` mirror, `STANDARD.md`'s
  published-verdict clause, and `tests/unit/config.test.mjs:174-179`. A record task that says only
  "update the docs" is how a published contract survives the code it described.
- **`docs/reference/` also gains the `library.json` self-validation declaration** introduced by W4,
  since it is a new consumer-visible manifest field.
- `docs/internal/execution/relocation-addendum.md` gains the packing-list delta for the new check module
  and the shared vendor-fields module, so the Standard's eventual relocation stays a mechanical diff.
- `STATUS.md`, `RELEASE-HISTORY.md`, `CHANGELOG.md` (including an `### Upgrade` section naming the 0.13
  adoption and the `gen-index` regeneration), `RELEASE-NOTES.md`, `README.md`.
- The two doc corrections already in the working tree at branch time, recording that npm publishing was
  exercised for real and that the registry now serves 1.12.1, ride this release.

## Implementation order

W1 carries four things - the Standard ceiling, E26, config provenance and the E38 trust floor - and the
review asked more than once whether that is one workstream. **It is one workstream with four internal
stages, and the stages have a strict order**, because each later one reads data the earlier one creates.
Build them in this sequence and each step is independently testable:

1. **W1a - origin-bearing config.** `loadConfig` returns `{value, origin}` per setting and stamps
   `origin` on every suppression entry; the five entry points (`check.mjs`, `evaluate.mjs` plugin and
   component, the marketplace per-member path, `tier-report.mjs`) merge CLI options as `grader`.
   **Pure plumbing: no behaviour changes and no verdict moves.** Ship it green before anything reads it.
2. **W1b - the post-resolution ceiling.** Move `applyStandardDowngrade`'s logic into `resolveFindings`
   as the last step, add the `ceiling` metadata and the legacy-field derivation, move every debt
   consumer to `constraints`/`due`. **This closes E26** and is the change matrix rows 7, 14, 15, 17-20
   and 22-23 exercise.
3. **W1c - the trust step.** Requires W1a's origins. **Closes E38.** Rows 1-13 and 21.
4. **W6 (E37)** - independent of everything, and it should be done **FIRST in wall-clock terms**
   regardless of this ordering, because until it lands `npm run release-counts` cannot pass on the
   maintainer's workstation and the release cannot complete its own verification protocol.
5. **W2** (the two graduations) - requires W1b, since the graduations are what the ceiling holds back.
6. **W3** (`U14` + ADR 0045) - requires W1b for the same reason. ADR 0045 is ratified before the code.
7. **W4** (E35, `selfValidation`, the `G4` cap) - **independent of W1** and can proceed in parallel;
   its only coupling is that its `U1` subrule needs W1b's ceiling to be honoured.
8. **W5** (Standard 0.13, both pins, the public page) then **W7** (records) - last, from the code.

**Readiness: the plan is implementable as written.** The final pre-implementation audit found five
symbol-binding defects in the canonical block (all now fixed) and no unresolved design question. The
compatibility matrix is the acceptance criterion; the canonical algorithm is the single authority; and
where the two disagree, **the matrix wins and the block is wrong**, because the matrix states outcomes
and the block states a procedure for producing them.

## Verification protocol

Unchanged from v1.11.0 and v1.12.0, and non-negotiable:

- `node scripts/check.mjs .` and `npm test` before and after.
- `npm run release-counts` after any test count is written, and **counts written last, from the code**.
- Any instruction published for a consumer is executed once from the consumer's position.
- No report claims a tier nobody declared.
- Do not run two full suites concurrently. A concurrent-run failure is unmeasured, not a result.

Added for this release, because it is a Standard bump:

- **Grade all six family members before and after every change that can move an output**, per
  `askit-measure-dont-reason-about-blast-radius`. `node scripts/evaluate.mjs ../agent-plugins` does all
  six in one run.
- **No family member repository is edited.** Verify each working tree is untouched after measuring.
- **The compatibility matrix defined in W1 is a release gate, not a unit test.** Its axes and subjects
  are specified in W1 and deliberately **not restated here** - round 3 found two copies of it in this
  document that had already drifted apart, one carrying a profile axis and one not, which is the same
  duplicate-claim defect `check-release-counts.mjs` exists to catch in test counts. The family
  measurement cannot substitute for the matrix: six local checkouts exercise a single cell of that grid,
  all of them "valid pin, default config, `askit-library`, normal mode".
- **Adversarial review runs to a clean round, and the extra rounds run BEFORE merging.** One round is
  never enough, because the code written in response to a round is itself unreviewed: v1.10.1 took six
  rounds with round 6 catching a defect in a round-5 fix, v1.11.0 took four, and v1.12.0 merged after one
  and then needed v1.12.1 for four findings, three high, every one of them in round-1 fix code.
- **SINGLE-QUOTE the review prompt, or strip backticks from it.** The command is invoked as
  `node codex-companion.mjs adversarial-review "<prompt>"`, and a backtick-delimited identifier inside
  double quotes is a **bash command substitution**: the term is executed and replaced by its output.
  **8 of this plan's own 12 most recent review rounds ran with prompts corrupted this way**, losing
  between one and eight identifiers each - precisely the terms the prompt existed to name. The runs
  still returned plausible findings, which is why it went unnoticed for seventeen rounds. Check each
  run's log for `command not found` lines before trusting that a round covered a named symbol (E41).
- **A killed review run is UNMEASURED, never a result** - the same rule this protocol already applies to
  a concurrent test-suite failure. Round 8 of this plan's own review was killed twice by machine memory
  exhaustion, and one of those runs left a stale `verdict: "approve"` in its buffer beside a summary
  saying contradictions had been found. Reading a truncated run's buffer as a clean round would have
  ended an eight-round review on a fragment. **Check free memory and reap leftover `codex*` process
  trees before a long review sequence** (E40): 32 codex processes were holding 189 node children and
  6.8 GB, and reaping them was what let the round complete.
  **This plan is itself an instance:** its first draft was reviewed before any code existed and returned
  five high findings, four of them confirmed against source - an inert graduation, an unknown-to-the-plan
  backlog entry (E26) describing the exact hole it designed around, a false 6-of-6 measurement claim, and
  a published-verdict false-green. Round 2 runs against this revision before anything is committed.

## Out of scope, deliberately

- **E34** (which cross-member findings belong on the spine) and **E36** (malformed and mixed marketplace
  manifests). Both need a prior ADR decision nobody has made.
- The **vendor-alignment ADR pack**: commands-as-skills, frontmatter vocabulary strictness, `U5` scope
  per **E14**, and standing up vendor-watch. All move to v1.14.0.
- **E32** (orphaned probe processes). Its remaining half needs OS-level containment, which is the right
  mechanism for a production process supervisor and over-engineering inside a test helper. **E37 was
  moved INTO scope as W6** after it was measured to block this release's own verification protocol; see
  that workstream for why, and for why it must not be "fixed" by widening its threshold.
- Remote fetch-at-sha, still deferred by ADR 0039.
- Editing any family member repository.
