---
title: Architecture internals
description: Read the exact shapes of a check module, the tier registry, the load-plugin context, the generators, and the eval set when you are extending or debugging the validation spine
audience: engineer
level: advanced
doc-role: architecture-detailed
---

This page is for someone extending or debugging `scripts/` who wants detail that matches the source rather than a summary. It assumes you have read [the architecture overview](./architecture.md) first.

The **spine** is the 34 checks the toolkit ships, and this is the contributor-level walkthrough of how that spine is actually built. Coined terms like that one are defined in [the glossary](./glossary.md).

It covers six things:

- The literal shape of a check module.
- How the deterministic boundary is enforced by a test rather than by a convention.
- How a tier and its burndown are computed.
- What the loader hands every check.
- How the generators produce the native manifests and `INDEX.md`.
- How drift checks turn a hand-edit into an error.

By the end you should be able to read any check under `scripts/checks/` and write one of your own.

Everything here lives under `scripts/`. There are two entrypoints:

- `scripts/check.mjs` is the gate. Its exit code is load-bearing.
- `scripts/tier-report.mjs` reports the tier plus the burndown.

Both run the same checks. Only the framing differs.

## A check module's shape

A check is one small file that answers a single question about a plugin, such as "is there a valid `library.json` here". It hands back a list of the problems it found, and an empty list means the plugin passed that question.

That is worth stating plainly, because the gate has no other machinery. It is 34 of these files run in order, and the tier a plugin earns is decided by which of them came back empty. If you are adding a requirement to the Standard, a check module is the file you write, and the shape below is the whole contract you have to satisfy.

Concretely, a check is an ES module under `scripts/checks/` with exactly two exports: a `meta` object and a synchronous `check(ctx)` function. That contract is uniform across all 35 spine checks.

Here is `scripts/checks/library-json.mjs`, the `U1` manifest check, trimmed to its shape:

```js
import { finding, SEVERITY } from "../lib/findings.mjs";

export const meta = { id: "library-json", tier: "universal", reqId: "U1" };

export function check(ctx) {
  const out = [];
  // ... inspect ctx, push finding(...) objects ...
  return out;
}
```

The `meta` fields:

- `id` - a stable string name for the check (used in finding output and tests).
- `tier` - the check's own tier (`universal` | `convergent` | `advanced`), used in burndown grouping and the declared-tier ceiling.
- `reqId` - the Standard requirement the check backs (`U1`-`U9`, `U11`-`U18`, `S1`-`S8`, `G1`-`G10`). This is the single thread that ties a line of code to a clause in `STANDARD.md`.

The `check(ctx)` function MUST be synchronous and MUST return an array of `finding` objects (an empty array means "passes"). A `finding` is built by the helper in `scripts/lib/findings.mjs`:

```js
finding(check, severity, message, { file, reqId })
```

`severity` is `"error"` or `"warn"`. The helper throws on anything else, so a typo cannot produce an unclassified result. `file` and `reqId` are optional metadata, and by convention every finding carries its check's `reqId` so the report can group by requirement.

The severity split is the gate's behavioral contract. An `error` can fail the gate. A `warn` is surfaced but never blocks (Standard sec 4.5). `manifest-drift` (`U8`) and `description-score` (`U5`) emit warnings for exactly that reason: their judgments should inform without hard-gating.

Checks are fail-safe by design. They read from the already-loaded context described in the next section, not from the filesystem at check time.

A few checks are deliberate exceptions and read auxiliary files directly. `library-regression` reads `evals/` and the chain contract. `self-hosting` reads `.github/workflows/`.

When a check does read a file, it wraps the read so a missing or malformed file becomes a finding rather than a thrown exception. A thrown exception in one check would abort the whole gate. That is why the pattern is "catch and report" rather than "let it throw."

## The deterministic / no-model boundary

The gate never asks a language model anything. Given the same files it returns the same findings, on your machine and in CI, today and in a year.

This is the most important invariant in the system, because it is what lets a tier mean anything to a third party. A grade that depended on a model's judgment could not be reproduced by the person you showed it to, and could not be defended when they disputed it.

The rule itself is narrow and absolute: no check may call a model. That is not left to reviewer discipline. It is enforced by a test, `tests/unit/registry-sync.test.mjs`:

```js
test("every registered check returns an array synchronously (deterministic gate)", () => {
  const ctx = loadPlugin(REPO_ROOT);
  for (const m of CHECKS) {
    const r = m.check(ctx);
    assert.ok(Array.isArray(r), `check ${m.meta?.id} must return an array synchronously`);
  }
  assert.ok(Array.isArray(runAllChecks(ctx)));
});
```

A check that called a model would return a `Promise` rather than an array, and this assertion would fail. The same is true of any async work. Because the test runs in CI, a future check that crosses the line cannot reach a green build.

That makes a design principle mechanical. The gate is a portable, reproducible function of files on disk: the same input always yields the same findings, locally or in CI (Standard sec 4.4).

Judgment-based evaluation does exist, but it lives somewhere else. It is `askit-evaluate`'s behavioral and review modes, backed by the `askit-quality-grader` subagent. It sits beside the gate as opt-in evidence and never decides a pass or fail. The synchronous-array test is the wall between the two.

## The check registry

The registry is the single place that knows which checks exist. Nothing scans `scripts/checks/` looking for modules, so a check file that is not listed in the registry simply does not run.

That is deliberate. Turning a check on becomes a visible, reviewable edit rather than a side effect of creating a file, and the size of the spine is something you can read off one array instead of counting files.

`scripts/lib/registry.mjs` holds that list. It imports each module namespace, assembles them into a `CHECKS` array, then exposes `runAllChecks(ctx)`:

```js
export const CHECKS = [
  libraryJson, anatomy, frontmatterValid, nameMatchesDir,
  descriptionScore, referenceLinks, instructionBudget, manifestDrift,
  agentTargets, prefix, componentsIndex, componentsMirror, chainContract,
  commandContract, workflowSkills, perTargetPresence,
  versionMatch, mcpValid,
  libraryRegression, deprecation,
  hookDocumentation, selfHosting, releaseNotes, indexDrift,
  // ... abridged; see scripts/lib/registry.mjs for the full ordered 35-check list
];

export function runAllChecks(ctx) {
  return CHECKS.flatMap((m) => m.check(ctx));
}
```

Adding a check is two edits. Write the module under `scripts/checks/`, then register it here. `registry-sync.test.mjs` then validates that the new module satisfies the synchronous-array contract.

The registry order is the order findings appear in output. It has no effect on pass or fail, because every check runs and the results are flattened.

## The tier registry and the burndown

Tiers and requirement-to-tier mapping live in `scripts/lib/tier.mjs`. It is deliberately tiny:

```js
export const TIER_ORDER = ["universal", "convergent", "advanced"];

export function tierForReq(reqId) {
  if (!reqId) return "universal";
  if (reqId.startsWith("U")) return "universal";
  if (reqId.startsWith("S")) return "convergent";
  return "advanced"; // G-prefix (and anything else) maps to advanced
}

export function ceilingIndex(declared) {
  const i = TIER_ORDER.indexOf(declared);
  return i >= 0 ? i : TIER_ORDER.length - 1;
}
```

`tierForReq` maps a finding's `reqId` to a tier by its letter prefix, so a Gold check's `G3` finding is an `advanced` blocker.

`ceilingIndex` resolves the plugin's *declared* tier, read from `library.json`, to an index. An absent or unknown tier means there is no ceiling, so everything is checked.

The burndown is computed in `scripts/tier-report.mjs` by `computeTierReport(root, ctx, findings)`:

1. Bucket every `error` finding into `errorsByTier` keyed by `tierForReq(f.reqId)`. Warnings are ignored here - they never block a tier.
2. Walk `TIER_ORDER` from `universal` upward, but only as far as the declared-tier ceiling. A tier is *satisfied* iff its error bucket is empty; the walk stops at the first tier with errors.
3. The achieved `tier` is the last satisfied tier (or `"none"`).
4. `blocked` is `{ <next tier>: [ "<reqId>: <message>", ... ] }` - the actionable list of exactly what stands between the plugin and the next rung.

This is why the report is a worklist rather than a grade. The `blocked` array is a to-do list keyed to requirement IDs, which is exactly the machine form the Standard specifies (sec 2.4).

The human one-liner comes from `humanLine(r)`. It reads `Tier: Advanced (no blockers detected)`, or `Tier: Silver (Gold blocked: 1 issue)`.

### The declared-tier ceiling

The gate's exit code is not "any error fails." It is "any error at or below the declared tier fails." `scripts/check.mjs` implements this in `gateExitFromFindings`:

```js
export function gateExitFromFindings(findings, declaredTier) {
  const ceiling = ceilingIndex(declaredTier);
  const gatedErrors = findings.filter(
    (f) => f.severity === "error" && TIER_ORDER.indexOf(tierForReq(f.reqId)) <= ceiling
  );
  return { errorCount: gatedErrors.length, exitCode: gatedErrors.length > 0 ? 1 : 0 };
}
```

This is what makes the tiers a genuine climb.

A plugin that declares `tier: convergent` is *not* failed by a `G3` Gold error. It sees that error as a Gold burndown item in the tier report, and its gate stays green because the Silver-and-below errors are clean. A plugin that declares `tier: advanced`, as this repository does, gates on everything.

`scripts/evaluate.mjs` reuses the same `gateExitFromFindings`, so the `askit-evaluate` CLI and the gate CLI agree on pass/fail to the byte.

### The Standard ceiling, and why checks stopped knowing their own history

These are two different questions, and each has its own ceiling.

- The **declared-tier ceiling** answers: does this finding gate THIS plugin.
- The **Standard ceiling** answers: does this finding apply at the Standard this plugin PINNED.

Since Standard 0.13 there is exactly one Standard ceiling. `scripts/lib/standard-ceiling.mjs` computes it, and `resolveFindings` applies it **last**.

The inversion underneath is the part worth reading twice. **A check now emits its TARGET severity, always, and the ceiling lowers it per pin.**

Checks used to encode their own migration state instead. A check emitted `warn` while a tightening was pending, then `error` once it landed. That quietly made scheduled tightenings impossible.

Here is the case that proved it. `chain-contract.mjs` emitted `warn` on both string-derived branches under a `warn` cap. Lifting the cap therefore still produced a warning, because **removing a ceiling cannot promote anything.** A graduation scheduled that way was incapable of firing, and one had been sitting scheduled.

Two inputs produce that one ceiling.

- `since` governs an INTRODUCTION. A check that did not exist at the pinned Standard cannot fail a plugin that adopted an earlier one.
- `migration.until` governs a TIGHTENING. It is a rule whose severity rises at a named version.

They are separate questions and they produce a single cap. The two are compared **by rank, never lexically**, because `min("error", "warn")` is `"error"` in string order and would invert the whole mechanism.

The ceiling is a ceiling and never a floor. A severity already at or below a cap is left as resolved, so `off` and suppression still win.

It is also recorded only when it BINDS. A version condition that changes no outcome is not debt, and recording it anyway would print a due date for a finding that was never held.

### The published-verdict trust step

`resolveFindings` runs four ordered steps: the profile, then per-rule override and suppression, then the trust step, then the ceiling.

The trust step exists because a report published ABOUT a subject cannot be configured BY that subject. In `published-verdict` mode it re-resolves each finding with every subject-owned setting absent, and it **raises only**. So a subject being stricter about itself survives, and a subject-owned reduction of an objective or vendor-cited finding does not.

Suppression is cleared **independently of severity**, and that is not a detail. A gate needs `error` AND `not suppressed`. A step that restored severity alone would still publish green behind a subject-owned waiver.

This deliberately REVERSES a guarantee the resolver used to make, which was that enabling the mode could never flip a passing gate to failing. It now can.

[ADR 0044 (one Standard ceiling, and the deliberate published-verdict reversal)](../internal/decisions/0044-one-post-resolution-standard-ceiling-and-config-provenance.md) records that as a decision rather than as a consequence. A guarantee that protects the subject is the wrong guarantee in the one mode built to publish a verdict about the subject. Local mode is untouched, and a subject's own config remains authoritative about its own repository.

## The load-plugin context (`ctx`)

`scripts/lib/load-plugin.mjs` reads the plugin once and hands every check the same immutable `ctx`. A check never re-reads what the loader already parsed. The returned object:

- `ctx.root` - the absolute plugin root.
- `ctx.library` - `{ path, data, parseError }` for `library.json` (the authored source of truth). `data` is `null` on a missing or malformed manifest; `parseError` carries the JSON error message. This is why `U1` can report "missing" and "not valid JSON" distinctly.
- `ctx.skills` - an array of `SkillInfo`, one per `skills/<name>/`, each `{ name, dir, skillMdPath, raw, frontmatter, body, parseError }`. `name` is the directory basename (so the `name`-equals-directory check is just a frontmatter-vs-basename comparison). A read failure becomes `parseError` rather than a throw.
- `ctx.subagents` - parallel `SubagentInfo` array from `agents/<name>.md`.
- `ctx.commands` - parallel `CommandInfo` array from `commands/<name>.md`.
- `ctx.claudeManifest` / `ctx.codexManifest` - the parsed native manifests (`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`) or `null`. These are the *generated* artifacts; drift checks compare them against `library.json`.
- `ctx.mcpServers` - the portable `.mcp.json` flattened to a list of `{ name, def }`, plus `ctx.mcpPath`, `ctx.mcpParseError`, and `ctx.mcpMalformed` so `mcp-valid` (`U11`) can fail closed on a present-but-malformed file.
- `ctx.agentsMdPath` - the path to root `AGENTS.md` when present, else `null`.

Frontmatter parsing runs once in the loader, via `scripts/lib/frontmatter.mjs`. The YAML parser it uses is the toolkit's single runtime dependency.

For the common case, the loader is the only place that touches component files. That keeps the checks pure, and it makes the whole run a single pass over the tree.

## The generators and the drift checks

Three artifacts are generated, never hand-authored, from the canonical `library.json` plus on-disk component frontmatter. The generators live in `scripts/generators/`; each exports a pure `render*(ctx)` function and has a small CLI wrapper.

`scripts/generators/gen-manifest.mjs` produces three files:

- `.claude-plugin/plugin.json` is the Claude native manifest, rendered by `renderClaudeNativeManifest`. It carries the shared spine sourced from `library.json`: name, version, description, license, author, homepage, repository and keywords. When an MCP config is present, it also carries an `mcpServers` pointer to `./.mcp.json`.
- `.codex-plugin/plugin.json` is the Codex native manifest, rendered by `renderCodexNativeManifest`. It carries the same spine, plus a `skills: "./skills/"` pointer and an `interface` block of `displayName` and `category` derived from `library.json`. That skills pointer is load-bearing: it is how Codex actually ingests the bundled skills.
- `manifest.generated.json` is the resolved agent index, rendered by `renderManifest`. It carries name, version, tier and standard, plus expanded skill and command entries of name, path and description. When present, it also carries an MCP server summary.

Run it with `node scripts/generators/gen-manifest.mjs . --write --target=all` (the `all` target requires `--write` because it writes multiple files).

`scripts/generators/gen-index.mjs` produces `INDEX.md`, the human navigation map: a name-sorted, click-through list of skills, subagents, and commands rendered from `library.json` and component frontmatter, with a generated banner that tells a reader to edit the source, not the file. Descriptions are whitespace-collapsed to one line so a multi-line frontmatter description renders as a stable single bullet (which keeps the drift comparison from flapping).

The generators do not enforce anything on their own. Two checks close the loop and make a hand-edit an error:

- **`U8` manifest-drift** (`scripts/checks/manifest-drift.mjs`) compares each native manifest's `name` and `version` against `library.json`. A mismatch is a `warn` (it surfaces drift without hard-gating) and the message hands back the exact regenerate command.
- **`G4` index-drift** (`scripts/checks/index-drift.mjs`) re-renders `INDEX.md` in memory via `renderIndex(ctx)` and compares it to the file on disk, normalizing line endings and trailing whitespace first. A mismatch is an `error` at Gold, and so is a missing `INDEX.md`. Because the check imports the generator and renders fresh, the on-disk file is correct only if it equals what the generator would produce right now. There is no way to hand-edit `INDEX.md` and stay green at Gold. The only fix is to edit the source and regenerate.

This is the dual-representation rule from the Standard (sec 10.3) made executable. Structured facts live in exactly one canonical place, which is `library.json` plus component frontmatter. Every other view is generated. Drift between the two is a CI failure rather than a slow rot.

The manifest entries are mirrored against frontmatter as well.

- `S3` components-index checks that the `library.json` index and the on-disk skills agree in both directions.
- `S8` components-mirror checks that an entry's `status` and `tier` equal the component's `metadata.status` and `metadata.tier`, whenever the frontmatter declares them.

That second one is what stops a frontmatter-only deprecation slipping past the `G6` deprecation contract.

## The eval set format and `G3` library-regression

Gold requires that every chain edge and every hook carry at least one eval or regression case that CI executes, so changing one component cannot silently break a chained consumer or a hook (Standard sec 2.6 G3). The format is one JSON file per set under `evals/`, named `*.eval.json`. The shape (see `templates/eval-set.json`):

```json
{
  "covers": { "chain": ["caller-component", "callee-component"] },
  "description": "one line: the chained behavior this eval set exercises",
  "cases": [ { "given": "...", "expect": "..." } ]
}
```

The `covers` object is the contract. It declares exactly one of:

- `"chain": ["caller", "callee"]` - a `[caller, callee]` pair of strings naming a permitted chain edge.
- `"hook": "<event>"` - a hook event name registered in `hooks/hooks.json`.
- `"skill": "<name>"` - a triggering eval set (a Universal SHOULD per sec 8.3; present but not gated by the `G3` baseline).

`scripts/checks/library-regression.mjs` (`G3`) reads three sources and cross-checks them:

1. The chain edges from `agents/_chain-permitted.yaml` (parsed into `[caller, callee]` pairs).
2. The hook events that have at least one registered hook in `hooks/hooks.json`.
3. Every `evals/*.eval.json` set.

It then enforces coverage in both directions.

Going one way, every permitted chain edge and every registered hook event MUST be covered by some eval set. If one is not, the gate fails with a "no eval/regression case" error naming exactly what to add.

Going the other way catches a *stale* case. An eval that `covers` a chain the contract no longer permits, or a hook that is no longer registered, is the regression signal itself: a component or an edge changed, and a consumer's eval now dangles.

Malformed eval JSON is always reported, whether or not a contract or hooks exist, so eval hygiene is never silently suppressed by an absent contract.

Like all Gold checks, `G3` respects the declared-tier ceiling. A plugin that declares universal or convergent sees these as a Gold burndown item rather than as a gate failure.

The baseline `G3` requires *presence and execution* of cases, not a particular judging engine. The multi-tier eval engine (static, LLM-judge, Monte-Carlo) is roadmap; the structural coverage check is what ships and gates.

## The Codex round-trip

Cross-agent emission is only credible if the emitted Codex manifest actually loads in Codex. `tests/integration/codex-roundtrip.test.mjs` proves it end to end against the real `codex` CLI. The test:

1. Wraps the toolkit's emitted `.codex-plugin/plugin.json` in a throwaway local marketplace (`.agents/plugins/marketplace.json`) in a temp directory, alongside a probe skill.
2. `codex plugin marketplace add <path>`, then `codex plugin list --marketplace <name>` to confirm the plugin appears.
3. The critical assertion: **listing is not ingestion.** It runs `codex plugin add <plugin>@<marketplace>`, parses the install root from the output, and asserts `skills/probe/SKILL.md` exists under that install root. That file only resolves if the manifest's `skills` pointer is correct, so this verifies Codex genuinely ingested the skill rather than merely cataloging the plugin.
4. Cleans up the install and marketplace in a `finally` block.

The test skips gracefully when the `codex` CLI is not on `PATH`, unless `CODEX_REQUIRED=1` is set (in which case its absence is a failure). On Windows it sets `shell: true` so `spawnSync` can resolve the `.cmd` wrapper. This is the guard behind the claim that one canonical `library.json` emits a Codex manifest that actually works on Codex, not just one that validates against a schema.

## Where to go next

- [The architecture overview](./architecture.md) - the same system from one level up.
- [`STANDARD.md`](../../STANDARD.md) - the normative requirements each `reqId` backs.
- `scripts/lib/registry.mjs` - the canonical list of every check; start here to read or add one.
