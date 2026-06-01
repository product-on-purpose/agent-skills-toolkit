# How to add eval coverage (G3)

Give each chain and hook an eval case so the plugin clears the Gold G3 baseline (Standard sec 2.6, sec 8.3).

## Find what is uncovered

Run `node scripts/check.mjs` (or `node scripts/evaluate.mjs <plugin> --json`). A plugin that declares `advanced` fails on each uncovered chain or hook; one that declares `universal`/`convergent` sees the same items in `tier-report` under `blocked.advanced` - the burndown to Gold. Each finding names the edge or event and the file to add.

## Add a chain eval

For each `<caller> -> <callee>` edge in `agents/_chain-permitted.yaml`, add an `evals/<name>.eval.json` (copy `templates/eval-set.json`):

```json
{
  "covers": { "chain": ["<caller>", "<callee>"] },
  "description": "One line: the chained behavior this exercises.",
  "cases": [
    { "given": "the input", "expect": "what the chain should produce" }
  ]
}
```

## Add a hook eval

For each event with a hook in `hooks/hooks.json`, add an eval with `"covers": { "hook": "<event>" }`.

## Keep evals honest (the regression signal)

If you remove or rename a component, the chain edge its eval covers disappears from the contract and the eval becomes stale - G3 flags it. Update or delete the stale eval, or restore the chain. That flag is the point: it catches a change that would otherwise silently break a chained consumer.

## See also

- [`gold-checks` reference](../reference/gold-checks.md)
- [climb-from-bronze-to-silver](climb-from-bronze-to-silver.md)
