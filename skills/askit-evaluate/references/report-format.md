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
