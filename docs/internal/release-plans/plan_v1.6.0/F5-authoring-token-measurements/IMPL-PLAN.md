# F5 - authoring token measurements - implementation plan

> Supporting (CREATE-informing) effort; not in the v1.6.0 user-facing cut. Branch from `main`; run and measure a representative set of `askit-build-*` authorings; record them; move the dossier authoring rows to MEASURED; verify gate unchanged. One PR vs protected `main`, green.

## What F5 is (one paragraph)

The token dossier measures the deterministic core (0) and the advisory layer (33k-103k) but leaves authoring "not yet measured." F5 runs a representative sample of `askit-build-*` authorings across component sizes and model x effort cells, records them with `scope: authoring`, and replaces the dossier placeholder with real measured ranges. No code changes.

## Steps

Paths repo-relative to `E:\Projects\product-on-purpose\agent-skills-toolkit`.

### Step 1 - branch

```
git switch main && git pull
git switch -c f5-authoring-token-measurements
```

### Step 2 - run and measure (R-AUTH-1)

Run `askit-build-*` authorings spanning sizes and cells, recording tokens / wall-clock / revision rounds for each:
- bounded: e.g. `askit-build-settings` or `askit-build-hook` on a simple target;
- mid: `askit-build-skill` on a single skill;
- larger: `askit-build-mcp` or a multi-section `askit-build-skill`;
across at least two cells (e.g. Sonnet/medium and Opus/high), noting revision rounds (the dominant cost driver). Raw artifacts go under the gitignored `_local/audit/eval-runs/<date>/` like the advisory runs.

### Step 3 - record (R-AUTH-2)

Append rows to `docs/internal/eval-runs/eval-runs.md` with `scope: authoring`, the component built, model, effort, tokens, wall-clock, and an output pointer (reuse the F2 aggregator if it has landed; otherwise hand-add following the schema).

### Step 4 - move the dossier rows to MEASURED (R-AUTH-3)

Edit `docs/reference/token-usage-estimates.md`:
- replace the "The authoring ranges (`askit-build-*`) are not yet measured" note with a MEASURED range citing the F5 runs;
- give "How to estimate your run" item 3 (authoring) a concrete per-component budget (small/mid/large) and a ceiling;
- keep the deterministic 0 rows unchanged; keep the "re-measure when models change" caveat.

## Verification

| Command | Expected |
|---|---|
| `node scripts/check.mjs .` | Advanced 0/0, unchanged (no code touched). |
| `npm test` | green. |
| `git grep -n "not yet measured" docs/reference/token-usage-estimates.md` | no longer matches the authoring note (it is now MEASURED). |

## Adversarial review

4-lens (lightweight, this is measurement + docs): **fidelity** (the dossier numbers match the recorded runs; the deterministic rows stay at 0); **honesty** (ranges with a ceiling, not point estimates; the re-measure-when-models-change caveat stays); **contract** (no check or builder changed); **house rules** (no em/en dashes).

## The PR

- **Title:** `docs(reference): measure askit-build-* authoring token usage - fill the dossier's last unmeasured range`
- **Why:** the token dossier was honest that authoring was "not yet measured"; F5 measures it so a builder can budget.
- **Trailer:** `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Rollback / risk notes

- Measurement + a doc update; a revert restores the "not yet measured" note and strands nothing.
- No code or check is touched, so the gate and verdict are unaffected.
