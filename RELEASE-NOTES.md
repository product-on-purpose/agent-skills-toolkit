# Release notes

Curated, user-facing highlights. For the full technical history see [`CHANGELOG.md`](CHANGELOG.md).

## 1.5.2 - 2026-06-12

The eval-run patch. Every change in this release came out of pointing the toolkit's own evaluation layer at real third-party skills and plugins, recording what each run taught us, and fixing what was verified against ground truth. Nothing changes for a plugin graded the default way: the spine stays **29 checks**, the Standard stays **v0.11**, and the toolkit still self-grades Gold.

### What changed

- **The description scorer (U5) grades descriptions, not vocabulary.** Measured on five real corpora, strong skill descriptions were piling up cosmetic warnings because the scorer only recognized its own 12-verb word list. Recalibrated against the recorded corpus: warnings drop 98 to 18, and the survivors are the intended catch (descriptions with no real trigger clause). Unfinished placeholder descriptions ("TODO: ...") now score low instead of high.
- **Grading a single skill under `--profile plain-plugin` actually works now.** The flag was accepted and then silently ignored in component scope, so a third-party skill was still held to the askit house conventions. It is now resolved exactly like plugin scope, the report records the active profile, and a file-scoped waiver in a skill-level `askit.config.json` is honored end to end (including the exit code).
- **What an evaluation costs is now measured, not estimated.** The token-usage dossier carries eleven measured advisory runs (roughly 33k-103k tokens each, driven by target size more than model tier) and the honest model-tier lesson from running three models on the same target: a budget model's "verified" is not verification.
- **Report tables scroll instead of crushing on narrow screens**, and the AI-review delegates' documentation now matches how they really run (including the documented fallback for targets that ship no eval-set - which today is all of them).

### Upgrade

Already installed? Update from the marketplace as usual. Expect fewer U5 warnings on well-written descriptions, and `--profile` to behave on single-skill targets; pass/fail verdicts do not move.

## 1.5.1 - 2026-06-10

A calibration patch from a second round of grading real third-party plugins. The gate was pointed at the official Anthropic plugin set and four community marketplaces, and a handful of cases where it flagged well-built plugins on authoring convention rather than real defects were fixed. Nothing changes for a plugin graded the default way: the spine stays **29 checks** and the Standard stays **v0.11**, and the toolkit still self-grades Gold.

### What changed

- **Grading a third-party plugin is quieter and more honest.** Four calibrations remove systematic false positives when you grade a plugin you do not own: a name used as a display label or a namespaced command is no longer double-flagged, a managed connector is a warning rather than a blocking error, and a link or a Mermaid diagram shown as an example (inside code, a template slot, or an HTML comment) is no longer treated as a live, broken reference. Real defects - a genuinely dangling link, a malformed live diagram, a name that should match its directory under the strict ladder - still fail.
- **A new token-usage dossier.** A reference page (`docs/reference/token-usage-estimates.md`) explains what an evaluation costs in tokens. The short version: the grade and the rendered report are **free** (the gate runs no model), and only the optional AI review and authoring use a model, where your choice of model and effort trades off against advice quality without ever changing the grade.
- **A verified competitive comparison.** A public page and a primary-source-verified research corpus position the toolkit against other skill and plugin builders and validators.

### Upgrade

Already installed? Update from the marketplace as usual. Nothing breaks: a plugin graded the default way scores exactly as before, and the new grading behavior applies under the opt-in `--profile plain-plugin`.

## 1.5.0 - 2026-06-09

The outward-grading release. The toolkit's gate was built to grade other people's plugins, but pointed at a real third-party plugin it buried the genuine defects under its own house scaffolding. This release fixes that, so you can grade a plugin you do not own and get a short, credible list of real issues. No requirement changes: the spine stays **29 checks** and the Standard stays **v0.11**, and a plugin graded the default way scores exactly as before.

### What is new

- **Grade a third-party plugin in one flag.** `node scripts/check.mjs <path> --profile plain-plugin` (also on `evaluate.mjs`) grades a plugin you do not own on portable defects only, without writing a config file into its tree. Pointed at Anthropic's own skills library, the result drops from 23 findings to one (a real description over the spec cap) instead of a wall of "missing the askit scaffolding" noise.
- **The grader stops dinging house conventions as defects.** Two checks that fired on well-built official plugins on taste rather than correctness - requiring a root `AGENTS.md` (U2) and an automated description score (U5) - are reclassified as askit house conventions (ADR 0029). They still apply when you grade against the full askit ladder, but no longer count against a plain third-party plugin or a published verdict.

### Upgrade

Already installed? Update from the marketplace as usual. Nothing breaks: a plugin graded the default way scores exactly as before, and the new behavior is opt-in via `--profile`.

## 1.4.1 - 2026-06-09

A hardening patch over v1.4.0. A Codex adversarial review of the new report renderer surfaced three edge cases on the advisory and migration paths; all three are fixed. Nothing changes for normal use: same commands, same output, same verdict.

### What changed

- A malformed advisory file (one missing its findings or cases) now renders a clean report instead of erroring.
- The Markdown report escapes raw HTML from every part of an advisory (model name, finding text, insights, and summary), so an untrusted advisory file cannot inject markup into a `.md`.
- An unknown `--target-tier` is rejected with a clear error instead of silently producing an empty migration plan.

### Upgrade

Already installed? Update from the marketplace as usual. This is a pure hardening patch: no behavior change for valid input.

## 1.4.0 - 2026-06-09

The designed evaluation report. Until now an evaluation lived in a terminal or a JSON blob; now `agent-skills-toolkit` renders it as a polished, self-contained HTML page, or a Markdown twin for PR review, so you can hand a non-engineer a verdict they can read and act on. No requirement changes: the spine stays **29 checks** and the Standard stays **v0.11**.

### What is new

- **A designed report in one command.** `node scripts/evaluate.mjs <path> --format=html --out report.html` produces a self-contained, on-brand page: a verdict masthead, a status matrix, a per-requirement evidence ledger, exactly what blocks the next tier, and a copy-paste prompt to fix each gap. `--format=md` gives a Markdown twin. It opens offline, has a print / Save-PDF button, and hides nothing behind tabs.
- **Five report types, one renderer.** Beyond the conformance report, `--report=migration` renders a staged Bronze-to-Gold plan, `--report=release` a deterministic go / no-go readiness check, and `--report=review` / `--report=behavioral` render advisory (model-judged) layers beside the verdict. They all render from the one deterministic object, so the Markdown, HTML, JSON, and terminal never disagree.
- **The verdict stays the gate's.** The HTML and Markdown are presentation only: they add no judgment, and the advisory layers are clearly labeled and stamped with their model, never moving the grade. See `docs/reference/evaluation-reports.md`.

### Upgrade

Already installed? Update from the marketplace as usual. Nothing breaks: the terminal and `--json` output are unchanged, and the report formats are new opt-in flags.

## 1.3.0 - 2026-06-06

The gate-evolution release. The deterministic gate gets two upgrades that make it legitimate to point at other people's plugins: it now honors the Standard version a plugin pins, and it is configurable like a real linter. No new requirement is added, so the spine stays **29 checks** and the Standard stays **v0.11**, and a plugin with no config grades exactly as before.

### What is new

- **The gate honors your pinned Standard (ADR 0027).** Every check records the Standard version it was introduced at, and the gate reads `library.json.standard`. A plugin pinned to an older Standard is graded against the ruleset it actually adopted: a requirement added after your pinned version shows up as a `warn`, never a build-failing error, until you raise your pin. The Standard can now evolve without silently breaking downstream plugins.
- **Configure how the gate grades, without forking it.** An optional `askit.config.json` lets you turn a rule down or off, grade against a lighter `plain-plugin` profile (the portable, vendor-grounded checks only, instead of the full askit library ladder), or durably waive a known finding with a recorded reason. Every check is tagged by provenance, so the report separates "real issues" (objective defects and vendor-backed rules) from "profile conformance" (askit conventions you may not have opted into). See `docs/reference/gate-config.md`.
- **Tamper-proof published verdicts.** When the toolkit grades and publishes a verdict about someone else's plugin (`--mode published-verdict`), a subject cannot disable an objective check to dodge it: such a finding is surfaced as a warning with a notice, never silently dropped.

### Upgrade

Already installed? Update from the marketplace as usual. Nothing breaks: with no `askit.config.json` and a current pin, your gate result is identical to 1.2.0. The new behavior is opt-in (a config file) or only matters for older pins.

## 1.2.0 - 2026-06-06

A scope correction. The `U10` no-em-dash / no-en-dash check is retired from the conformance spine: it was a stylistic house preference with no portability or vendor basis (agentskills.io, Claude Code, and Codex impose no such rule), so grading other people's plugins against it was outside what a skill and plugin standard should decide. The spine is now **29 checks** (`U1-U9`, `U11-U12`, `S1-S8`, `G1-G10`) and the Standard moves to **v0.11**.

### What changed

- **`U10` (no-dashes) is gone from the gate.** Your plugin is no longer flagged for em-dashes or en-dashes. If you want a dash-free house style for yourself, the toolkit still ships an opt-in `PreToolUse` hook in `hooks/` you can adopt; it is no longer imposed on anything the gate grades.
- **Standard v0.11, a 29-check spine.** This is a relaxation: every plugin that passed before still passes, and nothing newly fails.
- **A refined report sample.** A Command Dashboard v2 evaluation-report template with cleaner typography and wrapping.

### Upgrade

Already installed? Update from the marketplace as usual; nothing breaks, and re-running the gate can only remove findings (the retired `U10`), never add them.

## 1.1.0 - 2026-06-03

The documentation-depth release. `agent-skills-toolkit` now grades a plugin's documentation as rigorously as its code, and the toolkit proves it on itself: a dual-audience Diataxis docs set, a generated docs site, folder-by-folder and file-by-file self-documentation, and **Standard v0.10**.

### What is new

- **Five new checks, a 30-check spine.** The deterministic gate grows from 25 to **30 checks** (`U1-U12` + `S1-S8` + `G1-G10`): `mermaid-valid` (Bronze - every diagram is structurally valid), and at Gold `docs-frontmatter`, `folder-readme` (every folder's README inventory matches its contents), `source-doc` (every source file carries a four-field header docblock), and `docs-presence` (the Diataxis quadrants are non-empty, every decision record has a TL;DR, and the architecture overview links its detail).
- **A real documentation site.** The Astro Starlight site is now a generated view of the repository's public docs, with a curated landing on top - so the docs you read on GitHub and the docs you browse on the web never drift apart.
- **The full Diataxis set.** Tutorials, how-to guides, reference, and explanation, each with a typed audience and level, plus a quickstart, glossary, FAQ, and troubleshooting.
- **A demonstrative hook.** The toolkit ships a portable `PreToolUse` no-dash guard, so the Gold "hooks are documented" check grades a real hook instead of passing on an empty surface.
- **Standard v0.10.** The Standard adds the five new requirements and pins the docs frontmatter taxonomy.

### Upgrade

Already installed? Update from the marketplace as usual; nothing in your plugin breaks. If you run the gate, note the spine is now 30 checks and a Gold plugin is expected to carry the documentation surface above (each new Gold check is conditional - it only binds once you have the thing it grades).

## 1.0.0 - 2026-06-02

The first Gold-tagged release, and the one that makes the toolkit **installable**. `agent-skills-toolkit` is now a plugin you can add from the `product-on-purpose` marketplace, and it self-validates at the Gold (Advanced) tier - it passes its own Bronze, Silver, and Gold checks (G1-G7) in CI, a self-proving example of the Standard it defines.

### Install

```bash
# Add the marketplace once (by repo path)
/plugin marketplace add product-on-purpose/agent-plugins

# Install the toolkit (by marketplace identity)
/plugin install agent-skills-toolkit@product-on-purpose
```

### What you can do

- **Start a plugin** from a single skill (`askit-build-skill`) or from scratch (`askit-init-plugin`), stand up a marketplace (`askit-init-marketplace`), or bring an existing skills repo to the Standard with a staged plan (`askit-migrate`).
- **Grow it** with every component type - subagents, slash commands, MCP servers, hooks, workflows, chain contracts, output styles, status lines, settings - through the `askit-build-*` authoring family, emitted in the right format for each agent.
- **Govern it** over its lifetime with `askit-backlog`, `askit-decision`, `askit-release`, `askit-deprecate`, and `askit-template-manager`.
- **Grade any plugin** against the Advanced Skill Library Standard and see the exact tier it earns with a burndown to the next: `node scripts/check.mjs`, or the `askit-evaluate` skill for a richer report.
- **Level up** by climbing Bronze to Silver to Gold; the tier report names exactly what blocks the next rung.

### Highlights

- The full v1 builder catalog: 23 skills plus 7 Claude-only delegate subagents and 2 commands.
- A 26-check deterministic validation spine (Bronze `U1-U11`, Silver `S1-S8`, Gold `G1-G7`) that runs in CI with no model in the loop, so the grade is trustworthy. Judgment-based evaluation sits beside the gate as opt-in evidence, never inside it.
- Genuinely cross-agent (Claude Code and Codex) from one canonical `library.json`, with the native per-agent manifests generated from it so the two never drift.
- A live documentation site with brand-colored diagrams and a CI link-integrity guard, so no browser-broken link or silently dropped page ever ships.
- Adopts the v0.9 Standard (runner Node baseline `>=22.12.0`) in `library.json`, and ships standardized release CI: a tag push mints this release behind a version-consistency guard.

This release repositions the README around the plugin lifecycle - start, grow, govern, and level up an advanced cross-agent plugin - and makes the tier model scannable. It carries forward everything since `v0.2.0`: the full catalog, the Gold self-conformance gate, and full Astro site conformance.
