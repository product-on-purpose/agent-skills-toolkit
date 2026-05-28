# evaluate report format

`node scripts/evaluate.mjs <path> --json` returns:

- `scope`: "plugin" | "component" | "unknown"
- `target`: the evaluated path
- `findings`: array of `{ check, severity, message, file, reqId }`
- `byRule`: findings grouped by requirement id (e.g. `U5`) or check id
- `tier`, `satisfies`, `blocked`: present for plugin scope only
- `summary`: `{ errors, warns }`

Severity `error` fails a gate; `warn` is surfaced but does not fail. A lone component has no manifest, so no tier is reported.
