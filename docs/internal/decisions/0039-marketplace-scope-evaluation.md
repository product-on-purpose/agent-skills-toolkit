# 0039 - Marketplace-scope evaluation (grading a catalogue, not one plugin at a time)

## TL;DR
- **Decision:** Add a third evaluation scope, **marketplace**, alongside the existing plugin and component scopes. It grades a directory whose `.claude-plugin/marketplace.json` catalogues member **plugins**. Three settled questions: (1) a run grades the **local checkout** of each resolvable member and reports the registry pin beside the graded sha, with remote fetch-at-sha deferred; (2) the collection verdict is **self-consistency worst-member** - every member is graded at its own declared tier and its own Standard pin, and the collection is red if any member fails its own claim; (3) everything new ships as **scope-local deterministic findings, not a numbered spine check**, so the 30-check spine every existing plugin is held to does not move.
- **Why:** the gate has plugin and component scopes only, so a catalogue is graded by hand, one member at a time, and everything that exists only *between* members is invisible: two members shipping a colliding skill name, a registry entry that resolves to nothing, a registry version that disagrees with the member's own manifest. The family marketplace has five members and the labor is already real; the first hand-run of it is the design input for this ADR.
- **Status:** Proposed. No grading code merges before this is Accepted.

- **Status:** Proposed (2026-08-05)
- **Date:** 2026-08-05
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- ADR 0034 (resolve profiles in component scope) - established the invariant this ADR extends to a third scope: a flag that is validated must be honored in every scope, never silently dropped.
- ADR 0035 (manifest-vs-disk skill-registration completeness) - `U13`, whose `resolveRegistrationSource` already reads `marketplace.json` and already distinguishes the two catalogue shapes this ADR must separate.
- ADR 0027 (Standard versioning and compatibility policy) - the pinned-Standard downgrade, which is what makes a *heterogeneous* collection verdict possible at all.
- ADR 0038 (the report never invents a declared tier) - the honesty rule a collection verdict must not violate at aggregate level.
- The R3 release plan, `docs/internal/execution/04-releases/R3-v1.9.0-marketplace-scope.md` (the release renumbered to v1.10.0), and the hand-run design input recorded at `_local/audit/2026-07-19_fable_agent/MARKETPLACE-SCOPE-DESIGN.md`.

## Context and problem statement

The gate resolves exactly two scopes. `evaluate()` routes to `evaluateComponent` when a target has a `SKILL.md` and no `library.json`, and otherwise treats it as a plugin, with `looksLikePlugin` as the shape test. There is no third branch.

The consequence is that a catalogue is graded as a loop over members performed by a person, and three classes of defect are structurally invisible to that loop:

1. **Cross-member structural collisions.** Two members shipping `skills/review/`, or two members exposing the same command name. Each member grades clean in isolation; the collision only exists in the union. Component names enter a shared pool on any agent that does not namespace by plugin, which is the same reasoning that motivates `S2`.
2. **Catalogue integrity.** A `marketplace.json` entry whose source resolves to nothing is undeliverable, yet every per-member grade that *did* resolve is still green. This is the catalogued-but-undeliverable failure `U13` exists to catch, one level up and for a component type nothing covers.
3. **Registry-versus-member disagreement.** The registry entry carries a `version`; the member's own manifest carries a version. Nothing compares them. The agent-plugins-side `scripts/validate-registry.mjs` checks registry shape and remote reachability, but not this.

Two catalogue shapes exist in the wild, and the codebase already names both. `resolveRegistrationSource` calls them the **marketplace-of-skills** shape (entry sources resolve under `skills/`, e.g. deanpeters) and the **marketplace-of-plugins** shape (sources point at other plugin directories or repositories), and it deliberately declines the second because there is no sound mapping to one tree's `skills/`. This ADR is about the second shape. The first is already handled where it belongs.

The empirical picture matters for every question below, because the family marketplace is not the easy case:

| Member | Source kind | Declared tier | Declared Standard | Default-profile result |
|---|---|---|---|---|
| `agent-skills-toolkit` | url + sha | advanced | 0.12 | 0E / 0W (Advanced) |
| `thinking-framework-skills` | url + sha | advanced | 0.8 | 0E / 129W (Advanced at its pin; 122 latent at 0.12) |
| `writing-style-catalog` | url + sha | universal | present | 0E / 3W (Universal earned) |
| `pm-skills` | url + sha | none | none | 247E / 40W (blocked) |
| `critique-skills` | url + sha | convergent | 0.12 | 0E / 0W (Convergent) |

All five members are **remote-sourced**, and the collection is heterogeneous on both the tier axis and the Standard-pin axis.

## Decision drivers

- **The gate must stay deterministic, synchronous and model-free.** A collection verdict has to be a pure function of per-member verdicts the gate already computes, or it is not the same kind of artifact.
- **No existing verdict may move.** A marketplace run must not change what any plugin scores on its own. If it does, this stops being a new scope and becomes a Standard change.
- **The spine is a promise.** Thirty checks is the contract every graded plugin is held to. New cross-member capability should change what the grader can *grade*, not what conformance *requires*, unless an ADR deliberately decides otherwise with a burndown.
- **Honesty about what was graded.** ADR 0038 was written because a report asserted a tier nobody declared. A collection report that says "green" without saying which tree it read, and how that tree relates to what installers get, would repeat that failure at aggregate scale.
- **The maintainer's own marketplace is the first real user.** A design that cannot grade a url-sourced catalogue does not grade the case that motivated it.
- **Relocation-friendliness.** The Standard's canonical home is decided to be `agent-plugins/standards/` (that repo's ADR 0001, Accepted 2026-06-01), with the physical move sequenced separately and not yet begun. New engine-adjacent code should be a delimited module so that move stays a mechanical diff.

## Considered options

### Question 1 - which tree does a run grade?

- **A. Grade the registry pin** (fetch or check out each member at its pinned sha). Answers "is what installers actually get conformant?" This is the published-truth question and it is the one an outside consumer cares about. Cost: network, credentials, a fetch-and-cache layer, and a run that can fail for reasons unrelated to conformance.
- **B. Grade the local checkout** of each member that resolves on disk. Answers "what would the next re-pin grade?" This is the compliance-work question, and it is what the hand-run actually did. Cost: a local checkout must exist, and the graded tree is usually *ahead* of the pin.
- **C. Both, selected by flag.** Complete, and roughly doubles the surface of the first release.

### Question 2 - how do member verdicts aggregate?

- **A. Uniform worst-member.** Pick a tier demand for the collection; any member below it reds the collection. Simple to state and wrong here: it would grade `writing-style-catalog` against a Gold expectation it never claimed, which is precisely the invented-declaration failure ADR 0038 forbids.
- **B. Self-consistency worst-member.** Each member is graded at its own declared tier and its own Standard pin. The collection is red if any member fails *its own* claim. Aggregates exactly what the gate already computes and adds no new per-member semantics.
- **C. Threshold policy** ("passes at tier T if N of M members reach T"). Expressive, and it invites a maintainer to tune the threshold until the collection is green, which is the opposite of what a gate is for.

### Question 3 - does anything become a numbered spine check now?

- **A. Scope-local deterministic findings only.** Cross-member collisions and catalogue integrity are real, deterministic, and reported, but they live in the marketplace scope and carry no `U`/`S`/`G` number. The 30-check spine does not move.
- **B. Graduate one or more to numbered spine checks in this release.** Cleaner conceptually, and it retightens the contract for every existing plugin in the same release that introduces the capability, with no burndown window.

## Decision outcome

**Question 1: option B, grade the local checkout, with mandatory pin disclosure.**

A marketplace run grades every member that resolves to a local directory: local-path sources directly, and url sources when a local mapping is supplied or discoverable. For every member the report MUST carry the registry pin sha, the registry entry version, the graded sha, and an explicit divergence marker when they differ. A member the run could not resolve is reported as **unresolved**, never silently omitted and never counted as passing.

Remote fetch-at-sha is deferred, not rejected. It is the better answer to a different question, and adding it later does not invalidate anything decided here, because the pin is already in the report.

The divergence disclosure is load-bearing rather than cosmetic: at the time of writing, three of the four then-published members had local heads diverging from their pins, which is the normal state, since pins are releases and mains move. A collection report that said "green" without that column would be answering the published-truth question with the compliance-work answer.

**Question 2: option B, self-consistency worst-member.**

Every member is graded at its own declared tier and its own pinned Standard, exactly as it would be graded alone. The collection verdict is red if any member fails its own claim, and the collection exit code follows the collection verdict. An undeclared member is graded by the same default the gate already applies to an undeclared plugin; this ADR introduces no new rule for that case.

The report additionally carries the tier distribution across members and, per member, its **Standard debt** - the count of findings that are warnings only because they postdate that member's pin. That number is what makes "green by an old pin" visible rather than flattering, and it is the collection-level analogue of the trust calibration ADR 0036 shipped.

**Question 3: option A, scope-local deterministic findings, no spine number in this release.**

The following are deterministic, objective, and move the collection verdict, while carrying no spine number:

| Finding class | What it compares | Why it is objective |
|---|---|---|
| Manifest shape | `marketplace.json` parses; required fields present | schema |
| Entry resolvability | every entry resolves to a member, or is reported unresolved | filesystem existence |
| Duplicate catalogue names | two entries claiming one name | string comparison |
| Cross-member skill-directory collision | the union of member `skills/<name>/` | string comparison |
| Cross-member command-name collision | the union of member command names | string comparison |
| Registry-vs-member version agreement | entry `version` against the member manifest's version | string comparison |

A malformed manifest is a finding, never a crash, matching the house rule `resolveRegistrationSource` already follows.

Three analyses are **advisory**: cross-member trigger-surface collision (sensor reading 11), command-versus-skill enumerated-content divergence (reading 15), and embed or content-duplication lineage between members (reading, PSR-12). They are merged by `applyAdvisory`'s namespaced-key discipline and can never move the collection verdict or the exit code.

Graduating any cross-member finding to a numbered spine check is deferred to its own ADR, which would carry the warn-first burndown `U13` established. Shipping the capability and retightening the contract in one release would give every existing plugin a new requirement in the same breath as a new feature, with no migration window.

**Division of labor, stated so neither side grows into the other.** Marketplace scope owns everything local and API-free: schema, duplicates, resolvability, member iteration, version agreement, collisions. The agent-plugins-side `scripts/validate-registry.mjs` keeps the remote and API-dependent checks: sha reachability, tag pointing, installability.

**Per-member config resolution.** Each member's grading config resolves through the same pipeline plugin scope uses - `loadConfig`, then CLI override, then `resolveFindings` - rooted at that member's own directory. This is ADR 0034's invariant extended to a third scope: `--profile` and `--mode` are honored per member or they are not honored at all.

## Consequences

- **Positive:** the catalogue becomes gradeable in one run; three defect classes that no per-plugin loop can see become visible; the family marketplace, which is the first real consumer, is gradeable as it actually exists rather than as a simpler hypothetical; the multi-plugin how-to stops being a manual-labor guide.
- **Positive:** the spine stays at 30 and no existing plugin's verdict changes, so adopting this release costs a consumer nothing.
- **Negative:** a marketplace run answers the compliance-work question, not the published-truth question, until remote fetch lands. The pin-versus-graded columns make that legible but do not remove it, and a reader who ignores those columns can still over-read a green.
- **Negative:** members that do not resolve locally are simply not graded. The collection verdict is therefore a statement about the members the run could see, which the report must say plainly.
- **Neutral:** the renderer gains a sixth report type and is factored per type behind the existing golden snapshots, which must regenerate byte-identical or diff purely additively.
- **Neutral:** the module is built as a delimited home so that, if the Standard and the runner relocate to `agent-plugins/standards/`, this travels as a unit rather than being unpicked from shared internals.

## Implementation sites

This ADR is Proposed and no code exists yet. Planned symbols are written without backticks, per the convention the ADR correction notes established, so the resolves-to-real-source guard is not asserting against unwritten code. Existing sites are backticked and are the ones a change here must not break.

- `scripts/evaluate.mjs` - `evaluate()` gains a third branch beside the existing `looksLikePlugin` and component tests. Detection: a directory carrying `.claude-plugin/marketplace.json` whose entries resolve to member plugins rather than under `skills/`. The marketplace-of-skills shape stays with `U13` and is explicitly not this branch.
- `scripts/checks/skill-registration.mjs` - `resolveRegistrationSource` already reads the same manifest and already declines the marketplace-of-plugins shape. That decline is the seam this scope fills, and its behavior must not change; a test should assert the two scopes stay disjoint.
- `scripts/lib/config.mjs` and `scripts/lib/resolve-config.mjs` - `loadConfig` and `resolveFindings`, invoked per member and rooted at the member's own directory, extending ADR 0034's invariant.
- `scripts/lib/report-render.mjs` - `deriveModel` and the shared style block gain a marketplace report type; the file is factored per report type in the same release, with the existing golden snapshots as the safety rail.
- `scripts/evaluate.mjs` - `applyAdvisory` merges the three advisory analyses under namespaced keys only, so no advisory block can reach the collection verdict.
- A new delimited module home under scripts/lib/marketplace/ plus at most one scripts/checks/ entry point, for relocation-friendliness.
- `docs/internal/execution/relocation-addendum.md` - the packing-list delta is updated in the same release, recording each new file's disposition.
- Ground truth for tests: the local family marketplace at `E:/Projects/product-on-purpose/agent-plugins` (url-sourced, heterogeneous, five members) and the local-source marketplace-shaped target registered by corpus batch 3.

Grep anchor: `resolveRegistrationSource` (the existing consumer whose declined branch this scope fills).

## Open questions for ratification

1. **Is the deferral of remote fetch-at-sha acceptable for the first release?** It means the first marketplace verdict answers "what would the next re-pin grade" rather than "what do installers get."
2. **Should an unresolved member red the collection, or warn?** The decision above reports it and does not say which. Recommendation: red, because a catalogue entry that resolves to nothing is undeliverable, and treating it as a warning makes a broken catalogue look green.
3. **Is registry-versus-member version agreement in scope for this release**, given it is the one new deterministic comparison that reaches outside the toolkit's own tree for its second operand?
