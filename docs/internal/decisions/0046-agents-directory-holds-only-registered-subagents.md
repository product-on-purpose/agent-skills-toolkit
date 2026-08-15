# 0046 - The agents/ directory holds only registered subagents, and S3 stops claiming a shipped file is absent

## TL;DR
- **Decision:** E42 asks whether an unregistered runtime-loaded agent file is a REGISTRATION defect or a SHIPPING defect. Measurement says the question is malformed, because the two shapes it covers do not have the same answer. The decision is therefore in three parts. (1) A new Universal check **`U15` (`agents-dir-registerable`)**: every `.md` under `agents/` MUST be a registered subagent. Introduced at Standard **0.14**, so ADR 0044's ceiling holds it at `warn` for anyone pinned below. (2) **`S3` (`components-index`) stops asserting that a declared, on-disk agent file is not on disk.** That is a bug, not a tightening: it can only ever remove a finding. (3) **`S2`, `S4` and `S8` are left reading `ctx.subagents` and are NOT widened**, because once `U15` gates, the registration list and the runtime list are the same list.
- **Why:** widening the four checks to `ctx.agentDocs` was prototyped and measured, and its own remediation text tells the author to declare `agents/README.md` in `components.subagents` and to rename it `<prefix>-README.md`. Following either instruction produces the phantom subagent that the 2026-08-06 `G8` exemption exists to stop causing. A check whose remediation creates the defect is worse than the silence it replaces.
- **The measurement also found a second, opposite defect nobody had filed.** An author who honestly declares `agents/_shadow.md` is today told `library.json components.subagents declares "_shadow" but it is not on disk under agents/`. The file is on disk. The gate currently makes concealment the only way to pass.
- **Blast radius: zero on the family, measured before and after.** No member ships an unregistered `agents/*.md`.
- **A third finding surfaced while measuring, and it is a live regression in ADR 0045's own guarantee.** The marketplace scope's `A6` reading still iterates `m.subagents`, so **the same plugin, byte for byte, gets different answers depending on how it is graded**: alone it takes a `U14` error, as a catalogue member it takes nothing. ADR 0045 shared the field list precisely so the two scopes could not disagree; the v1.13.0 fix moved `U14` to `ctx.agentDocs` and left the marketplace reading behind. **The ANALYSIS lives here, because it is the same defect as E42 and this is where that reasoning belongs. The FIX ships separately and ahead of this ADR** - see "Why the 0045 fix is not in this change" below.
- **Status:** Accepted (ratified 2026-08-14).

- **Date:** 2026-08-14
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- **ADR 0045 (restricted fields on plugin-shipped agents)** - introduced `U14` and, in the round-1 fix that followed, moved it from `ctx.subagents` to `ctx.agentDocs`. That was the first check to ask the runtime's question. This ADR decides what to do about the four that still ask the registration question.
- **ADR 0044 (one post-resolution Standard ceiling and config provenance)** - supplies the entire migration mechanism for `U15`. Point 3 of its outcome states that a NEW check needs no migration metadata, because the ceiling now runs after configuration resolves; `since: "0.14"` alone is the window. This was confirmed against a live prototype rather than assumed: at pin 0.13 the prototype reported `[downgraded: introduced in Standard 0.14, after pinned 0.13]`, and at pin 0.14 the same finding gated.
- **ADR 0027 (Standard versioning and compatibility policy)** - a new tier requirement is a Standard minor bump. `U15` takes the spine from 31 to 32 and the Standard from 0.13 to 0.14.
- **ADR 0024 (documentation depth and discoverability)** - `G8` (`folder-readme`) is its D1.1 requirement, and the `agents/` exemption that this ADR completes is an amendment to how that requirement was applied.
- **ADR 0020 (skill packaging and naming)** - the reason `S2` prefixes subagents at all: they enter a cross-agent pool once Gemini emission lands, so they are prefixed now to avoid a later rename.
- **E42** (`backlog/enhancements.md`), filed 2026-08-14 from round 8 of the v1.13.0 adversarial review, and shipped unfixed by decision.

## Context and problem statement

Claude Code discovers subagents by scanning `agents/` for `*.md` and it registers **every** file it finds. `folder-readme.mjs` carries the empirical probe: a directory holding `real-agent.md`, `README.md`, `_README.md` and `README.txt` registered three subagents, `real-agent`, `README` and `_README`. The underscore prefix protects nothing. Only the non-`.md` extension was skipped.

The toolkit's loader builds two lists over that directory, and the difference between them is the whole defect:

- `ctx.subagents`, from `listAgentFiles()`, excludes `README.md` and `_`-prefixed files. It answers **what does this plugin REGISTER**.
- `ctx.agentDocs`, from `listRuntimeAgentDocs()`, excludes nothing. It answers **what will the runtime LOAD**.

`U14` reads the second. `S2` (prefix), `S3` (components-index), `S4` (chain-contract) and `S8` (components-mirror) read the first. The loader's own comment already states the rule those four violate: *"A check about what a plugin SHIPS must read this list, not `subagents`."*

**The bypass, reproduced.** A fixture plugin declaring Convergent, shipping one properly registered subagent plus `agents/_shadow.md` and `agents/README.md`, grades **Convergent, 0 errors** at Standard 0.13. The shadow file carries an unprefixed name, no manifest entry, `version: 9.9.9` and `status: deprecated`, and no check reads it. Adding `permissionMode` to that same file makes `U14` fire and name it `_shadow`, which proves the file is in the context and the four checks simply do not look at it.

**The second defect, found by measuring rather than by reading.** The same fixture, with `_shadow` honestly declared in `components.subagents`, produces:

> `[error/house] components-index (S3): library.json components.subagents declares "_shadow" but it is not on disk under agents/.`

The file is on disk. This is a published gate finding making a false statement about the filesystem, and it is worse than the bypass: the bypass is silence, this is an assertion. Taken together the two halves mean the gate today **rewards concealing the file and punishes declaring it.** Nobody had filed this; it appeared the moment a fixture was built for the other half.

## Decision drivers

- Remediation must be followable **and safe to follow**. E35 was about remediation a reader cannot follow; remediation a reader *can* follow into the defect is a worse instance of the same class.
- The `agents/` runtime behaviour is a **vendor fact**, not a house convention, so anything built on it is `vendor-cited` and a consumer is entitled to know it is portable (ADR 0028).
- A tightening needs an ADR and a pin-gated migration window (ADR 0044). A correction to a false statement is neither, and treating it as one would leave the false statement in place for a whole minor.
- Nothing may move red-ward for a plugin carrying a valid pin below the introducing version.
- The four checks are load-bearing and well-tested. A design that leaves them untouched is cheaper to review than one that edits five call sites across four modules.

## Considered options

**Option A - the registration reading: point `S2`, `S3`, `S4` and `S8` at `ctx.agentDocs`.** This is the option E42 was filed proposing, and it is the one the phrase "REGISTRATION defect" names. **Prototyped, applied to all five call sites, and measured.** It does real work: the fixture moves from 0 errors to 4, `S3`'s false claim disappears, and `S8` correctly catches the `status`/`tier` drift on `_shadow` that nothing sees today.

**Rejected on its own output.** Against `agents/README.md` it emits:

> `S2: subagent "README" must start with the plugin prefix "fx-"`
> `S3: agents/README.md exists on disk but is not declared in library.json components.subagents.`

An author who follows the first renames the file to `fx-README.md` and still ships a phantom, now prefixed. An author who follows the second declares `README` as a subagent, which is **exactly** the phantom subagent with no name and no description that the 2026-08-06 `G8` exemption was written to stop plugins creating. Both this repository and `critique-skills` shipped one historically. Option A would instruct every plugin holding a folder guide under `agents/` to convert it into the defect.

There is also a structural objection independent of the message text. `S3` and `S8` are **bidirectional mirrors** between a manifest and a disk. Widening the disk side of a mirror does not add a rule; it redefines what the manifest is a mirror OF. Under Option A a plugin satisfies `S3` by declaring `README`, so the widening makes the phantom **legal** in the same stroke that it makes concealment illegal.

**Option B - widen only `S2` and `S4`, leaving the two mirrors alone.** Rejected: it fixes neither half. The bypass survives through `S3` and `S8`, and `S3`'s false claim is untouched. It also splits one rule across two mechanisms, which is the shape ADR 0044 spent a release consolidating away from.

**Option C - do nothing, and document `agents/_x.md` as unsupported.** Rejected: the vendor loads the file. Documenting that we do not is a statement about our tooling, not about what the consumer's plugin does when installed, and the entire point of a gate is to be about the second thing.

**Option D (chosen) - one new check that makes the two lists provably equal, plus a bug fix.** If every `.md` under `agents/` MUST be a registered subagent, then for any conforming plugin `ctx.agentDocs` and `ctx.subagents` are **the same list**, and the four checks that read the registration list are complete without being modified. The bypass closes at its source rather than being chased through four consumers, and the remediation names both honest resolutions instead of forcing one.

## Decision outcome

**1. A new Universal check, `U15` (`agents-dir-registerable`).** Every `.md` file under the plugin's `agents/` directory MUST be a registered subagent. Formally: `ctx.agentDocs` and `ctx.subagents` must contain the same names.

**2. Its severity is `error`, its `since` is `0.14`, and it carries no `migration` metadata.** Per ADR 0044 point 3 this is sufficient and correct: `since` governs an INTRODUCTION, the ceiling runs after configuration resolves, and a consumer's own `rules.U15 = "error"` therefore cannot beat it at an earlier pin. Verified on a prototype at both pins rather than reasoned about.

**3. Its provenance is `vendor-cited`, not `house`.** The requirement rests on Claude Code's discovery behaviour, evidenced by the probe recorded in `folder-readme.mjs`. Under ADR 0044's trust step a subject-owned setting cannot weaken it in `published-verdict` mode, which is the correct treatment for a fact about the runtime rather than a convention of ours.

**4. The remediation is shape-specific, and neither branch instructs the author to register a folder guide.** For `README.md`: move the documentation out of `agents/` - to `AGENTS.md` or the root README component table, which is where the 2026-08-06 note already sends it. For an underscore-prefixed file: either register it (rename to a prefixed subagent and declare it in `components.subagents`) or move it out of `agents/`. The message states the runtime fact in both branches, because an author who does not know the file is loaded cannot evaluate either option.

**5. `S3` stops claiming a declared, on-disk agent file is absent.** `onDiskSubagentNames` is built from `ctx.agentDocs`, so the "declared but not on disk" direction tests presence on the actual filesystem. The **opposite** direction of the same check - "on disk but not declared" - keeps reading `ctx.subagents`, because that direction is the tightening, and `U15` owns it.

**6. That `S3` change ships WITHOUT a migration window, and this is the deliberate part.** ADR 0044 requires a pin-gated window for a tightening. This is not a tightening. The edit changes only the set a membership test is taken against in the direction that can **remove** a finding, so no plugin can move red-ward through it, at any pin. Holding a false statement about a consumer's filesystem behind a migration window for a whole minor would be applying a rule against the interest it exists to protect.

**7. `S2`, `S4` and `S8` are not modified.** At Standard 0.14 a plugin shipping an unregistered `agents/*.md` fails `U15` at Universal and can therefore earn no tier at all, so the case those widenings were meant to cover cannot coexist with a passing grade. Leaving them alone also preserves the mirror semantics that Option A broke.

**8. The marketplace scope's `A6` reading is repointed at the runtime list.** `evaluate-marketplace.mjs` builds each member with `subagents: ctx.subagents`; it becomes `ctx.agentDocs`. Measured on the fixture: `agentRestrictedFields` over `ctx.subagents` returns **0** findings while `U14` on the identical directory returns **1**, and over `ctx.agentDocs` it returns **1**. ADR 0045 states the invariant this violates in its own words - *"a plugin's verdict must not depend on whether it was graded on its own or as a catalogue member"* - and shared the field list to guarantee it. Sharing the field list was not enough, because the two scopes also disagree about **which agents** the list is applied to. It takes `U14`'s own `since: "0.13"` semantics, so a member pinned below 0.13 stays capped exactly as it does when graded alone. That symmetry is the point.

### Why the 0045 fix is not in this change

**It ships as its own PR, ahead of this ADR and independent of ratification.** Four reasons, decided 2026-08-14:

1. **It is a live regression against a shipped guarantee.** ADR 0045's sentence is false in `agent-skills-toolkit@1.13.0`, which is the `latest` tag consumers install today. Every other decision in this pack is about what the Standard should become; this one is a promise already made and not kept.
2. **It needs no ratification.** The rest of this pack is decisions of record awaiting sign-off. This is a bug fix restoring a decision already ratified in v1.13.0.
3. **Coupling it here would give it a ratification gate it does not need.** If `U15` is debated, renumbered or deferred, the regression would ride along unfixed for another release.
4. **Measured at zero family blast radius** in isolation: repointing the member build moved no verdict, tier, count, census or debt on any of the six members.

**ADR 0045 is NOT amended.** The ADR 0044 precedent for in-place amendment was ADR 0041, whose *mechanism could not have worked* - a flaw in the decision itself. Here 0045's decision was correct and the implementation diverged from it a release later. Amending it would attribute a code defect to a sound decision and make a ratified record mutable for something that is not a change of mind. It gains a one-line pointer noting the parity test now exists; its decision is untouched.

**9. The bypass persists at `warn` during the migration window, and that is accepted.** A plugin pinned at 0.13 that ships `agents/_shadow.md` still passes `S2`, `S4` and `S8` silently until it adopts 0.14. This is what a migration window is, and the alternative - gating a new requirement at a pin the consumer never adopted - is the ADR 0027 violation this project has twice built machinery to prevent.

## Consequences

- **The spine moves 31 to 32 and the Standard moves 0.13 to 0.14.** `U15` is the next free Universal number (`U10` is retired per ADR 0028). `tests/unit/registry-sync.test.mjs` asserts an exact `CHECKS.length` and full `provenanceByReq()` coverage, so both move by construction and there is no quiet way to land the check.
- **Blast radius on the family is ZERO, measured.** All six members were graded before and after each prototype with a per-member, per-reqId, per-severity census plus a gate census reproducing `errorCount` exactly. No member ships an unregistered `agents/*.md`: `pm-skills` 6 of 6 registered, `agent-skills-toolkit` 7 of 7, `thinking-framework-skills` 1 of 1, `critique-skills` 1 of 1, and `writing-style-catalog` and `product-lifecycle-templates` have no `agents/` directory. The historical `agents/README.md` files in this repository and in `critique-skills` are gone.
- **The instrument was proved sensitive before its null result was believed.** A deliberate mutation making `S2` fire on every component moved four members' tiers, error counts and per-check censuses in the diff. A null result from an unproved instrument is not a measurement, and this project has had a careful written argument falsified by one command.
- **`agents/` remains outside `G8`'s meaningful-folder allowlist, and now for a stated reason rather than an exemption.** The 2026-08-06 change stopped `G8` CAUSING phantoms; `U15` detects the ones already shipped. The exemption and the check are two halves of one rule and the `folder-readme.mjs` comment should say so.
- **A plugin that wants private agent-adjacent material has one place to put it: not `agents/`.** There is no supported private-file convention inside that directory, because the runtime has no such concept. This is a real constraint on authors and it is the vendor's, not ours.
- **`U15` overlaps `U14` on the same files and that is intended.** `U14` asks whether a loaded agent declares a refused field; `U15` asks whether it should be there at all. A file can fail both, and they are separate findings because they have separate remediations.
- **Two implementation obligations that the prototype surfaced by failing them.** Adding a file under `scripts/checks/` fails `G8` until `scripts/checks/README.md` lists it in its inventory, and fails `G9` until the file carries the four-field `what-it-is` / `what-it-does` / `why` / `used-by` header docblock in its first 30 lines. The prototype tripped both, which is the only reason the family diff was not empty.

## Implementation sites
- `scripts/checks/agents-dir-registerable.mjs` - **new check module**. `meta = { id: "agents-dir-registerable", tier: "universal", reqId: "U15", since: "0.14", provenance: "vendor-cited" }`. Reads `ctx.agentDocs` and `ctx.subagents` and reports the set difference, branching the remediation on `path.basename(file) === "README.md"`.
- `scripts/lib/registry.mjs` - the import and the `CHECKS` array entry, placed beside `agentRestrictedFields` so the two agent-directory checks read together.
- `scripts/checks/components-index.mjs` - `onDiskSubagentNames` is built from `ctx.agentDocs ?? ctx.subagents ?? []`. The `for (const s of (ctx.subagents || []))` loop below it is deliberately unchanged; a comment must say why, or the asymmetry reads as an oversight and gets "fixed" by the next reviewer.
- `scripts/checks/folder-readme.mjs` - the `agents/` exclusion comment gains the second half: the exemption stops `G8` causing phantoms, `U15` detects existing ones.
- `scripts/lib/fs-utils.mjs` - `listRuntimeAgentDocs`'s docblock already states the rule; it gains `U15` beside `U14` as the checks that honour it, and the marketplace member builder as the third caller.
**In a SEPARATE, earlier PR** (the ADR 0045 parity restoration, per the section above):
- `scripts/lib/marketplace/evaluate-marketplace.mjs` - the member's `subagents:` field is built from `ctx.agentDocs`, and the field is **renamed** so the mismatch cannot recur silently. A member property called `subagents` holding the runtime list is exactly the naming that let this survive ADR 0045.
- `scripts/lib/marketplace/analyze.mjs` - `agentRestrictedFields` iterates whichever field the rename lands on; its docblock records that the agent list, not only the field list, is shared with `U14`.
- `tests/unit/marketplace-scope.test.mjs` - the **cross-scope parity test** ADR 0045 should have had: one fixture directory, graded both ways, must produce the same set of restricted-field findings. A shared field list with an unshared subject list passes any test that only compares field lists.
- `docs/internal/decisions/0045-restricted-fields-on-plugin-shipped-agents.md` - a one-line pointer that the parity test now exists. Its decision is not amended; see above for why.
- `STANDARD.md` - a new sec 3 bullet stating the requirement, a version note for 0.14, and the three spine-count statements (top note, sec 2.6 tail, and the tier-inclusion paragraph) moving 31 to 32.
- `tests/unit/agents-dir-registerable.test.mjs` - **new**, covering: `README.md` reported with the move-it remediation; `_`-prefixed file reported with the register-or-move remediation; a fully registered `agents/` reporting nothing; a `.txt` under `agents/` reporting nothing (the runtime skips it, so we must too); held at `warn` at pin 0.13 and gating at pin 0.14.
- `tests/unit/components-index.test.mjs` - a regression test that a DECLARED, on-disk `_`-prefixed agent produces no "not on disk" finding, and that the on-disk-but-undeclared direction is unchanged.
- `tests/unit/registry-sync.test.mjs`, `tests/unit/compatibility-matrix.test.mjs` - the count and the matrix row. The matrix row must name the wrong implementation it kills: widening `S3`'s undeclared direction instead of adding `U15`.
- `scripts/checks/README.md` - inventory entry, or `G8` fails.

Grep anchor: `agents-dir-registerable` in `scripts/checks/`, and `listRuntimeAgentDocs` in `scripts/lib/fs-utils.mjs`.
