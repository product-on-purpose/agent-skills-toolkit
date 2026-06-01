# How to build samples and eval sets

Give a skill its evidence layer with `askit-build-samples`.

## Generate (create)

Invoke `askit-build-samples` (create mode) on a skill. It writes `examples/` (at least 3 golden input/output pairs + at least 1 anti-example, sec 7.2) and `evals/<name>.eval.json` (a triggering set of at least 20 `{query, should_trigger}` cases, sec 8.3, plus `{given, expect}` behavior cases for any chain the skill is in). The eval-set format is the same one the G3 `library-regression` check reads, so generating chain cases is what makes that check find coverage.

## Validate (drift check)

Invoke `askit-build-samples` (validate mode) to re-run the samples and evals against the skill's current behavior. A golden whose output changed, an anti-example that now fires, or an eval whose expectation no longer holds is reported as an error - stale evidence is worse than none.

## Judge behavior (opt-in)

Deterministic presence + regression is gated by `library-regression`; to actually judge the cases (fire/no-fire, output quality), run `askit-evaluate` in behavioral mode (it delegates to `askit-quality-grader`). That pass is advisory evidence, never a CI gate result.

## See also

- [`askit-build-samples` reference](../reference/askit-build-samples.md)
- [samples-format](../../skills/askit-build-samples/references/samples-format.md)
- [add-eval-coverage](add-eval-coverage.md)
