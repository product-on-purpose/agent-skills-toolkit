---
title: "Install and run via npm"
description: "Install the gate with npm or run it with a single npx command, in CI or locally, without a Claude Code or Codex checkout."
audience: engineer
level: beginner
---

# How to install and run via npm

Everything else in these docs assumes you already have the toolkit installed as a Claude Code or Codex plugin. This page is for the other case: you just want **the deterministic gate** - `node scripts/check.mjs`, `askit-evaluate`'s CLI twin, and the tier report - as an ordinary command-line tool or library, with no agent runtime involved at all. That is the one-minute experience this package exists for: point it at a plugin directory and get a tier back.

## Run it once, no install

```bash
npx agent-skills-toolkit /path/to/your-plugin
```

`npx` fetches the package, runs the gate against the path you gave it, and exits with the gate's own exit code: `0` if there is no gate-failing error at the plugin's declared tier, `1` if there is at least one. With no path, it grades the current directory.

## Install it

```bash
npm install --save-dev agent-skills-toolkit    # in a project that wants the gate in its own toolchain
npm install --global agent-skills-toolkit      # to get the `agent-skills-toolkit` command everywhere
```

Once installed, `agent-skills-toolkit <path>` behaves identically to the `npx` form above.

## The three subcommands

The package name is the toolkit, not any single tool, so the bin dispatches by subcommand. A bare path with no subcommand is shorthand for `check` - that is deliberate, since grading a plugin is the one-minute experience the whole package is built around.

```bash
agent-skills-toolkit [path]                    # the gate (default) - same as `check`
agent-skills-toolkit check [path] [--strict] [--mode <local|published-verdict>] [--profile <name>]
agent-skills-toolkit evaluate [path] [--format text|json|md|html] [--report conformance|migration|release]
agent-skills-toolkit tier-report [path] [--json]
agent-skills-toolkit --help
agent-skills-toolkit --version
```

`evaluate` is the structured report behind `askit-evaluate`: the same conformance data as `check`, plus `--format md` / `--format html` for a written report, and `--report migration` / `--report release` for the decorated variants. `tier-report` prints just the tier-earned-plus-burndown, which is the smaller payload a script wants when it only needs a pass/fail plus the next blocker, not the full finding list.

If your plugin directory happens to be named `check`, `evaluate`, or `tier-report`, pass an explicit subcommand first (for example `agent-skills-toolkit check ./evaluate`) so the argument is read as a path rather than mistaken for the subcommand of the same name.

There is deliberately no `askit` alias. `askit` is a real, unrelated package already on the npm registry; if this toolkit shipped a second bin under that name, `npx askit` on a machine with nothing of ours installed would fetch and run **their** code, and the resulting failure would look like a bug in this toolkit. One name, no shortcuts.

## Use it in CI

```yaml
- name: Grade this plugin against the Advanced Skill Library Standard
  run: npx agent-skills-toolkit .
```

The exit code is the whole contract: a red step means at least one gate-failing error at your plugin's declared tier. Point it at any directory that carries a `library.json` - your own repository, a submodule, or a path checked out in an earlier step.

## Use it as a library

The gate, the evaluator, and the tier report are also importable, for a script that wants the structured result rather than the CLI's text output:

```js
import { runGate } from "agent-skills-toolkit";
import { evaluate } from "agent-skills-toolkit/evaluate";
import { computeTierReport } from "agent-skills-toolkit/tier-report";

const gate = runGate("/path/to/your-plugin");
console.log(gate.exitCode, gate.errorCount, gate.warnCount);
```

This is intentionally a small surface - the three CLI entry points, not every internal helper under `scripts/lib/`. Treat it as the stable import path; anything not exported here is an internal implementation detail that can change between minor versions.

## What is in the package, and what is not

`agent-skills-toolkit` on npm ships exactly what the gate needs to run standalone: the CLI (`bin/`), the check registry and every check module, the shared library those checks import, and `STANDARD.md` itself. It does **not** ship:

- **`docs/reference/`** and the rest of the Diataxis tree. These describe the `askit-*` skills and subagents that ship with the Claude Code / Codex plugin, none of which are part of this npm package - shipping their reference pages here would document components you do not have. Read them on the [published docs site](https://product-on-purpose.github.io/agent-skills-toolkit/) instead; `STANDARD.md` (which **is** in the package) is the authoritative single-file reference for every check.
- **The maintainer-only tooling**, because it is scoped to this repository's own tree and is not meant to run from inside someone else's install:
  - `scripts/eval-run.mjs` and its aggregator (`scripts/lib/eval-run-aggregate.mjs`) - the pinned-corpus eval-run pipeline this repository uses to grade its own reference corpus.
  - `scripts/lib/advisory-score.mjs` - the precision/recall harness for advisory (LLM-judge) findings, whose default scoring key is a path into this repository's own `tests/fixtures/`.
  - `scripts/standards-watch.mjs` (and its library half) - checks whether the pinned upstream agentskills.io spec has moved; a maintainer concern for this repository's own Standard pin, not a consumer's plugin.
  - `skills/`, `agents/`, `commands/`, `templates/`, `evals/`, `site/`, and `tests/` - the Claude Code / Codex plugin itself, its docs site, and its test fixtures. None of it runs standalone; it is installed as a plugin (see the repository README), not via npm.

If you want the full toolkit - the `askit-build-*` authoring skills, the subagents, the eval-run pipeline - install it as a Claude Code or Codex plugin from the `product-on-purpose` marketplace instead; see the repository README's Install section.

## See also

- [Troubleshoot the gate](troubleshoot-the-gate.md) - map a failing `reqId` to its cause and fix.
- [`STANDARD.md`](../../STANDARD.md) - the normative Standard every check enforces.
- [Cut a release](cut-a-release.md) - the maintainer-side release process this package's own version follows.
