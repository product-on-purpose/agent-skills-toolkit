# evaluate report format

`node scripts/evaluate.mjs <path> --json` returns:

- `scope`: "plugin" | "component" | "unknown"
- `target`: the evaluated path
- `findings`: array of `{ check, severity, message, file, reqId }`
- `byRule`: findings grouped by requirement id (e.g. `U5`) or check id
- `tier`, `satisfies`, `blocked`: present for plugin scope only
- `summary`: `{ errors, warns }`

Severity `error` fails a gate; `warn` is surfaced but does not fail. A lone component has no manifest, so no tier is reported.

## Designed report formats (--format)

`node scripts/evaluate.mjs <path> --format=<text|json|md|html> [--out <file>]` renders the SAME report object four ways, so the terminal, JSON, Markdown, and HTML never diverge:

- `text` (default): the terminal summary (`formatReport`).
- `json`: the raw object (`--json` is an alias for `--format=json`).
- `md`: a Markdown report for PR review and for agents to read.
- `html`: a self-contained HTML page for a non-engineer (inline CSS, one small inline script for the TOC scroll-spy, the copy-prompt buttons, and print; no external assets, no web fonts).

With `--out <file>` the report is written to the file and a `Wrote <file>` line is printed to stderr; without it the report goes to stdout. The process exit code always reflects the deterministic gate, never the chosen format, so rendering a report never masks a failing gate.

The HTML and Markdown share one 10-section information architecture: (01) masthead and verdict, (02) executive summary, (03) what was evaluated, (04) methodology and scope, (05) tier-compliance evidence ledger, (06) the climb and burndown, (07) improvement path with copy-paste prompts, (08) insights, (09) evidence and sources, (10) report metadata. The HTML is a linear scroll with a left-docked sticky table of contents and a print affordance; nothing is hidden behind tabs or accordions. The spine and the Standard version are read from the live registry and `library.json` at render time, never hard-coded.

The renderer (`scripts/lib/report-render.mjs`) is a pure projection over the deterministic conformance object: it adds no finding, runs no model, and never changes the tier or the gate exit code. Sample templates that show the target visual language live under `docs/internal/template/`.

## Report types (--report)

`node scripts/evaluate.mjs <path> --report=<conformance|migration|release> [--target-tier=<tier>]` selects which report object the chosen format renders. All three reuse the one renderer (the same information architecture), parameterized by report type:

- `conformance` (default): the tier-compliance evaluation above.
- `migration`: a gap-by-tier assessment. Sections 06 and 07 become a staged plan from the current tier to `--target-tier` (default `advanced`), one copy-paste prompt per blocker. Built by `scripts/lib/migrate-report.mjs`.
- `release`: a release-readiness assessment with a deterministic go / no-go (go only when the gate is clean, the version-bearing manifests agree, and a RELEASE-NOTES.md is present, mirroring the `release.yml` guard). Built by `scripts/lib/release-report.mjs`.

Each report is a pure decorator over the conformance object: it adds a typed `migration` or `release` block, never a model judgment, and never changes the gate exit code. Combine with `--format` and `--out`, for example `--report=migration --target-tier=advanced --format=html --out plan.html`.

## Advisory report types (review, behavioral)

`--report=review` and `--report=behavioral` render the two ADVISORY reports. Unlike conformance/migration/release (deterministic decorators over the gate), their content is produced by an LLM layer at runtime (`askit-reviewer` and `askit-quality-grader`) and supplied to the renderer via a file:

```
node scripts/evaluate.mjs <path> --report=review --advisory <file.json> --format=html --out review.html
```

`--advisory <file.json>` carries the advisory block the skill produced: `{ "review": { model, effort, date, findings: [...] }, "insights": [...] }` for review, or `{ "behavioral": { model, effort, date, cases: [...], summary } }` for behavioral. The renderer merges it onto the conformance object.

The renderer holds the advisory layer to the linter-vs-judge discipline (Design Principle 3 / ADR 0023):

- The deterministic conformance grade in the masthead and ledger is the gate's; the advisory layer NEVER changes it or the gate exit code.
- The advisory content renders in a clearly-labeled block ("Review (advisory)" / "Behavioral evidence (advisory)"), and the methodology section carries a provenance stamp naming the generating model, effort, and date.
- Review findings carry a per-finding `provenance` (objective / vendor-cited / house-preference) so a reader knows which survive a re-run; behavioral cases carry a fire/no-fire and an output-quality verdict.

A review or behavioral report therefore shows the same deterministic verdict as a conformance report, with a stamped advisory layer beside it, never on top of it. The public reference is [`docs/reference/evaluation-reports.md`](../../../docs/reference/evaluation-reports.md).
