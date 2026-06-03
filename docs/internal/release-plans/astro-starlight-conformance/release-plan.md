# Astro Starlight conformance - release plan

> **For agentic workers:** this is the executable checklist for `spec.md` in this directory.
> The executing session OWNS and UPDATES this file, ticking each box as its acceptance check
> passes. Keep the conformance gate (`node scripts/check.mjs`) and the unit suite (`npm test`)
> green between steps. House rule: no em-dashes or en-dashes anywhere (use " - " or restructure).

**Goal:** close clauses 14.2 (mermaid branding), 14.6/14.8 (node-version-file + v5 actions), and
14.11 (link/route guards) on the `site/` Astro Starlight docs site.

**Branch:** `astro-starlight-conformance`. Do NOT push or merge without maintainer confirmation.

**Tech stack:** Astro 6 + Starlight ~0.39 + astro-mermaid ~2.0; GitHub Actions (Pages artifact
flow); zero-dependency Node `.mjs` guards; `node --test` for unit tests.

**Status:** implementation complete, reviewed, and verified (build + 211 tests + gate all green);
awaiting the maintainer handoff. The adversarial review drove four guard/CI fixes and surfaced one
in-scope addition beyond the original packet: a family favicon (see Task 5 note and Task 8).

---

## Task 0: Plan artifacts

- [x] Create `docs/internal/release-plans/astro-starlight-conformance/spec.md`.
- [x] Create `docs/internal/release-plans/astro-starlight-conformance/release-plan.md` (this file).
- [x] Write ADR `docs/internal/decisions/0026-astro-site-14.11-conformance.md` (Proposed).

## Task 1: Modernize the deploy toolchain (14.6 / 14.8)

**Files:** `.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`.

- [x] In `ci.yml`: `actions/checkout@v4 -> @v5` (both jobs); `actions/setup-node@v4 -> @v5`
      (both jobs); replace `node-version: "24"` with `node-version-file: .nvmrc` in the `validate`
      and `build-site` jobs.
- [x] In `deploy-pages.yml`: same `checkout`/`setup-node` bumps and `node-version-file: .nvmrc`
      in the `build` job. Left `upload-pages-artifact@v5` + `deploy-pages@v5` as-is.
- [x] Acceptance: no `node-version:` literal remains; `node-version-file: .nvmrc` present in all
      three `setup-node` steps (verified by grep).

## Task 2: Brand the mermaid theme (14.2)

**Files:** `site/astro.config.mjs`.

- [x] Added `mermaidConfig.themeVariables` to the `mermaid()` call: `lineColor: '#5C7CFA'`, a
      system-ui font stack, `fontSize: '14px'` (mirroring the pm-skills reference).
- [x] Acceptance: `cd site && npm run build` succeeds.

## Task 3: Add the rendered-link guard (14.11a)

**Files:** `site/scripts/check-rendered-links.mjs`; `tests/unit/rendered-links-guard.test.mjs`.

- [x] Ported the donor guard (zero-dep). `BASE = '/agent-skills-toolkit'`; default `dist` resolves
      relative to the script location (cwd-independent). Robustness contract preserved (empty-dist
      hard-fail, defensive `decodeURIComponent`, fail on own assertions, single+double-quoted ids).
- [x] Test: clean fixture passes; broken internal link fails; host-root (missing base) fails;
      empty dist hard-fails; missing dist fails; anchors advisory by default and strict under
      `STRICT_ANCHORS=1`; a malformed percent-escape does not crash the guard; a broken bare-relative
      link on a deep page fails; a resolving bare-relative link passes; a broken single-quoted href
      fails. (10 cases, including the review-driven bare-relative and single-quote regressions.)
- [x] Acceptance: `node --test tests/unit/rendered-links-guard.test.mjs` green.

## Task 4: Add the route-parity guard + manifest (14.11b)

**Files:** `site/scripts/check-route-parity.mjs`, `site/scripts/route-manifest.txt`;
`tests/unit/route-parity-guard.test.mjs`.

- [x] Ported the donor guard (zero-dep). Defaults adapted to the `site/` layout; added an explicit
      empty-dist hard-fail. Fails only on removed routes (additions allowed), `--update`
      regenerates, presence-only scope documented in the header.
- [x] Test: parity passes on a match; fails on a removed route; allows an added route; empty dist
      hard-fails; missing baseline fails; `--update` regenerates. (6 cases.)
- [x] Acceptance: `node --test tests/unit/route-parity-guard.test.mjs` green.

## Task 5: Build, generate the manifest, verify the guards on real dist

- [x] `cd site && npm run build` (green; 7 pages).
- [x] Generated the baseline (`--update`); committed `site/scripts/route-manifest.txt` (7 routes).
- [x] `STRICT_ANCHORS=1 node scripts/check-rendered-links.mjs` -> green.
- [x] `node scripts/check-route-parity.mjs` -> green (7/7).

> **Guard finding (favicon, 14.9):** the strict rendered-link check failed first with 7 broken
> links - Starlight emits `<link rel="icon" href="/agent-skills-toolkit/favicon.svg">` on every
> page, but no favicon was shipped, so the live site 404s its favicon. Fixed by adding the shared
> family favicon `site/public/favicon.svg` (the `#5C7CFA` three-diamond mark, reused verbatim from
> pm-skills, which ships the same file). This reverses the original plan's "skip the favicon"
> stance on principled grounds: omitting the file is a real broken link, not a clean absence.
> spec.md and ADR 0026 updated.

## Task 6: Wire the guards into CI (14.11, PR build)

**Files:** `.github/workflows/ci.yml` (the `build-site` job).

- [x] Added two steps after the build (each `if: always()`): the rendered-link check with
      `env: STRICT_ANCHORS: "1"` and the route-parity check, both against `dist` from the `site`
      working directory.
- [x] Acceptance: YAML well-formed; steps reference the committed guards and manifest.

## Task 7: Docs + status, then verify and commit

- [x] `CHANGELOG.md`: Unreleased entries (14.2 + 14.6/14.8 + 14.11 + favicon; ADR 0026).
- [x] `RELEASE-NOTES.md`: brief user-facing highlight (branded diagrams + link-integrity guard).
- [x] `STATUS.md`: test count 191/188 -> 208, date bumped, conformance note added.
- [x] Full verify: `npm run build` green; `npm test` = 211/211; `node scripts/check.mjs` = 0/0
      (incl. U10 no-dashes); `site/dist` gitignored (no tracked build output).
- [x] Commit in logical units on `astro-starlight-conformance`.

## Task 8: Review + handoff

- [x] Adversarial review pass (4 dimensions, blocker/major findings independently verified). Two
      confirmed findings drove fixes: the rendered-link guard silently skipped bare-relative hrefs
      (major, fixed + 3 regression tests); the favicon was untracked (blocker, resolved by staging
      it). Three quality fixes also applied: href quote-symmetry, defensive path decode, and CI
      build-outcome gating. Findings + learnings recorded in the rollout directory:
      `2026-06-02_astro-standard_agent-skills-toolkit_review-findings.md`.
- [x] Commit, summarize changes, and prepare the PR(s). Await maintainer confirmation before
      push/merge.
