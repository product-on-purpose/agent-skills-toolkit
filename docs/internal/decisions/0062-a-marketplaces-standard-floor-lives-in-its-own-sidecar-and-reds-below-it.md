# 0062 - A marketplace's Standard floor lives in its own sidecar, and a member below it reds the collection

## TL;DR

- **Decision:** a catalogue owner who wants every member of their marketplace held to a minimum
  Standard edition declares that floor in the toolkit's own catalogue-root sidecar,
  `askit.marketplace.json`, never inside the vendor's `.claude-plugin/marketplace.json`. A graded
  member whose own Standard pin resolves below a declared floor is a **ninth marketplace-scope
  finding class** (`marketplace-standard-floor`, `reqId: null`, no spine number) that **reds the
  collection**, the same way `marketplace-version-agreement` already does. A member the toolkit
  cannot read a real pin from - no pin, an unparseable value, or the baseline sentinel - fails the
  floor rather than passing it by default.
- **Why:** measured on 2026-10-30, the vendor's marketplace schema accepts an unrecognised key but
  warns on every `claude plugin validate` run and states plainly that Claude Code ignores it, so
  putting toolkit policy there buys permanent validator noise for a value the runtime never reads.
  The toolkit already owns a catalogue-root sidecar built for exactly this kind of subject-declared
  policy, extending ADR 0044's provenance model from one plugin to one catalogue. The floor is a
  claim the catalogue makes about itself, not an expectation this toolkit invents on its behalf, so
  it reds on the same grounds `version-agreement` already reds: a party's own statement disagreeing
  with the fact on disk.
- **Status:** Proposed.

- **Date:** 2026-10-30
- **Deciders:** maintainer (jprisant), with Claude (Sonnet 5.5)

## Builds on

- **[ADR 0039 (marketplace-scope evaluation)](0039-marketplace-scope-evaluation.md)** - the
  self-consistency worst-member rule this ADR extends with a new catalogue-level claim, and the
  "scope-local deterministic findings, no spine number" posture this ADR's ninth class follows. Also
  the source of the unilateral-remedy test this ADR applies to keep the new class off the spine.
- **[ADR 0044 (one post-resolution Standard ceiling and config provenance)](0044-one-post-resolution-standard-ceiling-and-config-provenance.md)**
  - the grader/subject/default ownership model this ADR extends to marketplace scope: a floor
  declared in the catalogue's own sidecar is subject-owned, exactly as a plugin's own
  `askit.config.json` is subject-owned.
- **[ADR 0053 (a pin's label is a claim this repository makes, and being behind is not a defect)](0053-a-pin-label-is-a-claim-and-behind-is-not-a-defect.md)**
  - the precedent this ADR distinguishes itself from. A behind pin is news about somebody else's
  release cadence; a member below a floor the catalogue owner wrote is the catalogue's own claim
  failing, which is a different fact.
- **[ADR 0063 (an advisory layer beside the tier, and a health number that never enters it)](0063-an-advisory-layer-beside-the-tier-and-a-health-number-that-never-enters-it.md)**
  - the currency category keeps reporting how far behind a pin is and enforcing nothing, at plugin
  scope. This ADR's floor is a separate, opt-in, marketplace-scope gate beside it, not a replacement
  for it.
- **E75 (a marketplace cannot require a minimum Standard edition of its members)**, filed in
  `docs/internal/backlog/enhancements.md`, ruled 2026-10-04 to be written after the "own plugins
  first" migration finished. That migration finished 2026-10-30: every member of the
  `product-on-purpose/agent-plugins` marketplace now pins Standard 0.17, at registry 1.116.0
  (`docs/internal/roadmap.md` section 3; `docs/internal/STATUS.md`, "What is open").

## Context and problem statement

E75's own text states the triggering measurement: on 2026-09-30 the six-member family marketplace
pinned editions 0.8, 0.11, 0.12, 0.12 and 0.16 across its members, and one member,
`pm-skills`, declared no Standard at all. `thinking-framework-skills` read OK at its pin of 0.8
while holding 90 findings below their severity. The maintainer's stated goal, recorded the same
week, is common standards across the plugins in one marketplace. Nothing in the gate today lets a
catalogue owner express that goal.

The "own plugins first" migration this ADR was ruled to wait for is now complete. Every member of
the family marketplace pins Standard 0.17 and earns its own declared tier with zero errors at that
tier, measured against toolkit v1.22.0. That removes the reason to design the floor against a
heterogeneous, moving target; every member the floor would first apply to already clears it.

E75 asks three questions, and this ADR answers all three with evidence rather than assertion.

**Where does the minimum live?** Three candidates exist on disk today, and only one is both
toolkit-owned and already loaded at the catalogue root.

1. The vendor's own `.claude-plugin/marketplace.json`, at the top level or inside its `metadata`
   object. Measured on 2026-10-30: a scratch copy of the real family marketplace manifest at
   `E:/tmp/askit-own-plugins/agent-plugins/.claude-plugin/marketplace.json`, with an added key at
   each of the two placements, was run through `claude plugin validate` (Claude Code 2.1.314). Both
   placements validated with exit code 0 and the identical warning text, differing only by the
   reported field path:

   ```
   === TOP-LEVEL extra key ===
   ⚠ Found 1 warning:
     ❯ standardFloor: Unknown field 'standardFloor'. Claude Code ignores it at load time.
   ✔ Validation passed with warnings

   === UNDER metadata extra key ===
   ⚠ Found 1 warning:
     ❯ metadata.standardFloor: Unknown field 'standardFloor'. Claude Code ignores it at load time.
   ✔ Validation passed with warnings
   ```

   The vendor's own schema states, in its own words, that the field is ignored at load time. A key
   placed here buys nothing the runtime will ever read, and it buys a standing warning on every
   future `claude plugin validate` run against that file, forever, for as long as the key exists.
   The family marketplace's own CI (`validate-registry.yml` in the `agent-plugins` repository) does
   not invoke `claude plugin validate` at all, so this warning would not break that pipeline today -
   but an operator who runs the vendor's own validator by hand, or a future CI step that adds it,
   would see the warning on every run.
2. The grading-config file, `askit.config.json`. This is read today only when `loadConfig` grades a
   single plugin rooted at that plugin's own directory. Marketplace scope never reads one at the
   catalogue root; adopting this file would be new plumbing with no existing read path, not a
   placement choice.
3. The toolkit's own catalogue-root sidecar, `askit.marketplace.json` (`MEMBER_MAP_FILENAME` in
   `scripts/lib/marketplace/resolve.mjs`). It already exists, is already loaded by
   `evaluateMarketplace()` on every marketplace run, already carries a `members` object the catalogue
   owner writes about their own catalogue, and the vendor's loader never reads it, so it carries no
   validator warning and no risk of a future vendor schema rejecting an unrecognised key outright.

**Whether a member below it reds the collection or warns.** ADR 0039 rejected a uniform
collection-level *tier* demand (option A of its question 2) because it would grade
`writing-style-catalog` against a Gold expectation it never claimed. A Standard-edition floor is a
different axis: it says nothing about tier, and a Bronze member at edition 0.17 satisfies a 0.17
floor exactly as well as a Gold member does. The rejected option and this decision are not the same
shape. What this decision IS the same shape as: ADR 0039's `marketplace-version-agreement` finding,
which already reds the collection when the catalogue's own entry disagrees with a member's own
manifest. A declared floor is the catalogue stating a fact about its members; a member below it is
that stated fact disagreeing with what is on disk, which is exactly the class `version-agreement`
already occupies.

**How the registry page shows it.** `gradeMember()` in `scripts/lib/marketplace/evaluate-marketplace.mjs`
already computes each member's own `standardPin`, but neither `renderCollectionMarkdown()` nor
`renderCollectionHtml()` in `scripts/lib/report-render.mjs`, nor the terminal
`formatMarketplaceReport()`, renders it anywhere today. The member ledger's "Pin" and "Graded sha"
columns are the registry git sha and the checked-out git sha; there is no Standard-edition column at
all. A floor cannot be shown without first showing the thing it is measured against.

**What happens for a member that declares no Standard, and for a minimum the toolkit does not
know.** `parseStandard()` in `scripts/lib/standard-version.mjs` returns `null` for a missing or
unparseable value, and `compareStandard()` deliberately sorts a `null` operand LAST - treated as
the highest, most-current edition - so that an unrecognised pin never causes a spurious downgrade
of an individual check's severity. That rule is correct for its own purpose and dangerous if reused
unmodified for a floor: naively comparing a floor edition against a `null` member pin with
`compareStandard` would conclude the member's pin outranks the floor, and silently pass a member
that declared no edition at all. ADR 0044's own corrected lesson applies here by the identical
mechanism: a comparator written for one direction inverts when reused in the other without
re-deriving which end is safe.

## Decision drivers

- **Consent, not imposition.** D-02 (the pin floor's deprecation window) stays open because a
  *global* floor changes what every badge already in the wild means, without the badge's owner
  having agreed to it. A catalogue owner who writes their own floor into their own catalogue's own
  sidecar is choosing it, and may raise, lower, or remove it at will. No migration window protects
  anyone from a choice they made about their own collection.
- **No existing verdict may move.** ADR 0039's governing invariant. A catalogue that declares no
  floor must grade exactly as it does today; the feature is additive and opt-in, never a default.
- **A finding must name a party who can fix it alone, or say plainly that it cannot.** The
  unilateral-remedy test in `scripts/lib/marketplace/analyze.mjs` exists for exactly this question.
- **The gate stays deterministic and model-free.** A floor comparison is pure version arithmetic
  over values the resolve step already loaded, matching every other marketplace-scope finding.
- **Fail-safe in the direction that cannot be gamed.** An illegible claim - no pin, or a pin the
  toolkit cannot parse - must not read as meeting a floor it never stated agreement with.

## Considered options

### Question 1 - where does the floor live?

- **A. The vendor's `marketplace.json`, top level or under `metadata`.** Measured above: tolerated
  with a standing warning, explicitly ignored by the runtime. Visible to anyone reading the
  catalogue, which is a real benefit, bought at the cost of permanent validator noise for a value
  nothing downstream of the vendor's own tool reads.
- **B. `askit.config.json` at the catalogue root.** Rejected: no scope reads one there today: adopting
  it means building a new read path for a file whose entire existing contract is "per-plugin, rooted
  at that plugin's directory" (ADR 0034). It would also collide with the same filename's established
  meaning one directory level down, inviting exactly the kind of ambiguity ADR 0044's provenance
  model was built to keep out.
- **C (chosen). The toolkit's own `askit.marketplace.json` sidecar.** Already loaded by
  `evaluateMarketplace()`, already a place the catalogue owner writes policy about their own
  catalogue (today, member path mappings), and invisible to the vendor's validator because the
  vendor's loader never reads it.

### Question 2 - red or warn?

- **A. Warn only, never affecting the exit code.** Rejected: E75's own status line says the floor's
  job is "to keep them there" once the migration lands. A regression that never fails a run is not
  kept anywhere; it is merely noted.
- **B. Uniform collection-level expectation, as ADR 0039's rejected tier option.** Rejected on the
  same grounds ADR 0039 already established: inventing a collection-level demand nobody declared.
  This does not apply here because the floor is never invented by the toolkit; it exists only when
  the catalogue owner writes one.
- **C (chosen). Red, conditioned on the catalogue having declared a floor, treated as the catalogue's
  own claim about itself.** Symmetric with `marketplace-version-agreement`, which already reds on
  exactly this shape of disagreement.

### Question 3 - how does the registry page show it?

- **A. Leave the ledger as it is and report the floor only in the findings list.** Rejected: a
  reader cannot tell a member is close to, at, or far below a floor without seeing its own edition
  next to it. Showing the violation without showing the measurement repeats the failure ADR 0038
  named: a verdict without the evidence that produced it.
- **B (chosen). Add the member's own Standard pin to the ledger unconditionally, and show the
  declared floor on the verdict line and in the metadata table, whether or not any member is below
  it.** Matches the house convention ADR 0039 set for the pin, entry-version, and graded-sha
  columns: unconditional, so agreement is never inferred from silence.

## Decision outcome

**1. The floor is declared in `askit.marketplace.json`, as an optional `standardFloor` field
alongside the existing `members` object, both top-level keys of one sidecar.** A catalogue with no
such key behaves exactly as it does today; this is additive, not a new default. The value is a
`MAJOR.MINOR` Standard edition, in the same format `library.json.standard` already uses.

**2. The floor is subject-owned, under ADR 0044's provenance model, extended to marketplace
scope.** The catalogue owner writing their own `askit.marketplace.json` is the subject describing
its own policy, exactly as a plugin's own `askit.config.json` is that plugin's subject-owned
configuration. A grader-supplied floor (a third party auditing someone else's catalogue against
their own bar, via a CLI flag) is not decided here; it would be grader-owned under the same model,
and nothing in this decision forecloses adding it later. The floor is RAISE-ONLY by construction:
it can only make a collection red, never green one, so the published-verdict trust step ADR 0044
built to stop a subject-owned setting from weakening a verdict has nothing to guard here. There is
no lowering direction for a floor to abuse.

**3. A graded member whose own Standard pin resolves below a declared floor is a new,
marketplace-scope, deterministic finding class, `marketplace-standard-floor`, at `error`
severity, carrying `reqId: null` like every other marketplace finding.** It is evaluated only when
the catalogue declares a floor; absent one, nothing is checked and nothing changes. The comparison
is pure numeric `MAJOR.MINOR` arithmetic over the floor and each graded member's own `standardPin`,
exactly the kind of deterministic, string-and-number comparison ADR 0039's question 3 already
restricts this scope to.

**4. The comparison fails safe, in the direction that cannot be gamed.** A member is treated as
BELOW the floor, not as exempt from it, when its own Standard pin is any of: absent (no `standard`
key at all), unparseable (`parseStandard` returns `null` for a reason other than the baseline
sentinel), or the `0.x` baseline sentinel itself. This is a deliberate departure from how
`compareStandard` treats a `null` operand for the EXISTING per-check downgrade (there, `null` sorts
last and causes no downgrade, because the safe default for an individual check is full-strength
grading). For a FLOOR the safe default is the opposite: an illegible or absent claim cannot be read
as meeting a bar the member never stated agreement with. E75's own motivating measurement already
treats "declares none" as belonging in the same failure list as a stale pin, which is independent
support for this reading. A member pinned at a real, parseable, numerically lower edition than the
floor is also below it, by ordinary numeric comparison. A member pinned AHEAD of the floor, including
ahead of the edition the toolkit itself ships, passes, matching the existing "ahead" pin case ADR
0063 already documents and carrying the same `standardEditionNotice` text when the pin exceeds
`shippedStandardEdition()`.

**5. A malformed `standardFloor` value in the catalogue's own sidecar is reported as a `warn`-level
operator-shaped finding on `askit.marketplace.json`, and the floor is inert for that run.** This
matches the sidecar's own established house convention: every other malformed field in
`askit.marketplace.json` and its sibling `askit.config.json` (an unreadable member-map entry, an
unknown profile, an unknown rule id) already falls back to "ignored, with a warning" rather than to
an error. A malformed optional field in a toolkit-owned sidecar is not the same class of defect as
`U17`'s catalogue-manifest-shape, which is a parse failure of the VENDOR-required `plugins` array
that breaks every scope reading the manifest at all; this is one optional field in a file whose own
established pattern already answers the question.

**6. This answers E75's own claim: a catalogue-owned floor needs neither D-01 nor D-02.** D-02 (the
pin floor's deprecation window) exists to protect a badge owner who did not consent to a floor
imposed on every plugin everywhere; a catalogue floor is chosen by the one party it binds, is
reversible by that same party at will, and touches no plugin's own verdict when that plugin is
graded alone. There is nothing to protect anyone from. D-01 (a health number beside the tier) is
about scoring a continuous measurement; this decision is pass/fail against a claim the catalogue
itself made, carrying no score, and sits entirely beside the currency category ADR 0063 already
ships, which keeps reporting how far behind a pin is and enforcing nothing. The two mechanisms
coexist: currency reports age at plugin scope with no gate; the floor gates at marketplace scope,
only when a catalogue opts in.

**7. The ninth marketplace finding class fails the unilateral-remedy test's spirit, but for a
different reason than the existing eight, and stays off the spine for that reason, not the usual
one.** Applied literally, a member CAN resolve "below the catalogue's floor" alone, by re-pinning its
own `library.json.standard` - unlike the eight existing classes, where the unilateral-remedy test
cites a reason the member genuinely cannot act alone. What keeps this finding off the numbered
spine is a different fact: there is no floor to be below outside a catalogue that chose to declare
one. A spine requirement binds every plugin graded on its own; this binds a member only inside the
one catalogue that opted in, which is a scope the spine does not have a shape for. The finding's
`file` is `askit.marketplace.json`, the catalogue's own sidecar, which is the same evidentiary
pattern the other eight already use.

**8. The registry page gains three things, at the three sites that already render the collection
report.** `deriveCollectionModel()` in `scripts/lib/report-render.mjs` projects each member's own
`standardPin` and the catalogue's declared `standardFloor`, both unconditionally. The member ledger
in `renderCollectionMarkdown()` and `renderCollectionHtml()` gains a Standard-edition column next to
"Declares" and "Earns," showing each member's own pin, never only on violation. The verdict
paragraph and the report-metadata table state the declared floor whether or not any member is below
it, matching the same "shown for every member, including the ones where they agree" convention the
pin, entry-version, and graded-sha columns already follow. The terminal renderer,
`formatMarketplaceReport()` in `scripts/lib/marketplace/evaluate-marketplace.mjs`, gains the same
column in its per-member line. A catalogue with no declared floor shows the same report it shows
today, with the new column present and simply unused by the verdict.

### Consequences

- **Positive.** A catalogue owner gets a mechanism for the goal E75 was filed to serve - common
  standards across a marketplace's members - without the toolkit inventing an expectation on
  anyone's behalf, and without touching D-01 or D-02.
- **Positive.** The governing invariant survives intact: a member's OWN verdict, graded alone, never
  moves because of anything in this decision. Only the collection verdict, and only for a catalogue
  that opted in, can be affected.
- **Negative.** The member ledger grows a column every collection report will now carry, whether or
  not the catalogue in question ever declares a floor. This is the same cost ADR 0039 already paid
  for the pin, entry-version, and graded-sha columns, for the same reason: a column shown only on
  violation teaches a reader to assume compliance from its absence.
- **Negative.** A catalogue owner who wants a floor but mistypes it in `askit.marketplace.json`
  gets a warning, not a build failure, so a typo could sit unnoticed for a release. This is the
  accepted cost of matching the sidecar's own established severity rather than inventing a stricter
  one for this one field alone.
- **Neutral.** Nothing here changes `STANDARD.md`, bumps the Standard edition, or adds a spine
  check. The spine stays at 35 checks and the shipped Standard stays at 0.17.
- **Deferred, not decided.** A grader-owned floor, supplied by a CLI flag for a third party auditing
  a catalogue it does not own, is compatible with this decision's provenance model but is not built
  here.

## What was considered and refused

**Declaring the floor inside `.claude-plugin/marketplace.json`.** Refused on the measurement in
Context: the vendor's own validator warns on the unrecognised key and states in its own text that
the runtime ignores it, on every future run, for a value no part of the runtime ever reads.

**Treating an undeclared member's absent pin as passing a floor by default.** Refused.
`compareStandard`'s existing null-sorts-last rule exists to protect an individual check's severity
from a spurious downgrade, a different question with the opposite safe answer. Reusing it unmodified
for a floor would let the least legible claim - no claim at all - pass a bar the member never agreed
to, and E75's own motivating list already treats "declares none" the same way it treats a stale pin.

**A uniform collection-level tier demand, reapplying ADR 0039's rejected option A.** Refused, and
distinguished rather than merely cited: tier and Standard edition are different axes, and a floor on
one invents nothing about the other.

**Failing a malformed `standardFloor` value as an error, matching `U17`'s severity.** Considered,
because `U17`'s own justification is "the author declared it and no tool reads it." Refused because
`U17` guards the vendor-required `plugins` array, whose failure blinds every scope reading the
manifest at all; this guards one optional toolkit field whose own sidecar already answers every
other malformed-field case with a warning, and matching that established pattern is the more
consistent choice than inventing a stricter one for a single key.

**Graduating the new finding class to the numbered spine.** Refused. The unilateral-remedy test's
literal mechanics would allow it, since a member can re-pin its own `library.json.standard` alone,
but the spine binds every plugin graded on its own, and there is no floor to be below outside a
catalogue that opted in. A requirement with no referent outside one scope is not a spine
requirement.

## Implementation sites

None of these is changed by this ADR; it records the design, and the implementing change carries
the code. Names that do not exist in source yet are written without backticks, per the convention
ADR 0039 established, so this section is a grep anchor rather than a claim about unwritten code.

- `scripts/lib/marketplace/resolve.mjs` - `loadMemberMap()` and `MEMBER_MAP_FILENAME` already read
  `askit.marketplace.json`'s `members` object; the implementing change extends the same loader to
  read a sibling top-level standardFloor field from the same file, with a malformed value reported
  as a warning and the floor left absent, matching the loader's existing fallback for a malformed
  `members` value.
- `scripts/lib/marketplace/analyze.mjs` - `MARKETPLACE_CHECKS` gains a ninth entry, the planned
  marketplace-standard-floor class, alongside the existing eight. A new function, planned as
  evaluateStandardFloor, compares each graded member's own standardPin against the catalogue's
  declared floor using `parseStandard` from `scripts/lib/standard-version.mjs` directly, not through
  `compareStandard`'s null-sorts-last rule, for the reason given in the Decision outcome.
- `scripts/lib/marketplace/evaluate-marketplace.mjs` - `gradeMember()` already computes
  `standardPin` per member; `evaluateMarketplace()` gains the floor read from `loadMemberMap()`'s
  extended return shape and threads the new finding class into its existing `findings` array
  alongside `versionAgreement()` and the other seven. `formatMarketplaceReport()` gains the
  Standard-edition column in its per-member terminal line.
- `scripts/lib/report-render.mjs` - `deriveCollectionModel()` gains the catalogue's declared floor
  and projects each member's existing `standardPin` into the view-model unconditionally;
  `renderCollectionMarkdown()` and `renderCollectionHtml()` each gain the Standard-edition ledger
  column and the floor line in the verdict paragraph and metadata table.
- `scripts/lib/standard-version.mjs` - `parseStandard()` and `compareStandard()` are read, not
  modified; the implementing change's floor comparator is new code built on `parseStandard()`
  directly, because `compareStandard()`'s `null` handling is correct for its own existing caller and
  wrong for this one, as the Decision outcome explains.
- `docs/internal/backlog/enhancements.md` - E75's status line records that this ADR exists and at
  what status, per the house convention every other ADR-gated entry follows.
- No change to `STANDARD.md`, `scripts/lib/registry.mjs`, or any numbered check: this finding class
  stays scope-local, exactly as ADR 0039's existing eight do, and the spine does not move.

Grep anchor: `MARKETPLACE_CHECKS` in `scripts/lib/marketplace/analyze.mjs`, and `MEMBER_MAP_FILENAME`
in `scripts/lib/marketplace/resolve.mjs`.
