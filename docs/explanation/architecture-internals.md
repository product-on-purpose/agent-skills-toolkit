---
title: Architecture internals
description: Read the exact shapes of a check module, the tier registry, the load-plugin context, the generators, and the eval set when you are extending or debugging the validation spine
audience: engineer
level: advanced
doc-role: architecture-detailed
---

This is the contributor-level walkthrough of how the validation spine is actually built: the literal shape of a check module, how the deterministic boundary is enforced by a test rather than a convention, how a tier and its burndown are computed, what the loader hands every check, how the generators produce the native manifests and `INDEX.md`, and how drift checks turn a hand-edit into an error. It assumes you have read [the architecture overview](./architecture.md) and want the source-accurate detail to extend or debug `scripts/`.

Everything here lives under `scripts/`. The two entrypoints are `scripts/check.mjs` (the gate, exit code is load-bearing) and `scripts/tier-report.mjs` (the tier plus burndown). Both run the same checks; only the framing differs.

## A check module's shape

A conformance check is a small ES module under `scripts/checks/` with exactly two exports: a `meta` object and a synchronous `check(ctx)` function. The contract is uniform across all 25 spine checks. Here is `scripts/checks/library-json.mjs` (the `U1` manifest check), trimmed to its shape:

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
- `reqId` - the Standard requirement the check backs (`U1`-`U12`, `S1`-`S8`, `G1`-`G10`). This is the single thread that ties a line of code to a clause in `STANDARD.md`.

The `check(ctx)` function MUST be synchronous and MUST return an array of `finding` objects (an empty array means "passes"). A `finding` is built by the helper in `scripts/lib/findings.mjs`:

```js
finding(check, severity, message, { file, reqId })
```

`severity` is `"error"` or `"warn"` (the helper throws on anything else, so a typo cannot produce an unclassified result). `file` and `reqId` are optional metadata. By convention every finding carries its check's `reqId` so the report can group by requirement. The severity split is the gate's behavioral contract: an `error` can fail the gate; a `warn` is surfaced but never blocks (Standard sec 4.5). For example, `manifest-drift` (`U8`) and `description-score` (`U5`) emit warnings precisely because their judgments should inform without hard-gating.

Checks are fail-safe by design. They read from the already-loaded context (next section), never from the filesystem at check time except for a few that read auxiliary files directly (for example `library-regression` reads `evals/` and the chain contract, `self-hosting` reads `.github/workflows/`). When a check reads a file it wraps the read so a missing or malformed file becomes a finding, not a thrown exception. A thrown exception in one check would abort the whole gate, which is why the pattern is "catch and report" rather than "let it throw."

## The deterministic / no-model boundary

The single most important architectural invariant is that the gate is deterministic: no check may call a model. This is not enforced by reviewer discipline alone - it is enforced by a test, `tests/unit/registry-sync.test.mjs`:

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

A check that called a model (or did any async work) would return a `Promise`, not an array, and this assertion would fail. Because the test runs in CI, a future check that crosses the line cannot reach a green build. This is the mechanical realization of the design principle that the gate is a portable, reproducible function of files on disk - the same input always yields the same findings, locally or in CI (Standard sec 4.4). Judgment-based evaluation exists, but it lives in a different place (`askit-evaluate`'s behavioral and review modes, backed by the `askit-quality-grader` subagent) and sits beside the gate as opt-in evidence; it never decides a pass or fail. The synchronous-array test is the wall between the two.

## The check registry

`scripts/lib/registry.mjs` is the ordered list of every check. It imports each module namespace and assembles them into a `CHECKS` array, then exposes `runAllChecks(ctx)`:

```js
export const CHECKS = [
  libraryJson, anatomy, frontmatterValid, nameMatchesDir,
  descriptionScore, referenceLinks, instructionBudget, manifestDrift,
  agentTargets, prefix, componentsIndex, componentsMirror, chainContract,
  commandContract, workflowSkills, perTargetPresence,
  versionMatch, noDashes, mcpValid,
  libraryRegression, deprecation,
  hookDocumentation, selfHosting, releaseNotes, indexDrift,
];

export function runAllChecks(ctx) {
  return CHECKS.flatMap((m) => m.check(ctx));
}
```

Adding a check is two edits: write the module under `scripts/checks/`, then register it here. `registry-sync.test.mjs` then validates the new module satisfies the synchronous-array contract. The registry order is the order findings appear in output; it has no effect on pass/fail (every check runs, results are flattened).

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

`tierForReq` maps a finding's `reqId` to a tier by its letter prefix, so a Gold check's `G3` finding is an `advanced` blocker. `ceilingIndex` resolves the plugin's *declared* tier (from `library.json`) to an index; an absent or unknown tier means "no ceiling" (check everything).

The burndown is computed in `scripts/tier-report.mjs` by `computeTierReport(root, ctx, findings)`:

1. Bucket every `error` finding into `errorsByTier` keyed by `tierForReq(f.reqId)`. Warnings are ignored here - they never block a tier.
2. Walk `TIER_ORDER` from `universal` upward, but only as far as the declared-tier ceiling. A tier is *satisfied* iff its error bucket is empty; the walk stops at the first tier with errors.
3. The achieved `tier` is the last satisfied tier (or `"none"`).
4. `blocked` is `{ <next tier>: [ "<reqId>: <message>", ... ] }` - the actionable list of exactly what stands between the plugin and the next rung.

This is why the report is a worklist, not a grade: the `blocked` array is the to-do list keyed to requirement IDs, exactly the machine form the Standard specifies (sec 2.4). The human one-liner comes from `humanLine(r)`, for example `Tier: Advanced (no blockers detected)` or `Tier: Silver (Gold blocked: 1 issue)`.

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

This is what makes the tiers a genuine climb. A plugin that declares `tier: convergent` is *not* failed by a `G3` Gold error - it sees that error as a Gold burndown item in the tier report, but its gate stays green because the Silver-and-below errors are clean. A plugin that declares `tier: advanced` (as this repository does) gates on everything. `scripts/evaluate.mjs` reuses the same `gateExitFromFindings`, so the `askit-evaluate` CLI and the gate CLI agree on pass/fail to the byte.

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

Frontmatter parsing runs once in the loader via `scripts/lib/frontmatter.mjs` (the YAML parser is the toolkit's single runtime dependency). The loader is the only place that touches component files for the common case, which keeps the checks pure and the whole run a single pass over the tree.

## The generators and the drift checks

Three artifacts are generated, never hand-authored, from the canonical `library.json` plus on-disk component frontmatter. The generators live in `scripts/generators/`; each exports a pure `render*(ctx)` function and has a small CLI wrapper.

`scripts/generators/gen-manifest.mjs` produces three files:

- `.claude-plugin/plugin.json` - the Claude native manifest (`renderClaudeNativeManifest`): the shared spine (name, version, description, license, author, homepage, repository, keywords) sourced from `library.json`, plus an `mcpServers` pointer to `./.mcp.json` when present.
- `.codex-plugin/plugin.json` - the Codex native manifest (`renderCodexNativeManifest`): the same spine plus a `skills: "./skills/"` pointer and an `interface` block (`displayName`, `category`) derived from `library.json`. The skills pointer is load-bearing - it is how Codex actually ingests the bundled skills.
- `manifest.generated.json` - the resolved agent index (`renderManifest`): name/version/tier/standard plus expanded skill and command entries (name, path, description) and, when present, an MCP server summary.

Run it with `node scripts/generators/gen-manifest.mjs . --write --target=all` (the `all` target requires `--write` because it writes multiple files).

`scripts/generators/gen-index.mjs` produces `INDEX.md`, the human navigation map: a name-sorted, click-through list of skills, subagents, and commands rendered from `library.json` and component frontmatter, with a generated banner that tells a reader to edit the source, not the file. Descriptions are whitespace-collapsed to one line so a multi-line frontmatter description renders as a stable single bullet (which keeps the drift comparison from flapping).

The generators do not enforce anything on their own. Two checks close the loop and make a hand-edit an error:

- **`U8` manifest-drift** (`scripts/checks/manifest-drift.mjs`) compares each native manifest's `name` and `version` against `library.json`. A mismatch is a `warn` (it surfaces drift without hard-gating) and the message hands back the exact regenerate command.
- **`G4` index-drift** (`scripts/checks/index-drift.mjs`) re-renders `INDEX.md` in memory via `renderIndex(ctx)` and compares it (line-ending- and trailing-whitespace-normalized) to the file on disk. A mismatch - or a missing `INDEX.md` - is an `error` at Gold. Because the check imports the generator and renders fresh, the on-disk file is correct iff it equals what the generator would produce right now. There is no way to hand-edit `INDEX.md` and stay green at Gold; the only fix is to edit the source and regenerate.

This is the dual-representation rule from the Standard (sec 10.3) made executable: structured facts live in exactly one canonical place (`library.json` plus frontmatter), every other view is generated, and drift between the two is a CI failure rather than a slow rot. The manifest entries are also mirrored against frontmatter: `S3` components-index checks that the `library.json` index and on-disk skills agree in both directions, and `S8` components-mirror checks that an entry's `status` and `tier` equal the component's `metadata.status` / `metadata.tier` when the frontmatter declares them - so a frontmatter-only deprecation cannot slip past the `G6` deprecation contract.

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

It then enforces coverage in both directions. Every permitted chain edge and every registered hook event MUST be covered by some eval set, or the gate fails with a "no eval/regression case" error naming exactly what to add. Conversely, an eval that `covers` a chain the contract no longer permits, or a hook that is no longer registered, is a *stale* case - this is the regression signal itself: a component or edge changed and a consumer's eval now dangles. Malformed eval JSON is always reported, independent of whether a contract or hooks exist, so eval hygiene is never silently suppressed by an absent contract. Like all Gold checks, `G3` respects the declared-tier ceiling: a plugin that declares universal or convergent sees these as a Gold burndown item, not a gate failure.

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
