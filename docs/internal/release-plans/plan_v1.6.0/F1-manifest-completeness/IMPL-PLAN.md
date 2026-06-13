# F1 - manifest-vs-disk skill-registration completeness (U13) - implementation plan

> Per-feature cadence (PROGRAM-PLAN release mechanics; ADR 0035): branch from `main`; add the new check module; resolve the registration source by precedence; compare against the on-disk skill set; emit `warn` findings (the 0.12 burndown); register `U13` after `U12`; sweep the spine count to 30 and the Standard to 0.12; add golden + anti fixtures and unit tests; verify gate Advanced 0/0; run a 4-lens adversarial review; squash-merge. One PR vs protected `main`, individually green.
>
> F1 is the headline of the v1.6.0 "manifest completeness + actionable reports" release. It is the **first Standard MINOR bump since 0.11** and the **first live exercise** of the warn-for-one-minor burndown v1.3.0's F1 built (`scripts/lib/standard-gate.mjs`). F1 stays synchronous and model-free (Design Principle 3 / ADR 0023): the check is a pure set comparison.

## What F1 is (one paragraph)

A skill on disk that a plugin never registered in its catalog is shipped-but-invisible (deanpeters: 49 on disk, 47 registered). F1 adds `U13` `skill-registration`: a new Universal check that resolves the plugin's authoritative skill-registration list (`library.json.components.skills[]`, else `.claude-plugin/marketplace.json` `plugins[].source`, else none) and compares it against the on-disk skill directories (`ctx.skills`). On-disk-but-unregistered is the headline finding; registered-but-missing-on-disk is the reverse. Per STANDARD.md sec 7.7 a new MINOR requirement ships as a `warn` for one Standard minor, so `U13` emits `SEVERITY.WARN` at 0.12 (gating nobody) and a later release flips it to `error` at 0.13. The toolkit registers all 23 of its skills, so its own gate is unchanged.

## Author-before-enforce micro-order

A new check whose introducing minor must be a `warn` (the burndown) is the cleanest possible "author then enforce": the check ships as a warn, so it cannot break any plugin on arrival, and the error graduation is a separate future PR. The micro-order that keeps `main` green at every commit:

1. **Add the check module emitting `warn`, unregistered.** A module that nothing imports is dead code; `npm test` stays green. Unit-test it in isolation against fixtures.
2. **Register `U13` in `registry.mjs` after `U12`.** Now it runs. Because it emits `warn`, no plugin's gate exit changes (warns never gate); the toolkit, being clean, sees not even a warn. `registry-sync`'s count assertion is updated to 30 in the same commit so the suite stays green.
3. **Sweep the Standard surfaces to 30 / 0.12** (STANDARD.md, the docs counts, the explanation tables). These are documentation; the gate behavior is already correct from step 2.
4. **Fixtures + tests.** Anti (under-registered, phantom, marketplace-under-registered), golden (auto-discovery, marketplace-complete), unit + registry-sync + profile.
5. **Verify** (gate Advanced 0/0, `npm test`, no version drift), adversarial review, squash-merge.

The toolkit's own gate is green at every step: step 1 is inert, step 2 adds only warns, and the toolkit is clean at `U13` anyway (23 registered == 23 on disk).

## Steps

Each step names the exact files. Paths are repo-relative to `E:\Projects\product-on-purpose\agent-skills-toolkit`.

### Step 1 - branch

```
git switch main && git pull
git switch -c f1-skill-registration
```

### Step 2 - the check module (emitting warn, unregistered)

Create `scripts/checks/skill-registration.mjs`:

```js
// what-it-is:   the skill-registration check (U13)
// what-it-does: compares the skills a plugin registers in its enumerating manifest (library.json
//               components, else .claude-plugin/marketplace.json plugins) against the skill dirs on
//               disk; on disk but unregistered is invisible to installers (a silent delivery failure),
//               registered but missing on disk is undeliverable
// why:          a well-formed catalog must enumerate every skill it ships - objective and portable, so
//               a Universal requirement. Distinct from U8 (generated-manifest-vs-library.json). ADR 0035.
// used-by:      registered in scripts/lib/registry.mjs; run by scripts/check.mjs and tier-report.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "skill-registration", tier: "universal", reqId: "U13", since: "0.12", provenance: "objective" };

// BURNDOWN (ADR 0035 + STANDARD.md sec 7.7): U13 is introduced at Standard 0.12, so it ships as a WARN
// for the 0.12 minor (surfaced, never gate-failing) and GRADUATES to SEVERITY.ERROR at Standard 0.13.
// Change the next line to SEVERITY.ERROR in the 0.13 release (the per-check-flip mechanism; the gate has
// no enforcedSince field). Do not gate on this before 0.13.
const U13_SEVERITY = SEVERITY.WARN;

/** The <name> segment of a skills/<name>/... path or ./skills/<name> source. Null if not under skills/. */
function skillNameFromPath(p) {
  if (typeof p !== "string") return null;
  const norm = p.replace(/^\.\//, "").split(/[\\/]/);
  const i = norm.indexOf("skills");
  return i >= 0 && norm[i + 1] ? norm[i + 1] : null;
}

/** Resolve the authoritative skill-registration set, or null if no manifest enumerates skills (R-REG-4). */
export function resolveRegistrationSource(ctx) {
  // Rung 1: library.json components.skills[]
  const libSkills = ctx?.library?.data?.components?.skills;
  if (Array.isArray(libSkills) && libSkills.length > 0) {
    const set = new Set(libSkills.map((s) => skillNameFromPath(s?.path) ?? s?.name).filter(Boolean));
    if (set.size > 0) return set;
  }
  // Rung 2: .claude-plugin/marketplace.json plugins[].source resolving under skills/
  try {
    const mp = JSON.parse(readFileSync(path.join(ctx.root, ".claude-plugin", "marketplace.json"), "utf8"));
    if (Array.isArray(mp?.plugins)) {
      const set = new Set(mp.plugins.map((p) => skillNameFromPath(p?.source)).filter(Boolean));
      if (set.size > 0) return set;
    }
  } catch { /* absent or malformed -> fall through (R-REG-5: never throw) */ }
  // Rung 3: no enumerating manifest
  return null;
}

export function check(ctx) {
  const registered = resolveRegistrationSource(ctx);
  if (registered === null) return [];                          // R-REG-4
  const onDisk = new Set((ctx.skills ?? []).map((s) => path.basename(s.dir)));
  const out = [];
  for (const name of onDisk) {                                  // R-REG-2 (headline)
    if (!registered.has(name)) {
      out.push(finding(meta.id, U13_SEVERITY,
        `skill "${name}" exists on disk (skills/${name}/) but is not registered in the plugin's manifest; ` +
        `it ships but is invisible to installers. Add it to library.json components.skills[] (or the marketplace plugins[] catalog).`,
        { file: `skills/${name}/SKILL.md`, reqId: "U13" }));
    }
  }
  for (const name of registered) {                             // R-REG-3 (phantom)
    if (!onDisk.has(name)) {
      out.push(finding(meta.id, U13_SEVERITY,
        `skill "${name}" is registered in the manifest but has no skills/${name}/ directory on disk; ` +
        `it is catalogued but cannot be delivered. Add the skill or remove the registration entry.`,
        { file: `skills/${name}/SKILL.md`, reqId: "U13" }));
    }
  }
  return out;
}
```

Decisions baked in (each an adversarial-review target in Step 6):
- **Key by directory name, not the declared `name` field** (SPEC sec 3): the comparison is about which folders are catalogued. A `name`-vs-dir disagreement is `U4`'s job.
- **Never throw on a malformed manifest** (R-REG-5): the marketplace read is `try`/`catch` to fall through; `library.json` validity is `U1`'s job.
- **Emit `warn`, isolated in one `const`** so the 0.13 graduation is a one-line flip with a comment that says exactly when and why.
- **Phantom detection is bidirectional and free** for both shapes here (both reduce to a name set), so R-REG-3 is built now, not deferred. (The SPEC permits a marketplace-phantom deferral; this IMPL does not need it.)

### Step 3 - register U13

Edit `scripts/lib/registry.mjs`: import the module and insert it in the ordered `CHECKS` array immediately after `mermaid-valid` (`U12`), before the `S1` block. The derived `REQ_IDS`, `SINCE_BY_REQ`, and provenance map pick it up automatically (they map over `CHECKS`). Confirm `SINCE_BY_REQ["U13"] === "0.12"` and the provenance map yields `U13 -> objective`.

### Step 4 - sweep the spine count to 30 and the Standard to 0.12

The count/version surfaces (the inverse of the ADR 0028 29-sweep). Update each:

| Surface | Change |
|---|---|
| `STANDARD.md` | add the `U13` requirement text in the Universal section (register every shipped skill; phantom registration is also a violation; ships `warn` at 0.12 -> `error` at 0.13 per sec 7.7); spine line `29 -> 30`; version `0.11 -> 0.12` (sec 2.6) |
| `library.json` | `standard: "0.11" -> "0.12"` (owned by the release PR, but the F1 PR may carry it since `U1` requires `standard` present and valid; coordinate per R-SEQ-1) |
| `tests/unit/registry-sync.test.mjs` | the count assertion `29 -> 30`; the reqId-set assertion adds `U13`; a `since`/provenance assertion for `U13` |
| `scripts/lib/report-meta.mjs` | **required for green CI** - add a `U13` `REPORT_META` entry (`why`, `fixPrompt`, `effort`); the `registry-coverage` test in `tests/unit/report-render.test.mjs` fails if a spine reqId has no row, so F1 cannot merge without it. Author the `why` as the reader-facing version of the check's docblock `why` (e.g. "A skill on disk that the manifest does not register ships but is invisible to installers; the catalog must list everything the library delivers."); `fixPrompt` points at adding the entry to `components.skills[]`; `effort` ~5 min. F4 then renders this row in its glossary and reference page. |
| `docs/explanation/conformance-and-tiers.md` | the Universal-tier table gains a `U13` row; any "29-check" prose `-> 30` |
| `docs/reference/universal-checks.md` | **new page (F4)** documents `U13` among `U1-U13`; F1 supplies the `U13` entry, F4 owns the page scaffold |
| `README.md`, `AGENTS.md` | any "29-check spine" prose `-> 30` |
| `scripts/tier-report.mjs` | any header text asserting a count (grep; most counts are computed, not literal) |

Run `git grep -nE "29-check|29 checks|29 deterministic"` after editing and confirm only historical surfaces (CHANGELOG, prior ADRs, RELEASE-HISTORY, session logs) remain.

### Step 5 - fixtures + tests

Fixtures under `tests/fixtures/` (each a minimal but valid plugin/skill shape; they live in the self-scan's `SKIP_DIRS` scope):

1. `tests/fixtures/anti/under-registered/` - `library.json` with `components.skills[]` registering 2 of 3 on-disk skill dirs. (R-REG-2)
2. `tests/fixtures/anti/phantom-registration/` - `library.json` registering `skills/ghost/SKILL.md` that does not exist on disk. (R-REG-3)
3. `tests/fixtures/golden/auto-discovery-plugin/` - 2 skill dirs, a `.claude-plugin/plugin.json` enumerating none, no `library.json`, no `marketplace.json`. (R-REG-4)
4. `tests/fixtures/golden/marketplace-complete/` - a `.claude-plugin/marketplace.json` whose `plugins[].source` set equals the on-disk skills (the deanpeters shape, complete).
5. `tests/fixtures/anti/marketplace-under-registered/` - same shape registering fewer than on disk (the synthetic deanpeters reproduction; the test does not depend on the external clone).

Test file `tests/unit/skill-registration.test.mjs`:

1. `skillNameFromPath` extracts `<name>` from `skills/foo/SKILL.md`, `./skills/foo`, returns `null` for a non-skills path.
2. `resolveRegistrationSource` rung 1 - returns the library.json component name set.
3. `resolveRegistrationSource` rung 2 - returns the marketplace source name set when no library.json components.
4. `resolveRegistrationSource` rung 3 - returns `null` for the auto-discovery fixture (R-REG-4).
5. `resolveRegistrationSource` never throws on a malformed marketplace.json (write a temp fixture with broken JSON; assert it falls through to `null` or the next rung).
6. `check` headline - 1 finding naming the unregistered skill on the under-registered fixture; severity `warn`; message names `library.json`. (R-REG-2/6)
7. `check` phantom - 1 finding on the phantom fixture; message distinguishes the class. (R-REG-3)
8. `check` clean - `[]` on `marketplace-complete` and on the repo root (R-DOGFOOD-1).
9. `check` marketplace under-registration - reports the missing skills on the synthetic fixture.
10. `check` purity - two calls on the same ctx return deep-equal arrays; no `await`, no model import. (R-REG-5)

Extend `tests/unit/registry-sync.test.mjs`:

11. spine count is **30**; reqId set is `U1-U9`, `U11-U13`, `S1-S8`, `G1-G10`; `U13` has `since:"0.12"`, `provenance:"objective"`.

Extend the profile suite (wherever `plain-plugin` is tested):

12. `U13` is active under `--profile plain-plugin` (R-REG-7): grade the `marketplace-under-registered` fixture with `plain-plugin` and assert the `U13` warns are present (not dropped as a house check).

Integration (extend `check-runner` / `evaluate` suite):

13. `runGate(under-registered)` exits `0` (the `U13` findings are warns, so they do not gate); `warnCount >= 1`. (R-REG-6)
14. `runGate(REPO_ROOT)` is Advanced, exit 0, no `U13` finding. (R-DOGFOOD-1)

### Step 6 - regenerate only if needed

F1 adds no component to `library.json` (the check is toolkit code, not a shipped skill) and no `INDEX.md` source. Run the generators defensively and confirm no diff except the intended count/version edits:

```
node scripts/generators/gen-manifest.mjs . --write --target=all
node scripts/generators/gen-index.mjs . --write
git checkout -- .claude-plugin .codex-plugin INDEX.md manifest.generated.json   # discard CRLF-only churn (MEMORY gotcha)
git diff --name-only
```

Expected: no generator-driven content change beyond the `standard`/`version` propagation the release PR owns. If `manifest.generated.json` changes unexpectedly, investigate before committing.

## The Standard bump (and why F1 does carry it)

Unlike v1.3.0's F1 (pure plumbing, no requirement change, stayed at 0.11), this F1 **adds a tier requirement**, so it **does** move the Standard: `0.11 -> 0.12`. The bump is owned by the v1.6.0 version-bump PR (after F1 + F4 merge), but the `STANDARD.md` requirement text and spine-line edit ship in the F1 PR (the normative description of the check it adds). The `library.json.standard` field move to `0.12` is coordinated with the release PR; if `U1` requires it consistent within the F1 PR, carry it there and let the release PR own only `version`. The burndown means the 0.12 introduction is a `warn`, so nothing gate-fails on the bump.

## The burndown window (exercised for the first time)

ADR 0027 prescribed warn-for-one-MINOR before a new requirement becomes an error, and v1.3.0's F1 built the machinery but ran no live burndown ("F1 ships the MACHINERY but does NOT itself introduce any new requirement"). `U13` is the first live customer:

- **v1.6.0 / Standard 0.12:** `U13` emits `SEVERITY.WARN`. Every plugin (including deanpeters) sees the finding as `[warn]`; none gate-fail. The toolkit, being clean, sees nothing. `applyStandardDowngrade` is a no-op on `U13` here (it only downgrades errors; a warn is already a warn).
- **A future release / Standard 0.13:** the `U13_SEVERITY` const flips to `SEVERITY.ERROR`; `meta.since` stays `"0.12"`. Now a plugin pinning 0.12 or above gates on an unregistered skill; a plugin pinning 0.11 or below sees it downgraded back to `warn` via `applyStandardDowngrade` (since `0.12 > 0.11`). The per-consumer courtesy is automatic.

So F1 delivers the warn-state and the policy text; the 0.13 graduation is a recorded future PR (SPEC sec 8, out of scope for v1.6.0).

## Verification

| Command | Expected |
|---|---|
| `node scripts/check.mjs` | `Advanced`, `0 error(s), 0 warning(s)`; exit 0; no `U13` line (the toolkit registers all 23 skills). |
| `node scripts/check.mjs tests/fixtures/anti/under-registered` | exit 0; one `[warn] skill-registration (U13)` line naming the unregistered skill. |
| `node scripts/check.mjs E:/tmp/eval-deanpeters-pm --profile plain-plugin` | exit per other findings; two `[warn] (U13)` lines naming the 2 unregistered skills (forward slashes on Windows - a backslash path silently grades an empty dir). |
| `npm test` | All green incl. `skill-registration.test.mjs`, the extended `registry-sync` (30), the profile and integration cases. |
| `node scripts/evaluate.mjs tests/fixtures/anti/under-registered --json` | a `U13` finding with `severity:"warn"`, `provenance:"objective"`; `summary.errors` unaffected by it. |
| `git grep -nE "29-check\|29 checks"` | only historical surfaces (CHANGELOG, prior ADRs, RELEASE-HISTORY, session logs). |
| `git grep -n '"standard"' library.json` | `"standard": "0.12"`. |
| `git diff --name-only` | only the new check module, `registry.mjs`, `STANDARD.md`, the count-bearing docs, `library.json`, the new fixtures + tests. |

## Adversarial review

Run a 4-lens read-only review before merge (PROGRAM-PLAN release mechanics; Codex `/codex:review` is unreliable on this Windows setup per MEMORY, the MCP fallback works). Lenses:

- **Soundness (false PASS / over-lenient).** Can a plugin shipping an invisible skill escape the check? Confirm: the auto-discovery rung (`null`) is reached ONLY when neither a library.json components array nor a marketplace plugins array enumerates a skill (not when one is merely empty-but-present in a way that should count); confirm a plugin cannot dodge the check by emptying `components.skills` to `[]` while keeping skills on disk (rung 1 requires `length > 0`, so `[]` falls through to rung 2 then `null` - is that the right call, or should an explicitly-empty components array with on-disk skills be a finding? Decide and test: recommended - an empty components array on a `library.json` plugin SHOULD report the on-disk skills as unregistered, since the author opted into enumeration; tighten rung 1 to "library.json present with a components key" rather than "non-empty skills array").
- **Soundness (false FAIL / over-strict).** Does the auto-discovery plugin, or any complete plugin, see a spurious finding? Re-run the golden fixtures and the repo root; confirm `[]`. Confirm a skill dir without a `SKILL.md` (a stray folder) is not counted as a skill (it is not in `ctx.skills`).
- **Determinism / sync.** Confirm `check`, `resolveRegistrationSource`, `skillNameFromPath` are synchronous, pure, return arrays/scalars (no Promise, no model). The `registry-sync` "every check returns an array synchronously" test passes for the new module. Confirm the marketplace read is the only I/O and is `try`/`catch`ed.
- **Contract / spec fidelity.** Confirm the spine is 30 with the exact reqId set; `meta.since === "0.12"`, `provenance === "objective"`; the severity is `warn` (the burndown), isolated in one const with the graduation comment; `STANDARD.md` text matches ADR 0035; no em-dash / en-dash in any touched file; the `U13` page entry and the `conformance-and-tiers.md` row agree with the module's `why:` line.

Fix every confirmed finding before merge; record the review in this packet.

> **Open soundness call for the maintainer (surfaced by lens 1):** should a `library.json` plugin with an explicitly EMPTY `components.skills: []` but skills on disk be flagged (the author opted into enumeration and registered nothing) or treated as auto-discovery (`null`, no finding)? Recommended: **flag it** (tighten rung 1 to "a `library.json` with a `components` object present, even if `skills` is empty/absent, is an enumerating manifest"). This closes the only obvious evasion. The IMPL ships the recommended tightening; flag it in the PR for ratification.

## The PR

- **Title (Conventional Commit):** `feat(checks): skill-registration (U13) - manifest-vs-disk completeness, warn at Standard 0.12 (ADR 0035)`
- **Body outline:**
  - **What:** a new Universal check `U13` `skill-registration` comparing the plugin's registration list (library.json components, else marketplace.json plugins) against the on-disk skill dirs; on-disk-but-unregistered (invisible skills) and registered-but-missing (phantom) findings; the spine moves 29 -> 30 and the Standard 0.11 -> 0.12; the check ships as a `warn` (the first burndown exercise) graduating to `error` at 0.13.
  - **Why:** eval-run reading 12 - deanpeters ships 49 skills, registers 47, so two are invisible to installers. A well-formed catalog must enumerate what it ships; objective and portable, so a Universal requirement. Distinct from `U8` (generated-manifest-vs-library.json). ADR 0035.
  - **How it stays green:** the check emits `warn` (gates nobody in 0.12); the toolkit registers all 23 skills, so it is clean; the bump is cushioned by the burndown and, after 0.13, by the pinned-version downgrade.
  - **Scope guard:** one new check (spine 30), Standard 0.12, no existing check changed, no new component; the 0.13 graduation is a recorded future PR.
  - **Verification:** gate Advanced 0/0; the deanpeters target shows exactly its 2 unregistered skills as warns; `npm test` green; the 4-lens review ran; the empty-`components` soundness call is flagged for ratification.
  - **Trailer:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Commit / PR sequence (within the v1.6.0 program)

1. **F1 PR** (this plan) -> gate + CI green -> 4-lens adversarial review -> admin squash-merge. `main` stays at version 1.5.2 until the release PR.
2. **F4 PR** (per-check glossary + `universal-checks.md` + responsive pass; separate packet) -> same discipline -> squash-merge. F4's `universal-checks.md` page documents `U13`; F4's glossary renders the `U13` `why:` line.
3. **v1.6.0 version-bump PR** (after F1 + F4): bump `library.json`/`package.json` `version` to `1.6.0` and `library.json.standard` to `0.12` (if not already carried in F1); regenerate manifests + INDEX (discard CRLF churn); update `CHANGELOG` + `RELEASE-NOTES` + `STATUS` + `RELEASE-HISTORY`. Gate Advanced 0/0 on the 30-check spine.
4. **Tag `v1.6.0`** -> `release.yml` mints the release behind the version-consistency guard -> re-pin the `product-on-purpose/agent-plugins` marketplace entry (new sha + version, registry `metadata` minor bump, now 1.22.0 -> 1.23.0; use an isolated worktree clone) -> install smoke-verify.

## Rollback / risk notes

- **Independent PR.** If `U13` proves unsound after merge (a false positive on some plugin shape), revert the single F1 PR; the gate returns to the 29-check spine and the bump is undone. Because `U13` ships as a `warn`, even an unreverted false positive gates nothing in 0.12 - the blast radius is a spurious warning, not a broken build.
- **Pre-release safety.** F1 merges into `main` before the v1.6.0 tag; nothing is published until the release PR. A revert before the tag is clean.
- **The Standard bump.** The 0.11 -> 0.12 move is the visible contract change; it is cushioned by the burndown (warn-first) and, post-0.13, by `applyStandardDowngrade` for older pins. The only plugin whose grade can ever change because of `U13` is one that ships invisible skills, which is the intended catch.
- **Coupling with F4.** F1 and F4 are the v1.6.0 cut but are not code-coupled: F1 adds the check, F4 documents and explains it. If F4 slips, F1 can ship alone (the `universal-checks.md` page is then F4's to backfill); the release should not cut without F4's `U13` documentation, since shipping a new graded requirement with no reference page is the rubric gap F4 exists to close.
