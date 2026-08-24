---
title: "Probe reproductions - the experiments behind the claims no page states"
---

# Probe reproductions

Every claim in [`vendor-claims.json`](../../../../foundation/claims/vendor-claims.json) is one of two kinds, and they age completely
differently.

- A **`quote`** claim is a sentence that must still appear on a vendor's live page. `npm run vendor-watch`
  re-reads the page on every run, so a quote never goes stale silently and **never blocks while it holds**.
- A **`probe`** claim is an empirical behaviour that **no page states**. It was established by running
  something. There is no page to re-read, so **its age IS the verification** - and past
  `FRESHNESS_DAYS` (30, in [`scripts/lib/vendor-watch.mjs`](../../../../scripts/lib/vendor-watch.mjs)) the
  gate blocks every release until a human runs the experiment again.

**This folder exists because the reproduction used to be one sentence in a JSON field.** That is enough to
remember what was done and not enough to do it again in five minutes, which is what a task recurring every
thirty days actually needs. The fixtures here are the experiment, ready to install.

## Why this folder is not under `tests/`

**Nothing in the suite can substitute for a probe.** `scripts/lib/load-plugin.mjs` is *our* loader; running
a fixture through it proves what **we** think a runtime does, which is precisely the thing under question.
A probe is only discharged by a real agent runtime loading a real plugin and a human reading what appeared.

These fixtures are also deliberately non-conforming in places - probe 1's plugin ships `README.md` inside
`agents/` on purpose - so they must never be graded or swept up by the suite.

## Before you start: which probes are due

```
GITHUB_TOKEN="$(gh auth token)" npm run vendor-watch
```

The run prints each probe's age and names its reproduction. A probe past 30 days exits 1 and blocks the
release; one approaching it is reported and blocks nothing.

## The two probes

| Probe | Last verified | Blocks from | Fixture |
| --- | --- | --- | --- |
| `agents-dir-registers-every-md` | 2026-08-24 | **2026-09-24** | [`agents-dir-registers-every-md/`](agents-dir-registers-every-md/) |
| `components-share-one-namespace` | 2026-08-24 | **2026-09-24** | [`components-share-one-namespace/`](components-share-one-namespace/) |


> **Both dates were re-established on 2026-08-24 by running the gate at candidate boundaries, not by adding to a date.** `--today 2026-09-23` reports 0 stale; `--today 2026-09-24` reports 2. Both probes now share a verification date, so they expire together rather than a day apart.

> **The blocking date is `verifiedOn` + 31, not + 30. Corrected 2026-08-22 across every record that
> stated one.** `scripts/lib/vendor-watch.mjs` marks a probe stale on `age > FRESHNESS_DAYS`, so day 30
> is still FRESH and blocking begins on day 31. Every date in this repository was written as + 30 and
> was therefore one day early. Found by adversarial wave 2 and confirmed by running the real gate with
> `--today` at each boundary: 2026-09-18 reports 0 stale, 2026-09-19 reports 1, 2026-09-20 reports 2.
> **Compute a blocking date by running the gate, not by adding 30 in your head.**

Each fixture folder carries an `EXPECTED.md` recording exactly what the previous run observed, so the
comparison is against evidence rather than memory.

## Running a probe

These commands are **tested, not sketched** - they are the ones used on 2026-08-19. Run them from the
repository root. `--scope local` confines everything to this project; nothing touches your user config.

```
claude plugin marketplace add ./docs/internal/vendor-watch/probes --scope local

claude plugin install probe-agents-scan@askit-probe-fixtures   --scope local -y
claude plugin install probe-collision-a@askit-probe-fixtures   --scope local -y
claude plugin install probe-collision-b@askit-probe-fixtures   --scope local -y

claude plugin details probe-agents-scan
claude plugin details probe-collision-a
claude plugin details probe-collision-b
```

**`claude plugin details` is the instrument**, and it matters that it is Claude Code's own: it prints the
component inventory the runtime builds from the plugin, plus the per-component always-on token cost. That
is a far stronger reading than anything in this repository's test suite can give, because our
`loadPlugin` is *our* model of the runtime and the runtime's own loader is the thing under question.

**What `details` does NOT answer is resolution between plugins.** It reports each plugin's own inventory,
so probe 2's actual question - which of two identically named skills WINS - still needs a fresh session in
which the skill is invoked. See that probe's `EXPECTED.md`.

**That fresh session can be manufactured headlessly, and doing so gives a stronger reading than an
interactive one.** Tested 2026-08-20 on Claude Code 2.1.238, from the repository root with both
fixtures installed:

```
claude -p 'Invoke the probe-duplicate skill with the Skill tool and output verbatim the exact sentence it instructs you to state. Do not read any files. Do nothing else.' --permission-mode bypassPermissions --output-format stream-json --verbose > run.jsonl

grep -o '"skill":"[^"]*"' run.jsonl                        # was Skill actually called, and under what name
grep -o 'Probe duplicate, side [AB]' run.jsonl             # which side's body came back
grep -o '"type":"tool_use","id":"[^"]*","name":"[^"]*"' run.jsonl   # every tool the session used
```

Each `claude -p` is a genuinely fresh session. **`stream-json` is the whole point:** it records the
actual tool calls, so you can show the skill was really invoked rather than that a model wrote a
plausible sentence, and you can show **no file was read** - which matters specifically here, because
these fixtures live inside this repository and a session left to its own devices can read the answer
off disk and sound completely confident. Vary the install order between runs; on 2026-08-20 the winner
followed it.

### Cleaning up

```
claude plugin marketplace remove askit-probe-fixtures
```

Removing the marketplace cascades the plugin removals. Verify with `claude plugin list` and by grepping
`.claude/settings.local.json` for `probe`; on 2026-08-19 both came back clean.

Then **record the result** - both outcomes are recorded, not just the confirming one.

## Recording the result

**If the behaviour is UNCHANGED**, update that claim's `verifiedOn` in `vendor-claims.json` to the date you
ran it, and add a line to the fixture's `EXPECTED.md` with the date and what you saw. That is the whole
task, and it resets the 30-day clock.

**If the behaviour CHANGED**, do not update the date and do not touch the claim to make the run green. Read
the claim's `onChange` field first: it names what the change means, and for these two the consequences are
opposite.

- `agents-dir-registers-every-md` changing means `U15` loses its vendor grounding and becomes a house
  convention, which changes its provenance and whether `plain-plugin` still drops it.
- `components-share-one-namespace` changing means the two marketplace-collision checks should be
  **RETIRED, not graduated** - ADR 0051 says so explicitly. **It is the one claim whose change makes the
  gate report LESS.**

Either way the change needs an ADR, not an edit.

## What NOT to do

- **Do not bump `verifiedOn` without running the experiment.** The date is the entire verification; a date
  nobody earned is a false claim in a file whose only job is to hold true ones.
- **Do not run the fixture through `loadPlugin` and call it done.** See above: that tests our loader.
- **Do not grade these fixtures.** They are inputs to a runtime, not example plugins, and probe 1's is
  deliberately shaped wrong.
