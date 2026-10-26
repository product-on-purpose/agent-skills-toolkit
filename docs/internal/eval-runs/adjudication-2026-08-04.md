# Adjudication draft: batch 2026-08-04 (the E13 model triple) on key 1.1.0

> **Status: DRAFT - PENDING MAINTAINER SIGNATURE.**
> An agent drafted every resolution below. No human has adjudicated any of them yet.
> [ADR 0065 (a multi-entry finding earns credit only where its own correct clause verifies)](../decisions/0065-a-multi-entry-finding-earns-credit-only-where-its-own-correct-clause-verifies.md)
> makes human adjudication mandatory on every multi-entry engagement. This document is the input to
> that step, not its result. Until the signature block at the end is filled in, no figure derived
> from it may be called final.

## What this document is

This is the adjudication worklist for the three frozen advisories of E13 (the defect-rich model
triple), scored by the rule (a') scorer in `scripts/lib/advisory-score.mjs` against scoring key
1.1.0. The advisories live at
[`tests/fixtures/anti/seeded-defects/recorded-runs/2026-08-04/`](../../../tests/fixtures/anti/seeded-defects/recorded-runs/2026-08-04/).
The key lives at
[`tests/fixtures/seeded-defect-keys/privacy-notice-toolkit.key.1.1.0.json`](../../../tests/fixtures/seeded-defect-keys/privacy-notice-toolkit.key.1.1.0.json).

Every item that the scorer puts on the worklist appears here, with a drafted resolution and a
one-paragraph reason. Each reason was drafted from three sources: the finding's own text, the
engaged key entries' `locate`, `correct` and `confabulation` clauses, and the planted defect in the
fixture file itself.

This document deliberately carries no precision or recall figure. The automatic figures, and the
figures these drafts would produce if signed as written, are recorded in
[`eval-runs.md`](eval-runs.md) under batch 2026-08-04, marked PROVISIONAL.

## How the scorer consumes it

Each advisory section below holds one fenced `json` block. The block is exactly the
`opts.adjudication` document that `scoreAdvisory(advisory, key, opts)` accepts for E17 (the scoring
harness cannot consume an adjudication). The scorer reads only `resolutions`. The `advisory`, `file`
and `keyVersion` fields label the block for a human and for the test that loads it.

Each resolution is `{index, entryId, decision}`:

- `index` is the finding's position in the advisory's findings array, the same index the worklist
  reports.
- `entryId` must be an entry that this finding actually engages. The scorer refuses any other id.
- `decision` is `"credit"` or `"no-credit"`.

Every engaged entry of every multi-entry engagement has an explicit resolution here. That includes
entries the scorer already credited automatically, so a signature confirms each automatic credit
rather than leaving it implicit.

**Single-entry items are outside this increment.** The scorer refuses a resolution whose index is
not a multi-entry engagement. Three worklist items are single-entry `review-required` cases: Sonnet
index 9, Opus index 1 and Opus index 19. Their drafted resolutions sit in a table under each
advisory, outside the JSON block. A signature on them records the human ruling, but the scorer
cannot apply it yet, so those findings stay on the worklist after the JSON is applied.

The E17 path is reachable through the API only. The `advisory-score.mjs` command line has no flag
that loads an adjudication document.

## Haiku 4.5 / high

Worklist: one item, index 2.

```json
{
  "advisory": "haiku",
  "file": "tests/fixtures/anti/seeded-defects/recorded-runs/2026-08-04/haiku-high-advisory.json",
  "keyVersion": "1.1.0",
  "resolutions": [
    { "index": 2, "entryId": "SD-07", "decision": "credit" },
    { "index": 2, "entryId": "SD-08", "decision": "no-credit" }
  ]
}
```

**Index 2 engages `SD-07` (class `command-vs-skill-contradiction`) and `SD-08` (class
`capability-overclaim`). Draft: credit `SD-07`, no credit for `SD-08`.** The finding says the
`/review-privacy-notice` command's seven-item checklist is "completely different" from the skill's
seven-item checklist. It names cookie banner and reading level on the command side, and purposes,
third parties and appeal path on the skill side. The fixture confirms this: only items 1 and 5 are
shared between `commands/review-privacy-notice.md` and `skills/privacy-notice-review/SKILL.md`. That
is the `SD-07` defect, and the scorer credited it automatically through the `mismatch` token in the
`correct` clause. The finding engages `SD-08` only because it lists "DPO contact" as one of the
command's checklist items. `SD-08` is the README's claim that the plugin emails a signed PDF
certificate to the DPO, and the finding says nothing about that claim.

## Sonnet 5 / high

Worklist: three items, indices 0, 6 and 9. Index 9 is single-entry.

```json
{
  "advisory": "sonnet",
  "file": "tests/fixtures/anti/seeded-defects/recorded-runs/2026-08-04/sonnet-high-advisory.json",
  "keyVersion": "1.1.0",
  "resolutions": [
    { "index": 0, "entryId": "SD-07", "decision": "credit" },
    { "index": 0, "entryId": "SD-08", "decision": "no-credit" },
    { "index": 6, "entryId": "SD-05", "decision": "no-credit" },
    { "index": 6, "entryId": "SD-06", "decision": "credit" }
  ]
}
```

**Index 0 engages `SD-07` and `SD-08`. Draft: credit `SD-07`, no credit for `SD-08`.** This finding
is the fullest statement of `SD-07` in the batch. It lists both seven-point checklists item by item,
quotes the skill calling its list "the canonical list", and states that only items 1 and 5 match.
That is exactly the planted defect. The scorer credited nothing because the `SD-07` `correct` clause
missed the wording. The pattern `different (?:list|items|checklist)` does not match "a different
seven-point checklist", and the pattern `only (?:two|2)...` does not match "Only item 1 ... and item
5". This is a key-pattern gap, not a model error. `SD-08` is engaged only because "named DPO"
appears as a command checklist item; the finding makes no claim about the PDF certificate.

**Index 6 engages `SD-05` (class `fake-statute`) and `SD-06` (class `inverted-rule`, `mode:
semantic`). Draft: no credit for `SD-05`, credit `SD-06`.** The finding is about the "Direction of
consent" section of `references/us-state-laws.md`. It states that Colorado and Virginia give an
opt-out right for targeted advertising, and that opt-in attaches to sensitive data. That is the
correct US direction under `SD-06`'s `tpCriterion`, and the finding states neither direction wrongly.
`SD-05` was credited automatically because the text names the Colorado Privacy Act in passing.
The finding never reports that the statute table cites a non-existent "Colorado Consumer Data
Protection Act". Index 5 of the same advisory reports that defect on its own.

| Index | Engages | Drafted resolution | Applies through E17 today? |
| --- | --- | --- | --- |
| 9 | `SD-06` only (`semantic`) | credit `SD-06` | No: single-entry |

**Index 9 reason.** The finding says the GDPR sentence in "Direction of consent" is wrong, because
unsolicited marketing email in the EU falls under ePrivacy-derived opt-in consent. That states the
GDPR direction correctly under `SD-06`'s `tpCriterion`. It does not state either direction wrongly,
although it summarises the document's point loosely as a "US opt-out model". It hedges ("arguably
wrong", lower confidence), and the hedge does not change the ruling. If index 6 is signed as
drafted, index 9 restates an entry that is already satisfied and scores as a duplicate.

## Opus 5 / high

Worklist: seven items, indices 0, 1, 3, 4, 7, 8 and 19. Indices 1 and 19 are single-entry.

```json
{
  "advisory": "opus",
  "file": "tests/fixtures/anti/seeded-defects/recorded-runs/2026-08-04/opus-high-advisory.json",
  "keyVersion": "1.1.0",
  "resolutions": [
    { "index": 0, "entryId": "SD-03", "decision": "no-credit" },
    { "index": 0, "entryId": "SD-07", "decision": "credit" },
    { "index": 0, "entryId": "SD-08", "decision": "no-credit" },
    { "index": 3, "entryId": "SD-02", "decision": "no-credit" },
    { "index": 3, "entryId": "SD-08", "decision": "credit" },
    { "index": 4, "entryId": "SD-01", "decision": "credit" },
    { "index": 4, "entryId": "SD-12", "decision": "no-credit" },
    { "index": 7, "entryId": "SD-05", "decision": "no-credit" },
    { "index": 7, "entryId": "SD-06", "decision": "credit" },
    { "index": 8, "entryId": "SD-01", "decision": "no-credit" },
    { "index": 8, "entryId": "SD-05", "decision": "no-credit" }
  ]
}
```

**Index 0 engages `SD-03` (class `stale-doc-claim`), `SD-07` and `SD-08`. Draft: credit `SD-07`
only.** The finding is about the command restating the skill's canonical checklist with a different
list. It names the five substituted items and the agent that checks the checklist order. That is
`SD-07`. `SD-03` is the output contract's stale `--write` section, which the skill removed at 0.3.0.
The finding mentions the output contract only as one of three files that disagree with the
command's table. `SD-03` locates on "output contract" and verifies on "contradict", so its
automatic credit is a coincidence of vocabulary. `SD-08` engages through "named DPO", which is a
checklist item and not the PDF overclaim. **Consequence:** withdrawing `SD-03` here leaves `SD-03`
satisfied by no consumable resolution. The finding that really reports it is index 1, which is
single-entry and drafted below.

**Index 3 engages `SD-02` (class `manifest-vs-disk-drift`) and `SD-08`. Draft: credit `SD-08`, no
credit for `SD-02`.** The finding quotes the README's "signed PDF compliance certificate" sentence.
It shows from the file inventory that no script, hook or MCP server exists to generate or send
anything. That is `SD-08` as planted in `README.md`. `SD-02` engages only because the inventory
sentence contains "plugin.json" followed within 80 characters by "one agent". The finding says
nothing about the manifest's dangling `./agents/notice-reviewer.md` path.

**Index 4 engages `SD-01` (class `trigger-surface-collision`) and `SD-12` (class
`wrong-procedure`). Draft: credit `SD-01`, no credit for `SD-12`.** The finding states that
`dsar-intake-triage` and `data-request-router` are near-duplicates that both fire on the same input.
It shows that their owner tables agree row for row and that neither names the other. That is
`SD-01` exactly. `SD-12` engages through the phrase "State exceptions". The finding calls those
exceptions "two side tasks", which comes close to `SD-12`'s point that the exceptions are additive.
It never says that this contradicts the router's stated reason for routing by state. Index 15
reports `SD-12` on its own.

**Index 7 engages `SD-05` and `SD-06`. Draft: no credit for `SD-05`, credit `SD-06`.** This is the
case ADR 0065 names as a misattribution under rule (a'). The finding reports both inversions in
"Direction of consent". It says EU marketing email needs prior consent under ePrivacy Article 13,
and that Colorado and Virginia give an opt-out right for targeted advertising. That satisfies
`SD-06`'s `tpCriterion` on both directions, and it states neither direction wrongly. `SD-05` was
credited automatically only because the finding names the Colorado Privacy Act while explaining
the targeted-advertising rule. It does not report the fabricated statute name. **Consequence:** with
this resolution and the index 8 resolution below, index 10 becomes the finding that satisfies
`SD-05`. Index 10 is the finding that actually reports the fake "Colorado Consumer Data Protection
Act", and it currently scores as a duplicate.

**Index 8 engages `SD-01` and `SD-05`. Draft: no credit for either.** The finding's subject is when
the statutory clock starts. It reports that `dsar-intake-triage` starts the 45-day clock at
verification, where the statutes run it from receipt. It describes neither engaged entry. `SD-01`
engages because the text names both skills and calls a shared phrase a library-wide "ambiguity".
`SD-05` verifies because the text names the Colorado Privacy Act correctly. **Flag for adjudication
steps 3 and 4.** No key entry covers the clock-start claim, and no `outOfScope` rule matches it. The
fixture confirms the text: step 1 of `skills/dsar-intake-triage/SKILL.md` says the clock has not
started for an unverified request, and its last section records the deadline against the
verification date. If the claim is a real unplanted defect, the key's own adjudication rules require
a ruling: promote it to a new entry under a key bump to 1.2.0, or record it out of scope with a
reason. The drafter's recommendation is to promote it. The legal claim is that CCPA, VCDPA and the
Colorado Privacy Act all run the response period from receipt of the request. The drafter holds
that at medium confidence and did not check it against a primary source.

| Index | Engages | Drafted resolution | Applies through E17 today? |
| --- | --- | --- | --- |
| 1 | `SD-03` only (`correct` and `confabulation` both match) | credit `SD-03` | No: single-entry |
| 19 | `SD-06` only (`semantic`) | no credit for `SD-06` | No: single-entry |

**Index 1 reason.** The finding reports that section 4 of `references/output-contract.md` documents
a `--write` flag that the skill's own changelog removed at 0.3.0. It quotes the changelog line and
calls the reference stale. That is `SD-03` as planted. The confabulation clause matched on
"overwrites the source", but the finding uses that phrase to describe what the stale reference
documents. It does not assert that the skill overwrites anything today, and the confabulation
clause exists to catch that assertion. The finding also says a model following the contract "can
perform" a destructive overwrite. The drafter reads that as a risk statement about a model with file
tools, not a claim that the plugin implements the flag. Draft: a true positive for `SD-03`.

**Index 19 reason.** The finding says the canonical checklist has no item for the sale and sharing
disclosure or the opt-out route. It engages `SD-06` only because it mentions targeted advertising
and an opt-out right. It is not about the "Direction of consent" section, and it states no direction
of consent at all, so it does not meet `SD-06`'s `tpCriterion`. It also does not meet the
`confabulationCriterion`. The underlying claim is a coverage gap in the checklist rather than a
planted defect. The drafter recommends recording it out of scope under adjudication step 4. It
judges how complete a checklist must be, which is close to what `OS-04` excludes for legal
summaries. The maintainer may instead treat it as a promotion candidate.

## Maintainer signature

Fill this in only after reviewing each drafted resolution above. Editing any resolution before
signing is expected; the JSON blocks are the record the scorer reads.

- Resolutions accepted as drafted, or amended (list the amended indices): ______
- Ruling on Opus index 8 (promote to key 1.2.0, or record out of scope): ______
- Ruling on Opus index 19 (out of scope, or promotion candidate): ______
- Signed by the maintainer: ______
- Date: ______
