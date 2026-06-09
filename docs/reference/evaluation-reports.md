---
title: "Evaluation reports (--format, --report)"
description: "Render a plugin's evaluation as a designed HTML page or Markdown twin, in five report types, all over the one deterministic report object."
audience: engineer
level: intermediate
tags: [evaluate, report, html, markdown, migration, release, review, behavioral]
---

# Evaluation reports (`--format`, `--report`)

`scripts/evaluate.mjs` produces ONE structured report object over a plugin's conformance. Beside the terminal summary and `--json`, it can render that object as a designed, self-contained HTML page or a Markdown twin, so a result is consumable by a non-engineer (HTML) and a reviewer or agent (Markdown), never only in a terminal. MD, HTML, JSON, and terminal all derive from the same object, so they cannot diverge.

```
node scripts/evaluate.mjs <path> --format=html --out report.html
node scripts/evaluate.mjs <path> --format=md
```

The HTML is fully self-contained: inline CSS, one small inline script (TOC scroll-spy, copy-prompt buttons, print), no external assets and no web fonts, so it opens offline. It is a linear scroll with a left-docked sticky table of contents and a print / Save-PDF affordance; nothing is hidden behind tabs or accordions. The on-disk spine and the Standard version are read live at render time, never hard-coded.

## Formats (`--format`)

`--format=<text|json|md|html>` with optional `--out <file>`:

- **`text`** (default): the terminal summary.
- **`json`**: the raw report object (`--json` is an alias).
- **`md`**: a Markdown report for PR review and for agents.
- **`html`**: the self-contained designed page.

With `--out <file>` the report is written to the file and a `Wrote <file>` line goes to stderr; otherwise it prints to stdout. The process exit code always reflects the deterministic gate, never the chosen format, so rendering a report never masks a failing gate.

## Report types (`--report`)

`--report=<conformance|migration|release|review|behavioral>` selects which report object the format renders. All five reuse one renderer (the same 10-section information architecture), parameterized by report type. The first three are deterministic; the last two carry an advisory layer.

| Report | What it shows | Source |
|---|---|---|
| `conformance` (default) | the tier-compliance evaluation: verdict, evidence ledger, the climb, and a copy-paste fix per gap | `evaluate.mjs` |
| `migration` | a gap-by-tier plan: sections 06/07 become a staged ladder from the current tier to `--target-tier` (default `advanced`), one prompt per blocker | `migrate-report.mjs` |
| `release` | a release-readiness go / no-go: clean gate AND version-consistent manifests AND a `RELEASE-NOTES.md` present (mirrors the `release.yml` guard) | `release-report.mjs` |
| `review` | an advisory qualitative review beside the deterministic verdict | `askit-reviewer` (LLM), via `--advisory` |
| `behavioral` | advisory fire/no-fire and output-quality evidence beside the deterministic verdict | `askit-quality-grader` (LLM), via `--advisory` |

The conformance, migration, and release reports are pure decorators over the deterministic object: they add a typed block and never run a model or change the gate exit code. Example:

```
node scripts/evaluate.mjs <path> --report=migration --target-tier=advanced --format=html --out plan.html
node scripts/evaluate.mjs <path> --report=release --format=md
```

## The deterministic / advisory boundary

The conformance gate alone decides the tier (Design Principle 3 / ADR 0023). The review and behavioral reports add a layer that is judged by a model at runtime, so the renderer keeps it strictly beside the verdict, never on top of it:

- The graded verdict in the masthead and the evidence ledger is the gate's, and the advisory layer NEVER changes it or the gate exit code.
- The advisory content renders in a clearly-labeled block, and the methodology section is stamped with the generating model, effort, and date so a reader knows it is judgment, not a reproducible gate result.
- Review findings carry a `provenance` tag (objective / vendor-cited / house-preference), echoing the gate's own [provenance taxonomy](gate-config.md#provenance), so a reader knows which findings survive a re-run.

Because the advisory content is model-produced, it is supplied to the renderer rather than computed by it. The `askit-reviewer` and `askit-quality-grader` skills produce an advisory JSON block, and the CLI merges it onto the conformance object:

```
node scripts/evaluate.mjs <path> --report=review --advisory review.json --format=html --out review.html
```

where `review.json` is `{ "review": { "model", "effort", "date", "findings": [ { "area", "severity", "message", "file", "provenance" } ] }, "insights": [ ... ] }`, and a behavioral advisory file is `{ "behavioral": { "model", "effort", "date", "cases": [ { "kind", "id", "expected", "observed", "verdict", "evidence" } ], "summary": { "fired", "missed", "behaviorPass", "behaviorFail" } } }`.
