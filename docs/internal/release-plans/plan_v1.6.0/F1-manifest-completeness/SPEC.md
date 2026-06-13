# F1 - manifest-vs-disk skill-registration completeness (U13) - SPEC

> The feature SPEC for **F1** of the **v1.6.0 "manifest completeness + actionable reports"** release. F1 adds a new Universal/Bronze conformance check, **`U13` `skill-registration`**, that catches a plugin shipping a skill on disk it never registered in its catalog (invisible skills). It implements [ADR 0035 (manifest-vs-disk skill-registration completeness)](../../../decisions/0035-manifest-vs-disk-skill-registration-completeness.md), which is **Proposed** and recommends **option 1** (a new Universal spine check). Spine **29 -> 30**, Standard **0.11 -> 0.12** (the first growth since `U10` retired in v1.2.0). Per the Standard's own burndown rule (STANDARD.md sec 7.7, ADR 0027), `U13` ships as a **`warn` for Standard 0.12** and graduates to `error` at 0.13 - the first live exercise of the burndown machinery v1.3.0 built.
> Created 2026-06-13. Owner: maintainer. Source of truth: ADR 0035, eval-run sensor reading 12 (`docs/internal/eval-runs/eval-runs.md`). Live status: [`docs/internal/STATUS.md`](../../../STATUS.md).
> Sibling in this release: [`F4-report-ux`](../F4-report-ux/) (per-check explanation glossary + the `universal-checks.md` reference page) - F4's glossary renders `U13`'s `why:` line and its new reference page documents `U13`, so the two ship together as the user-facing v1.6.0 cut. Supporting efforts F2/F3/F5 are documented in this folder and land continuously (PROGRAM-PLAN sec 2).

## What this delivers (plain language first)

**For anyone (non-engineer):** when you publish a plugin, you list its skills in a catalog so people can find and install them. It is easy to add a skill as a folder but forget to add it to the catalog - now you have shipped a skill nobody can see. This check compares the folders you shipped against the catalog you published and tells you if any are missing. A real library we graded, `deanpeters/Product-Manager-Skills`, ships 49 skills but lists only 47, so two are invisible. The check finds exactly that, for any plugin, without any opinion about whether the skills are good - only whether you listed everything you shipped.

**For an engineer:** a new deterministic Universal check, `U13` `skill-registration`, computes the set difference between the skill directories on disk (`ctx.skills`, the existing `skills/<name>/SKILL.md` enumeration) and the skill set the plugin's enumerating manifest registers (`library.json.components.skills[]`, or a `.claude-plugin/marketplace.json` `plugins[].source` pointing under `skills/`). A skill on disk that is unregistered is the headline finding. The check is pure (a set comparison, no model), provenance `objective`, and resolves a registration source by precedence so it does not false-fire on the auto-discovery plugin shape that enumerates no skills.

## 1. Goal

Close the portability gap reading 12 named: the spine grades a library's components but never checks that the library's own catalog enumerates every component it ships, so a plugin can silently deliver invisible skills. F1 adds that check as objective, portable, plugin-intrinsic version arithmetic over two sets - no model, fully synchronous - preserving the deterministic gate contract (Design Principle 3 / ADR 0023).

Concretely, F1 delivers:

1. **A new check module `scripts/checks/skill-registration.mjs`** with `meta = { id: "skill-registration", tier: "universal", reqId: "U13", since: "0.12", provenance: "objective" }`, registered in `scripts/lib/registry.mjs` after `U12`.
2. **A registration-source resolver** that picks the authoritative skill registration list per plugin shape (library.json components, else marketplace.json plugins, else none) and compares it against the on-disk skill set.
3. **The burndown:** the check emits `SEVERITY.WARN` at Standard 0.12 (surfaced, never gate-failing), the first real exercise of the warn-for-one-minor rule; a later release flips it to `SEVERITY.ERROR` at 0.13.
4. **The Standard sweep:** `STANDARD.md` gains the `U13` requirement and moves to 30 checks / 0.12; the count moves everywhere it is asserted; `library.json.standard -> 0.12`.

The spine grows by exactly one (`U1-U9`, `U11-U13`, `S1-S8`, `G1-G10` = 30). No existing check changes what it asserts.

## 2. Background and the exact gap (read this first)

The registration surface depends on the plugin shape; the check must handle all three (ADR 0035 Context):

- **`library.json` shape (askit):** `ctx.library.data.components.skills[]`, each `{ name, path }` where `path` is `skills/<name>/SKILL.md`. This is the authoritative registration list, loaded today by `scripts/lib/load-plugin.mjs` into `ctx.library.data`.
- **Claude marketplace-of-skills shape (deanpeters):** `.claude-plugin/marketplace.json` `plugins[]`, each `{ name, source: "./skills/<name>", ... }`. The registration is the set of `source` paths that resolve under `skills/`. This file is not loaded by `ctx` today; F1 reads it.
- **Bare `plugin.json` / auto-discovery shape:** no skill enumeration anywhere; Claude Code discovers everything under `skills/`. The manifest registers nothing, so disk *is* the registration and no drift is possible. The check passes (vacuously satisfied), never warns.

The on-disk set is `ctx.skills` (the loader's `listSkillDirs(root).map(loadSkill)` already in context), filtered to directories that actually contain a `SKILL.md` (a `loadSkill` with no parse error or with a present `skillMdPath`). This is the same enumeration every other skill-scoped check uses, so "on disk" means the same thing across the spine.

This is orthogonal to `U8` `manifest-drift` (generated native manifests vs `library.json`) and `S6` `per-target-presence` (native target manifests exist). F1 reads the *human-authored registration list* and the *directory listing*; it never reads the generated manifests. The shared word "manifest" is the only overlap, which is why the id is `skill-registration`, not a `manifest-*` name.

## 3. The comparison and the registration-source precedence

`U13` resolves a single registration source, then compares:

```
registered = resolveRegistrationSource(ctx)   // a Set of canonical skill keys, or null if no enumerating manifest
onDisk      = ctx.skills mapped to the same canonical key
```

**Canonical skill key.** A skill is keyed by its directory name under `skills/` (the `<name>` in `skills/<name>/SKILL.md`), which is what both registration shapes ultimately point at:
- `library.json` `components.skills[].path` -> the `<name>` segment of `skills/<name>/SKILL.md`.
- `marketplace.json` `plugins[].source` -> the `<name>` segment of `./skills/<name>`.
- on disk -> `path.basename(skillDir)`.

Keying by directory name (not by the declared `name` field) is deliberate: it makes the comparison about *which folders are catalogued*, which is the delivery question, and it is robust to a `name` field that disagrees with its folder (that disagreement is `U4`'s job, not `U13`'s).

**Precedence (`resolveRegistrationSource`):**
1. If `ctx.library.data.components.skills` is a non-empty array -> the registration source is the set of its path-derived names. (askit shape.)
2. Else if `.claude-plugin/marketplace.json` parses and has a `plugins[]` array with at least one `source` resolving under `skills/` -> the registration source is that set of source-derived names. (marketplace-of-skills shape.)
3. Else -> `null` (no enumerating manifest). The check returns no findings (vacuously satisfied).

A malformed `library.json` or `marketplace.json` is **not** F1's failure to report: `U1` (`library-json`) already grades `library.json` validity, and a malformed `marketplace.json` is out of F1's scope (it falls through to the next precedence rung or to `null`). F1 never throws on a malformed manifest; it degrades to "no enumerating source found."

## 4. Requirements

RFC 2119 language. Each requirement carries a testable acceptance criterion. Requirement ids are stable handles for the IMPL-PLAN and the adversarial gate.

### R-REG-1 - a new Universal check `U13` `skill-registration` is registered

A new module `scripts/checks/skill-registration.mjs` MUST export `meta = { id: "skill-registration", tier: "universal", reqId: "U13", since: "0.12", provenance: "objective" }` and a synchronous `check(ctx)` returning a `Finding[]`. It MUST be registered in `scripts/lib/registry.mjs` in spine order, immediately after `U12` (`mermaid-valid`).

- **Acceptance:** `registry-sync` asserts the spine is now **30** checks with reqIds `U1-U9`, `U11-U13`, `S1-S8`, `G1-G10` (no `U10`); `meta.since === "0.12"`; `meta.provenance === "objective"`; the module exports a synchronous `check` returning an array.

### R-REG-2 - the headline defect: a skill on disk that is unregistered

For a plugin whose registration source resolves (precedence rungs 1 or 2 of sec 3), the check MUST emit one finding per skill directory that exists on disk but whose canonical key is absent from the registration source. The finding message MUST name the unregistered skill and the registration file it is missing from, and point at the fix.

- **Acceptance:** against a fixture with 3 skill dirs on disk and a `library.json` registering 2 of them, the check returns exactly 1 finding naming the third skill; the message identifies `library.json` and tells the author to add it to `components.skills[]`. Against the real deanpeters target (`E:/tmp/eval-deanpeters-pm` @ `70fb6c4`, `--profile plain-plugin`), the check reports exactly the 2 unregistered skills.

### R-REG-3 - the reverse defect: a registered skill missing on disk (phantom registration)

For a plugin whose registration source resolves, the check SHOULD emit one finding per registration entry whose canonical key has no matching skill directory on disk (a catalogued skill that cannot be delivered). This is the bidirectional completeness guarantee. It is REQUIRED for the `library.json` shape (where the path is directly checkable) and MAY be deferred for the `marketplace.json` shape if source-path resolution proves non-trivial (recorded in the IMPL-PLAN; PROGRAM-PLAN sec 6 governs the divergence).

- **Acceptance:** against a fixture whose `library.json` registers a skill at `skills/ghost/SKILL.md` that does not exist on disk, the check returns 1 finding naming `ghost` as registered-but-missing; the message distinguishes it from the R-REG-2 class (the file says "registered but not found on disk," not "on disk but unregistered").

### R-REG-4 - no enumerating manifest means no finding (no false positive)

If no registration source resolves (precedence rung 3: a bare `plugin.json`/auto-discovery plugin, or a directory with skills but no `library.json` and no skill-enumerating `marketplace.json`), the check MUST return an empty array. It MUST NOT treat "auto-discovery" as "everything is unregistered."

- **Acceptance:** against a fixture with 2 skill dirs and a `.claude-plugin/plugin.json` that lists no skills (and no `library.json`, no `marketplace.json`), the check returns `[]`; a unit test asserts `resolveRegistrationSource(ctx) === null` for that shape.

### R-REG-5 - the check is pure, synchronous, and model-free

`check(ctx)` and `resolveRegistrationSource(ctx)` MUST be synchronous, perform no model call, and read only `ctx` (already-loaded `library`, `skills`) plus, for the marketplace rung, a single synchronous read of `.claude-plugin/marketplace.json` under the plugin root. Same input tree -> same findings across runs.

- **Acceptance:** a unit test calls `check(ctx)` twice on the same fixture context and asserts deep equality; the module imports no model client and uses no `await`.

### R-REG-6 - severity is `warn` at Standard 0.12 (the burndown), graduating to `error` at 0.13

The module MUST emit findings at `SEVERITY.WARN` for the v1.6.0 / Standard 0.12 release (the warn-for-one-minor burndown window STANDARD.md sec 7.7 requires for a new MINOR requirement). It MUST NOT gate-fail any plugin in 0.12. A later release graduates it to `SEVERITY.ERROR` at Standard 0.13 by flipping the emitted severity (the per-check-flip mechanism; the gate has no `enforcedSince` field). A code comment on the emitted severity MUST record the burndown state and point at ADR 0035 + STANDARD.md sec 7.7.

- **Acceptance:** against the deanpeters target, `node scripts/check.mjs <target> --profile plain-plugin` prints the 2 unregistered skills as `[warn]` and exits `0` (the warns do not gate); a unit test asserts the findings' severity is `warn` and that `runGate` exit is `0` for an otherwise-clean plugin with only `U13` warnings.

### R-REG-7 - the check survives `--profile plain-plugin` (objective provenance)

Because `meta.provenance === "objective"`, the check MUST remain active under the `plain-plugin` profile (it is portable, not a house convention). A test MUST assert it is not dropped by the profile that strips house checks.

- **Acceptance:** the provenance-by-reqId map (`registry.mjs`) maps `U13 -> objective`; a profile test confirms `U13` findings are present under `--profile plain-plugin` on the deanpeters target (the whole reason `--profile` exists is to grade third-party plugins on portable rules, and this is one).

### R-STD-1 - STANDARD.md gains the U13 requirement and the spine line moves to 30 / 0.12

`STANDARD.md` MUST gain a normative `U13` requirement statement in the Universal/Bronze section (the catalog must register every skill it ships; phantom registration is also a violation), move its spine-count line from 29 to **30**, and move its Standard version from 0.11 to **0.12**. The new requirement text MUST state it ships as a `warn` for 0.12 per sec 7.7 and becomes an `error` at 0.13, so the Standard documents its own burndown in action.

- **Acceptance:** `STANDARD.md` lists `U13` with the registration-completeness rule and the burndown note; its version line reads `0.12`; a grep finds no surviving "29-check" claim in `STANDARD.md`; `library.json.standard === "0.12"`.

### R-STD-2 - the 30-count and 0.12 move everywhere it is asserted

Every tracked surface that asserts the spine count or the Standard version MUST be updated: `registry-sync` (30), `docs/explanation/conformance-and-tiers.md` tables, the new `docs/reference/universal-checks.md` page (F4), `README.md`, `AGENTS.md`, and any tier-report header text. The four ADR 0024 surfaces that say "29" today are enumerated in the IMPL-PLAN.

- **Acceptance:** `git grep -nE "29-check|29 checks|\"0\.11\"|Standard 0\.11"` returns only historical references (CHANGELOG, prior ADRs, RELEASE-HISTORY, session logs), no live contract surface; the IMPL-PLAN's sweep checklist is fully ticked.

### R-DOGFOOD-1 - the toolkit's own gate is unchanged (clean at U13)

The toolkit registers all 23 of its on-disk skills in `library.json.components.skills[]` (verified: 23 registered == 23 directories), so `U13` MUST be clean for the toolkit - not even a warn. `node scripts/check.mjs .` MUST stay **Advanced, 0/0**, with the new 30-check spine, and the Standard 0.12 bump MUST NOT change the toolkit's own grade.

- **Acceptance:** before-and-after F1, `node scripts/check.mjs .` is Advanced 0 errors / 0 warnings; a test asserts `U13` returns `[]` for the repo root; `npm test` green.

### R-SEQ-1 - F1 lands as one PR against protected main, gate + CI green

F1 ships as a single feature PR against protected `main`, gate + CI green, behind a 4-lens adversarial Workflow before merge (Codex `/codex:review` is unreliable on this Windows setup per MEMORY; the MCP fallback works). The v1.6.0 version-bump PR (after F1 + F4 merge) carries the `library.json.standard -> 0.12` and `version -> 1.6.0` bumps; F1's own PR moves the Standard text and the check but the release PR owns the version numbers (mirroring the v1.3.0 discipline).

- **Acceptance:** the PR diff touches only the new check module, `registry.mjs`, `STANDARD.md`, the count-bearing docs, the new fixtures + tests, and the `registry-sync` assertion; the gate is green at every commit; the adversarial review is recorded in this packet.

## 5. The check (design detail)

`scripts/checks/skill-registration.mjs` (sketch, to be finalized in the IMPL-PLAN):

```js
// what-it-is:   the skill-registration check (U13)
// what-it-does: compares the skills a plugin registers in its enumerating manifest (library.json
//               components, else .claude-plugin/marketplace.json plugins) against the skill dirs on
//               disk; a skill on disk but unregistered is invisible to installers (a silent delivery
//               failure), and a registered skill missing on disk is undeliverable
// why:          a well-formed catalog must enumerate every skill it ships; this is objective and
//               portable (true for any plugin, any agent), so it is a Universal requirement, distinct
//               from U8 (generated-manifest-vs-library.json). See ADR 0035.
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "skill-registration", tier: "universal", reqId: "U13", since: "0.12", provenance: "objective" };

export function check(ctx) {
  const registered = resolveRegistrationSource(ctx);  // Set<string> | null
  if (registered === null) return [];                  // no enumerating manifest -> nothing to drift (R-REG-4)
  const onDisk = new Set(ctx.skills.map((s) => basename(s.dir)));
  const out = [];
  // R-REG-2: on disk but unregistered (the headline; warn at 0.12 per R-REG-6)
  for (const name of onDisk) if (!registered.has(name)) out.push(/* warn: shipped but unregistered */);
  // R-REG-3: registered but missing on disk (phantom registration)
  for (const name of registered) if (!onDisk.has(name)) out.push(/* warn: registered but not on disk */);
  return out;
}
```

`resolveRegistrationSource(ctx)` is the precedence of sec 3, exported for unit testing. `CURRENT_STANDARD` does not need touching; the burndown is encoded purely by the module emitting `SEVERITY.WARN`.

## 6. Fixtures and tests

- **`tests/fixtures/anti/under-registered/`** - a `library.json` plugin with 3 skill dirs on disk registering 2 (R-REG-2). Asserts: 1 finding naming the unregistered skill, severity `warn`, exit 0.
- **`tests/fixtures/anti/phantom-registration/`** - a `library.json` registering a skill whose dir is absent (R-REG-3). Asserts: 1 finding, message distinguishes the phantom class.
- **`tests/fixtures/golden/auto-discovery-plugin/`** - skill dirs on disk, a `.claude-plugin/plugin.json` enumerating none, no `library.json` (R-REG-4). Asserts: `[]`, `resolveRegistrationSource` returns `null`.
- **`tests/fixtures/golden/marketplace-complete/`** - a `.claude-plugin/marketplace.json` whose `plugins[].source` set matches the on-disk skills (the deanpeters shape, but complete). Asserts: `[]`.
- **`tests/fixtures/anti/marketplace-under-registered/`** - the same shape registering fewer than on disk. Asserts: the missing skills are reported (the synthetic deanpeters reproduction, so the test does not depend on the external clone).
- **`tests/unit/skill-registration.test.mjs`** - `resolveRegistrationSource` precedence (each rung + the `null` fall-through), the bidirectional set comparison, purity/idempotence (R-REG-5), the `warn` severity (R-REG-6), and the repo-root clean case (R-DOGFOOD-1).
- **`tests/unit/registry-sync.test.mjs`** (extended) - the spine is 30; `U13` present with `since: "0.12"`, `provenance: "objective"`; the reqId set is `U1-U9`, `U11-U13`, `S1-S8`, `G1-G10`.
- A profile test (extend the existing profile suite) - `U13` survives `--profile plain-plugin` (R-REG-7).

## 7. Acceptance criteria (feature-level checklist)

- [ ] `scripts/checks/skill-registration.mjs` exists, registered after `U12`; `meta` is `{ id, tier:"universal", reqId:"U13", since:"0.12", provenance:"objective" }`; `check` is synchronous and pure.
- [ ] `resolveRegistrationSource` implements the sec 3 precedence (library.json components -> marketplace.json plugins -> null) and never throws on a malformed manifest.
- [ ] The headline defect (on disk, unregistered) and the phantom defect (registered, missing) are both reported, distinguished by message (R-REG-2/3); marketplace phantom-detection deferral, if any, is recorded.
- [ ] No false positive on the auto-discovery shape (R-REG-4).
- [ ] Findings emit at `SEVERITY.WARN` for 0.12 with a code comment recording the burndown and pointing at ADR 0035 + sec 7.7; the gate exit is `0` for a plugin whose only findings are `U13` warns (R-REG-6).
- [ ] `U13` survives `--profile plain-plugin` (R-REG-7); the deanpeters target reports exactly its 2 unregistered skills as warns.
- [ ] `STANDARD.md` carries the `U13` requirement, the spine line reads 30, the version reads 0.12, the burndown is documented; `library.json.standard === "0.12"` (release PR).
- [ ] The 30-count / 0.12 sweep is complete across every asserted surface (R-STD-2); `registry-sync` enforces 30.
- [ ] `node scripts/check.mjs .` is Advanced 0/0 on the 30-check spine, unchanged by F1 (R-DOGFOOD-1).
- [ ] `npm test` green; no other test regresses; no em-dash / en-dash in any changed file.
- [ ] `git diff --name-only` shows only the intended files (R-SEQ-1); the 4-lens adversarial review ran and is recorded.

## 8. Out of scope

- **A marketplace SCOPE for the gate** (validating `marketplace.json` as a first-class scope, iterating member plugins, cross-plugin overlap) - that is the carried P3 concept (PROGRAM-PLAN sec 6 / STATUS roadmap), not F1. F1 only reads `marketplace.json` as one registration-source rung for a single plugin's skill set.
- **Grading non-skill components for registration** (subagents, commands, hooks) - F1 scopes to skills (the reading-12 defect, and the highest-value case). Extending the same set comparison to other component types is a clean future tightening, recorded here as deliberate.
- **The Standard 0.13 graduation to `error`** - a future release flips `U13`'s emitted severity once the burndown window elapses; F1 ships the warn-state only.
- **Reconciling a `name`-vs-directory disagreement** - that is `U4`'s job; `U13` keys by directory name and does not opine on the `name` field.
- **Autofix (writing the missing registration entry)** - not built; the finding points the author at the fix.

See the [`F1-manifest-completeness/IMPL-PLAN.md`](./IMPL-PLAN.md) for the file-by-file build, and the v1.6.0 [`PROGRAM-PLAN.md`](../PROGRAM-PLAN.md) sec 6 for the SPEC-vs-IMPL reconciliation.
