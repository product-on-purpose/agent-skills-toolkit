# Release checklist

> The committed, one-to-one mirror of the automated release-readiness gate (ADR 0022). An agent or maintainer cuts a release by following this; CI enforces every item so nothing here depends on anyone remembering it. `askit-release` performs the doing; the gate proves it.

## How releases work here

A public `0.x` tag ships at every wave boundary (RELEASE-PLAN v0.2 Section 5); `v1.0.0` is the Gold capstone. Each tag is a real, gate-green release. The release-readiness gate (`scripts/release-ready.mjs`, landed in v1.14.0; `scripts/checks/` is reserved for Standard spine checks) is a hard precondition: a release cannot be tagged until it passes.

## Checklist (each item is a gated check, not a reminder)

- [ ] **Version consistent** across `library.json`, `package.json`, the git tag, and the CHANGELOG section. (version-equality check, Wave A.)
- [ ] **CHANGELOG** has a dated section for this version (the `[Unreleased]` content promoted), Keep a Changelog format.
- [ ] **RELEASE-NOTES.md** has a curated, user-facing entry for this version, distinct from the CHANGELOG (sec 10.6 / G5).
- [ ] **README "Status"** matches the declared tier + version (drift = error).
- [ ] **INDEX.md + native manifests** regenerated and drift-free; no hand-edits (G4).
- [ ] **Architecture docs** (`docs/explanation/architecture-overview.md` + `architecture-detailed.md`) present and current.
- [ ] **Decisions** recorded: any decision made this release is an ADR carrying its `## TL;DR` (ADR 0021 convention).
- [ ] **Docs site** builds cleanly (Astro Starlight) and the Diataxis quadrants are non-empty.
- [ ] **All tier-applicable conformance checks green** (`node scripts/check.mjs`).
- [ ] **No em-dashes / en-dashes** in committed text (author-time hook; house style, retired as a gate check in Standard v0.11).
- [ ] **`npm run release-ready` exits 0.** One command, five release-blocking gates: the conformance gate, the
  README drift guard, the release-count guard, `vendor-watch`, and `action-pin-watch`. **It runs automatically in `release.yml` on
  the pushed tag and in `publish-npm.yml` on the candidate tree**, so ticking this box locally is a convenience,
  not the enforcement - which is the point. Until review wave 2 of v1.14.0 these were four checklist lines a
  human ticked, and the vendor-watch line in particular had never been run by any workflow.

  Every vendor claim this repository asserts as fact - `U14`'s refused-field sentence, `U15`'s discovery
  behaviour, sec 3.2's commands-into-skills premise, ADR 0051's namespacing condition - is pinned in
  [`vendor-claims.json`](vendor-watch/vendor-claims.json) and re-checked against the live page by that run.
  **Exit 1 means a claim is gone or stale; exit 2 is a REFUSAL (a page could not be read) and is never a pass.**
  **Freshness is scoped to what age can actually prove.** A QUOTE is re-confirmed against the live page on
  every run, so it never blocks while it holds; if nobody has READ that page in 30 days the run says so and
  carries on, because the watch checks the sentence and only a person checks whether the section around it
  still means the same thing. A PROBE has no page to check, so its age IS the verification and past 30 days it
  blocks until someone re-runs the reproduction.

  The earlier design blocked on a stale quote too, which was a release-blocker with a calendar date on it:
  every quote's recorded reading would have aged out on 2026-09-14 and no tag could have been cut from that
  morning, while every run kept proving the sentences were still there. Its only remedy was hand-editing the
  dates - the thing the next sentence forbids. Caught before the v1.14.0 tag.

  Do not re-pin a claim to make the run green - decide what the change means for
  each dependant first, and a Standard revision needs an ADR with a migration window.

  **The one override, and its limit.** `--allow-vendor-unreachable "<reason>"` excuses exit 2 only, on the two
  gates that declare it overridable (`vendor-watch` and `action-pin-watch`), because somebody else's outage is
  not a fact about this repository and a release with no remedy for their downtime is a trap. It does **not**
  excuse exit 1 on any gate and no reason string makes it: for `vendor-watch` exit 1 means a claim is gone or
  stale, and for `action-pin-watch` it means a pin's label disagrees with what its ref resolves to. Overriding
  either publishes the falsehood the gate exists to catch. If you use it, put the reason in the release notes.

  **`action-pin-watch` also reports a pin that is merely BEHIND its action's current release, and that never
  blocks** (ADR 0053). A wrong label is a defect in this repository; a behind pin is news about somebody else's
  release cadence, and a gate that fires on an upstream release would stop a tag here for a fact that is only
  worth knowing.

  This line exists because on 2026-08-15 a ratified ADR (0048) was found to rest on a premise the vendor's own
  docs contradict, five days after an internal audit had already found it, because nothing was re-reading the page.
- [ ] **Codex round-trip** run manually for this tag (Q-E gate): `CODEX_REQUIRED=1 npm test`; record the result in the release notes.
- [ ] **npm publish**, for any release that changes shipped code. The gate is a published package (`agent-skills-toolkit` on npm) as of v1.11.0, and until v1.12.0 this checklist did not mention it at all - so a release could be tagged, GitHub-released and marketplace re-pinned while npm consumers silently stayed on the previous version.

  **Publishing is fully automated and uses no stored credential.** Dispatch `publish-npm.yml` with the tag and `dry_run: false`. It re-runs the suite and the gate from the trust root, proves the tag is an ancestor of `main`, and publishes via **npm trusted publishing (OIDC)**: the runner mints a short-lived identity token that npm verifies against a publisher registered once on npmjs.com. Provenance attestations are generated automatically; `--provenance` is deliberately not passed and its absence is not an omission.

  **Do a `dry_run: true` pass first.** It exercises every step except the publish itself.

  **The one-time setup, if it is ever lost or the package moves:** npmjs.com, package Settings, Trusted Publisher, GitHub Actions, bound to organization `product-on-purpose`, repository `agent-skills-toolkit`, workflow `publish-npm.yml`, environment `npm-publish`. Bind the environment, not just the repository, or any workflow in the repository could publish.

  **There is no token fallback, on purpose.** npm is restricting 2FA-bypassing tokens for direct publishing, and a fallback that silently succeeds by a different mechanism is how a release gets published without the provenance everyone assumes it has. An unregistered publisher fails loudly with an auth error instead.

  Verify from the consumer position afterwards - install from the live registry into a clean directory outside this repository and grade a plugin with `npx` - because a published manifest is a claim until someone installs it.
- [ ] **`npm run release-counts`** green. Runs the suite and fails on any test count in the newest `CHANGELOG.md` section, in `docs/internal/STATUS.md`, or in the current release packet that disagrees with what the suite actually reports. Compares totals and failures only, never pass counts, because the argv coverage skips its platform-specific halves on opposite platforms. **Write volatile counts LAST**, after the final suite run, then run this. It exists because v1.10.1 got this wrong four times in a single release: the changelog published `647` when the truth was `667`, `STATUS.md` carried the pre-release `613`, and the release packet claimed `673` against `682` one paragraph after saying it had been rebaselined. Three of those were corrected by hand and the defect recurred anyway. Skill count and spine size are separately checked by `scripts/check-readme-version.mjs`, which runs inside `npm test`.

## One-command release (target)

`node scripts/release.mjs <version>` (or the `askit-release` skill) promotes the CHANGELOG, curates RELEASE-NOTES, regenerates INDEX + manifests, refreshes the README status, computes the version by the deterministic `max(component bump)` rule (sec 7.4), runs the release-readiness gate, and stops with an actionable message on any failure. Until that skill lands (Wave C), this checklist is run check-by-check via the individual scripts.

## Status of enforcement (incremental, per ADR 0022)

- **Wave A:** version-equality + CHANGELOG-section-presence checks live (the no-dashes check that was part of Wave A was retired in Standard v0.11; the dash preference is now the opt-in author-time hook).
- **Wave B+:** README-status drift + INDEX/manifest drift (exists) + ADR TL;DR-presence wired into the release gate.
- **Wave E:** RELEASE-NOTES + architecture-presence + docs-site build + docs-presence flip to error; `release-ready.mjs` becomes the full Advanced release gate.
