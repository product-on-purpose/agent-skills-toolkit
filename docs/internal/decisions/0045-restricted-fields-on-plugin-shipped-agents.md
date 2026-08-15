# 0045 - U14: restricted fields on plugin-shipped agents become a numbered Universal requirement

## TL;DR
- **Decision:** the marketplace scope's `A6` reading is promoted to a numbered spine check, **`U14`**, tier `universal`, provenance `vendor-cited`, `since: "0.13"`. It fires when an agent shipped inside a plugin declares `hooks`, `mcpServers` or `permissionMode` - fields Claude Code refuses on plugin-shipped agents **for security reasons**, in the vendor's own words. The field lists move into one shared module both scopes import, so a plugin graded on its own and the same plugin graded as a catalogue member detect exactly the same fields.
- **Why:** v1.12.0 detects this across the members of a catalogue and does **not** detect it when a single plugin is graded on its own, which is how almost everyone runs the gate. Same silent-no-op class as the v1.10.0 phantom-subagent discovery: the author believes they configured something and the runtime refuses it.
- **This ADR exists because a workstream description cannot decide three things it needs to decide**: which agents the requirement applies to, what happens when the vendor's documentation moves, and whether a field the vendor later supports is a Standard revision or a silent re-read.
- **Status:** Accepted.

- **Date:** 2026-08-13
- **Deciders:** maintainer (jprisant), with Claude (Opus 5)

## Builds on
- ADR 0039 (marketplace scope evaluation) - introduced `A6` as a per-member **reading**, explicitly not a spine check, on the stated grounds that "making it a numbered requirement is a Standard 0.13 tightening (ADR 0027's burndown), and that cut belongs to the alignment batch". This ADR is that cut.
- ADR 0044 (one post-resolution Standard ceiling) - **`U14` ships with `since: "0.13"` and no migration metadata, and that is only correct under ADR 0044's reordering.** Under the previous ordering the `since` downgrade was a pre-pass, so a consumer's `rules.U14 = "error"` would have beaten it (E26) and handed a gate-failing error to a plugin pinned at 0.12 for a check that did not exist at its pin. `since` alone is sufficient **only because the ceiling now runs after overrides**.
- ADR 0028 (provenance) - `vendor-cited` is the correct class: the requirement is backed by an external authority quoted in the check's docblock, not by an askit convention.
- **E33** (`enhancements.md`), filed ADR-gated. This is the gate.

## Context and problem statement

Claude Code's plugin reference states, verbatim (re-verified against the live page on 2026-08-13, as part of implementing this ADR):

> "Plugin agents support `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, and `isolation` frontmatter fields."

> "For security reasons, `hooks`, `mcpServers`, and `permissionMode` are not supported for plugin-shipped agents."

The vendor's wording is **"not supported for security reasons"**, which is stronger and more precise than the "silently ignored" paraphrase E33 was originally filed under. The field is refused, not merely dropped, and the author has no signal that it was.

`A6` reads this correctly today and only in marketplace scope. A maintainer running `node scripts/check.mjs .` on their own plugin - the overwhelmingly common case - is told nothing.

## Decision drivers

- The check must produce **identical field detection** in both scopes, or the two will drift and a plugin's verdict will depend on how it happened to be graded.
- A vendor-cited requirement must carry its citation into the finding, because the consumer's next question is "says who".
- The vendor's documentation is not under our control and **has already moved host once** (`docs.claude.com` now 301s to `code.claude.com`). The design must survive that without a Standard revision.

## Considered options

**Which agents does it apply to?**

- **Option A - only when `agent-targets` includes `claude`.** Rejected. `agent-targets` is a declaration of *intent*, not an installation constraint: nothing stops a consumer installing any plugin into Claude Code, and the field is refused when they do. Gating the check on a self-declared field would also let a plugin opt out of a security-motivated requirement by editing its own manifest - the same self-granted-exemption shape ADR 0044 rejects for profiles.
- **Option B (chosen) - every agent shipped inside the plugin, independent of `agent-targets`.** The artifact is the plugin; the refusal belongs to the artifact. This also keeps the two scopes trivially identical, which is the parity requirement above.

**What happens when the vendor's documentation changes?**

- **Chosen: the citation carries a URL and a READ DATE, and a host move is a documentation edit, not a Standard revision.** The constant is re-verified at each Standard minor and the read date updated in the same change. The quote is stored once, in the shared module, so there is exactly one place for it to be wrong.

**Is a field the vendor later SUPPORTS a Standard revision?**

This is the question that most needed deciding, and the answer is asymmetric:

- **A field REMOVED from the unsupported list is a silent re-read.** The check becomes less strict, which is green-ward: no plugin that passed can start failing. Update the constant, bump the read date, note it in the CHANGELOG. No Standard revision, no migration window.
- **A field ADDED to the unsupported list is a Standard revision.** It is red-ward - a plugin that passed can start failing - so it requires a new minor and, per ADR 0044, **finding-level `migration` metadata**, because `meta.since` describes when `U14` appeared and says nothing about when a rule inside it did. Bumping `U14`'s own `since` would be wrong: the check did not appear again.

## Decision outcome

`U14` is registered on the Universal spine at `since: "0.13"`, provenance `vendor-cited`, carrying **no migration metadata** - `since` alone governs an introduction, and under ADR 0044 that is now sufficient because the ceiling runs after configuration resolves.

The field lists and the citation live in **one shared module** that both `scripts/checks/agent-restricted-fields.mjs` and `scripts/lib/marketplace/analyze.mjs` import, so the field list exists once rather than twice. The marketplace `A6` reading keeps its own severity and message shape - it names the member, which a plugin-scope finding cannot - but its **detection** is the shared constant.

A finding names every offending field on that agent, quotes the vendor sentence, and links the doc with its read date.

## Consequences

- **The spine goes 30 to 31.** `tests/unit/registry-sync.test.mjs`, `STANDARD.md` and the provenance map move together, which the tests enforce by construction - a spine count is asserted in exactly one place and a check registered without a Standard entry fails.
- **A plugin pinned below 0.13 sees a warning, not a gate failure**, via ADR 0044's ceiling. A plugin that already pinned 0.13 or above gates immediately on upgrade; that is outside the v1.13.0 invariant's scope by design, because such a plugin declared the newest contract before it existed.
- **`A6` stops being the only place this is detected**, and the duplicated field list that would otherwise have appeared in two modules never exists.

## Correction, 2026-08-14: discovery is a RUNTIME question, not a registration one

The first implementation iterated `ctx.subagents`, the collection the loader builds from
`listAgentFiles`. That discovery deliberately excludes `agents/README.md` and every underscore-prefixed
file, because those are not REGISTERED subagents. Claude Code loads them anyway - `folder-readme.mjs`
carries the probe that proved it, where a directory holding `real-agent.md`, `README.md`, `_README.md`
and `README.txt` registered three subagents, `real-agent`, `README` and `_README`. The underscore prefix
protects nothing; only the non-`.md` extension was skipped.

So a plugin could put `hooks` or `mcpServers` in `agents/_unsafe.md`, ship it to a runtime that loads it,
and earn a clean Universal or Gold verdict from the check written to forbid exactly that.

The normative text was never wrong: `STANDARD.md` already said "an agent under the plugin's `agents/`
directory" and "applies to every agent the plugin ships". The IMPLEMENTATION was narrower than the
requirement, which is the harder defect to see - the code passed its own tests, and the tests were
written against the same narrow reading.

The loader now exposes `agentDocs` (every `.md` under `agents/`, via `listRuntimeAgentDocs`) beside
`subagents` (what the plugin registers), and `U14` reads the former. The two collections answer different
questions and are deliberately both available: a check about REGISTRATION should keep using `subagents`.

Found by round 7 of the v1.13.0 adversarial review. Zero family verdicts moved.

## Implementation sites
- `scripts/lib/vendor-agent-fields.mjs` - **new shared module**: `PLUGIN_AGENT_UNSUPPORTED_FIELDS`, `PLUGIN_AGENT_SUPPORTED_FIELDS`, `AGENT_FIELDS_DOC`, `unsupportedFieldsOn`, and the verbatim vendor quote with its read date.
- `scripts/checks/agent-restricted-fields.mjs` - **new check**: `meta` (`reqId: "U14"`, `tier: "universal"`, `provenance: "vendor-cited"`, `since: "0.13"`) and `check`.
- `scripts/lib/marketplace/analyze.mjs` - `agentRestrictedFields` re-exports the shared constants rather than defining them, so the two scopes cannot disagree.
- `scripts/lib/registry.mjs` - `U14` joins `CHECKS`; the spine count moves 30 to 31.
- `STANDARD.md` - `U14` registered in the Universal tier.
- `tests/unit/agent-restricted-fields.test.mjs` - the check's own coverage, including the cross-scope parity assertion.

Grep anchor: `PLUGIN_AGENT_UNSUPPORTED_FIELDS` in `scripts/lib/vendor-agent-fields.mjs`.

## Correction, 2026-08-14: sharing the field list did not deliver the guarantee

**The decision above is unchanged and is not amended.** This note records that its implementation
diverged from it a release later, and what now enforces it.

Sharing `vendor-agent-fields.mjs` between the two scopes was necessary and **not sufficient**. The
scopes also have to apply the shared list to the **same agents**, and they did not: v1.13.0's round-1
review moved `U14` to `ctx.agentDocs` (what a runtime loads) and left `evaluate-marketplace.mjs`
building each member from `ctx.subagents` (what a plugin registers). The registration list excludes
`README.md` and underscore-prefixed files, so from v1.13.0 as published, **the same plugin took a `U14`
error when graded alone and no finding at all when graded as a catalogue member** - the exact outcome
the sentence above forbids.

The "cross-scope parity assertion" this section already claimed compares **field lists**, and a field
list is identical on both sides of this defect. Two other tests were equally blind, each correctly:
the `A6` unit test hand-builds its `members` array so it never reaches the real member build, and
`marketplace-scope.test.mjs`'s verdict-parity test compares tier, errors, warns and exit code, while
`A6` is a scope-local `warn` carrying `reqId: null` that never enters a verdict.

Fixed by giving the member both lists under their true names (`subagents` and `agentDocs`, mirroring
the loader) and pointing `agentRestrictedFields` at `agentDocs`. The enforcement is an **end-to-end**
parity test in `tests/unit/marketplace-scope.test.mjs`: one fixture directory graded both ways, with
the restricted-field **findings** compared. It was proved capable of failing against both halves of the
fix independently. See ADR 0046 for the analysis, which is the same defect one layer over.
