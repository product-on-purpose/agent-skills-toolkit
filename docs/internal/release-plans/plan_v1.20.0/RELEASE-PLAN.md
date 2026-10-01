---
title: "v1.20.0 release plan - Standard 0.17, the graduations"
---

# v1.20.0 - release plan

**Class: minor.** One Standard revision and one exit-code change. No verdict moves for any adopter who does
not raise their own pin.

Cut 6 of the resolution plan, named **"Standard 0.17, the graduations"**. Per
[ADR 0057](../../decisions/0057-unshipped-work-carries-a-name-never-a-version-number.md) the number `1.20.0`
is assigned here, at cut time, and appears nowhere earlier.

## Scope

| Item | Handle | State |
| --- | --- | --- |
| Standard 0.17 | `G1`, `G2` and `G8` gate at pin 0.17; two clauses relaxed | shipped (#339, #350) |
| `U18` | the promise that it gates at 0.17 is withdrawn; permanently `warn` | shipped (#328, ADR 0061) |
| D-05 | an above-tier finding is a notice that names its rung | shipped (#319, #349) |
| B-09 and F-007 | checks state what they measure; the `G1` N/A label | shipped (#334) |
| F-011 | a broken `askit.config.json` exits `2` and no longer demotes the tier | shipped (#331) |
| F-037 | a folder of loose skills is told the `plain-plugin` profile exists | shipped (#331) |
| ADR 0060 | the marketplace collision checks drop to `warn` | shipped (#327) |
| standards-watch | a crash exits `2` as a refusal, not a finding | shipped (#344) |
| vendor pins | Claude Code's plugin-agent field sentences re-pinned | shipped (#345) |
| coverage page | which Standard rules have a check behind them | shipped (#334) |

## Gates

| Gate | Result |
| --- | --- |
| `release-ready` (six gates) | green on the release branch |
| Suite | 1672 tests, 1668 pass, 0 failures, 4 skipped |
| Codex round-trip | passed, `codex-cli 0.155.0` |
| Family blast radius | no verdict moved |
| CHANGELOG audit | `[1.19.0]` identical to the tag's copy; every bullet checked against its PR (#349) |

## After the tag

1. Approve the npm publish at the `npm-publish` environment's reviewer gate.
2. Confirm the agent-plugins re-pin watcher opens an issue, then review and merge the re-pin.
3. Re-run both vendor probes between 2026-10-10 and 2026-10-17; they block releases from 2026-10-18.
4. Begin "own plugins first", which the roadmap records as the next phase.
