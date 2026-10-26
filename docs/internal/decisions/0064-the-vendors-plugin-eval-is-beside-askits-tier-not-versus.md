# 0064 - The vendor's `claude plugin eval` is beside askit's tier, not versus it

## TL;DR

- **Decision: askit's tier and the vendor's `claude plugin eval` answer different questions, the posture is BESIDE and not versus, and the guidance to anyone asking "which one grades my plugin" is RUN BOTH.** askit's tier is structural, deterministic, and library-scope - it grades every component in a plugin, or every plugin in a library, against a fixed, portable rulebook with no model judgment. `claude plugin eval` is behavioural, judged, and single-plugin - it loads one target plugin into an isolated agent session, runs that plugin's own prompt-and-grader cases several times, and scores the result, by default against a no-plugin baseline arm.
- **The positioning stakes itself on the word "single-plugin", so that leg is pinned to a vendor sentence rather than asserted from memory.** Verified 2026-10-25 against [`code.claude.com/docs/en/plugins/cli-reference.md`](https://code.claude.com/docs/en/plugins/cli-reference.md), the `### plugin eval` section: *"Claude Code runs it several times in an isolated session with only the target plugin loaded, and by default also without the plugin so the report shows the difference."* The same scope is independently confirmed by `claude plugin eval --help` on the locally installed Claude Code **2.1.310**: *"Run eval cases ... against a plugin and report scored results. Target is a path, a plugin name, or a `plugin@marketplace` id - installed and skills-dir plugins both resolve (and add a no-plugin baseline arm)."* One target, one plugin, one isolated session, both times.
- **Because the page states the scope in a complete sentence, this is a `quote` claim, not a `probe`.** [`docs/internal/vendor-watch/probes/README.md`](../vendor-watch/probes/README.md) reserves a `probe` for "an empirical behaviour that no page states." That condition does not hold here, so no probe is minted and the probe budget stays at two, not three - the opposite of the cost this decision carried when it was ruled on 2026-08-31 and the comparison page had not yet confirmed the vendor's prose (see [RS-C5 (the stance on the vendor's own plugin eval)](../roadmap.md#rs-c5-the-stance-on-the-vendors-own-plugin-eval-the-positioning-adr), annotated 2026-10-23).
- **Status: Accepted.** Ruled 2026-08-31 (adopt, with a scope tripwire); this ADR recorded 2026-10-25.

- **Date:** 2026-10-25
- **Deciders:** maintainer (jprisant), with Claude (Sonnet 5)

## Builds on

- **[RS-C5 (the stance on the vendor's own plugin eval)](../roadmap.md#rs-c5-the-stance-on-the-vendors-own-plugin-eval-the-positioning-adr)** - the roadmap row this ADR discharges. Its 2026-08-31 ruling set the posture (BESIDE, run both) and its scope tripwire (the single-plugin leg needs a pinned vendor claim, because that is the one leg the vendor can take in a single release). Its 2026-10-23 annotation found the vendor's prose had arrived but the ADR had not been written; this ADR is that write-up.
- **[ADR 0058 (a vendor that drops a component is a finding, and the proxy is declared)](0058-a-vendor-that-drops-a-component-is-a-finding-and-the-proxy-is-declared.md)** - the nearest precedent for declaring a measurement a *proxy* for something the check does not itself observe. This ADR does the same for a comparison: askit's tier is a proxy for "is this library structurally conformant," never for "does this plugin work well," and naming that boundary is the whole point of BESIDE.

## Context and problem statement

[Roadmap item 15 (runtime-truth checks)](../roadmap.md#4-triage-of-the-2026-09-04-audits-roadmap) already declined to put vendor CLIs inside askit's gate, because they are external, unpinned, and - in `claude plugin eval`'s case - were undocumented at the time. That left the adjacent question unruled: now that the vendor ships its own evaluator, what does askit say about it in public-facing material? Silence reads as either "we didn't notice" or "we're afraid of the comparison." Claiming askit's tier supersedes the vendor's eval would be false - they measure different things - and claiming the reverse would be false for the same reason. [`docs/explanation/comparison.md`](../../explanation/comparison.md) already runs a neutral, sourced matrix against third-party tools; it had no row or paragraph for the vendor's own command, and `grep` for "plugin eval" across `docs/explanation/` and `foundation/` returned nothing as late as the 2026-10-23 roadmap annotation.

A second risk sits underneath the first: the comparison table already lists a third-party tool literally named `plugin-eval` (row 3 of the matrix, an unrelated per-skill, multi-agent grader). Any new prose about the vendor's `claude plugin eval` command has to be unmistakably about Anthropic's own CLI subcommand, not about that unrelated tool of a similar name.

## Decision drivers

- The two systems are not substitutable: askit's verdict is an exit code from a model-free gate; `claude plugin eval`'s verdict is a judged score from an agent session that runs the plugin.
- The positioning has exactly one empirically falsifiable leg - "single-plugin, not library-scope" - and a release could take that leg away by letting the command eval more than one plugin's cases in a shared session. That leg needs a pinned, re-checked vendor claim rather than a sentence trusted once and never revisited.
- Silence on a vendor capability the toolkit's own audience will ask about is itself a position; the honest move is to state the comparison rather than let a reader construct it themselves and guess wrong about which one `agent-skills-toolkit` thinks it is.

## Considered options

1. **Say nothing.** Refused: `grep` already shows this is what has happened since 2026-08-31, and the roadmap's own test for this page - "someone who has never opened `_local/` can pick up any open item and know what done means" - fails for RS-C5 as long as the ADR stays unwritten.
2. **Claim askit's tier supersedes or replaces the vendor's eval.** Refused: false on the facts. askit never runs the plugin; it never judges behaviour; it has no LLM grader. Claiming supersession would be the same category of error [ADR 0058](0058-a-vendor-that-drops-a-component-is-a-finding-and-the-proxy-is-declared.md) exists to prevent - asserting a fact askit's own measurement never took.
3. **Treat them as competitors and argue askit is "better."** Refused for the same reason as option 2, from the other direction: a structural, deterministic gate is not a worse behavioural judge, it is a different instrument answering a different question. Framing it as a contest invites exactly the comparison askit's own matrix was built to avoid making in bad faith (see the neutral-table discipline already in `comparison.md`).
4. **BESIDE, not versus; recommend running both.** Adopted. It is the only framing that is true of both systems at once, and it gives a reader an actual recommendation (run both) rather than a hedge.

## Decision outcome

**Adopted: option 4, with the scope tripwire.** askit's tier answers "is this library structurally conformant with a portable, climbable standard," checked the same way every time with no model in the loop. `claude plugin eval` answers "does this one plugin's behaviour, judged by an LLM grader against cases its own author wrote, score well against a no-plugin baseline," checked by actually running the plugin. Positioning them as BESIDE each other, with the standing guidance to run both, is the only claim consistent with what each one actually does.

The tripwire: the single-plugin leg of this positioning is now a `quote` claim (`plugin-eval-single-plugin-scope` in [`foundation/claims/vendor-claims.json`](../../../foundation/claims/vendor-claims.json)), re-checked against the live page on every `npm run vendor-watch` run, exactly like every other quote claim. If the vendor ever lets one `claude plugin eval` run score cases across more than one plugin in a shared session, the watch reports the pinned sentence MISSING rather than silently continuing to say "single-plugin," and this ADR's positioning must be revisited rather than quietly outliving the fact it rests on.

### Consequences

**Positive.** The public comparison page states a true, checkable comparison instead of staying silent on a capability the toolkit's audience will ask about; the one load-bearing factual leg is pinned and watched rather than trusted from a single read; the probe budget is not grown, because the fact needed was already a sentence, not an experiment.

**Negative / follow-up.** [`docs/internal/roadmap.md`](../roadmap.md) still needs its RS-C5 row and its "Decisions that are open" row updated to close this out; this ADR does not edit that file (house rule on this change), so the exact text is recorded as a record note on the change that lands this ADR rather than inside it. The quote claim adds a fifth vendor source and a tenth claim to `vendor-claims.json`, which moves the claim-and-source counts `CHANGELOG.md` and `docs/internal/STATUS.md` state in prose; those two files are also outside this change's edit list, so their corrected text is recorded the same way.

## What was considered and refused

**Minting a probe instead of a quote.** Refused: [`docs/internal/vendor-watch/probes/README.md`](../vendor-watch/probes/README.md) reserves a probe for a behaviour "no page states." `cli-reference.md` states the single-plugin, isolated-session scope in a complete sentence, confirmed independently by the local `--help` text, so the probe path's precondition does not hold. Minting one anyway would have added a third 30-day release-blocking clock for a fact that a `quote` claim already watches for free on every run.

**Folding this into the existing `plugin-eval` row of the comparison matrix.** Refused: that row is an unrelated third-party tool of a similar name (per-skill, multi-agent, already in the sourced matrix at row 3). Reusing it for the vendor's own CLI command would make two different things share one label on the one page whose entire job is disambiguating tools by name.

## Implementation sites

- `foundation/claims/vendor-claims.json` - new source `cc-plugin-eval-cli` (the CLI reference page) and new claim `plugin-eval-single-plugin-scope` (the quote this ADR's tripwire watches).
- `tests/unit/vendor-watch.test.mjs` - `MEANING_REVERSALS` gains an entry for `plugin-eval-single-plugin-scope`, so the new claim is provably meaning-bearing rather than a fragment that happens to match.
- `docs/explanation/comparison.md` - the new paragraph stating the BESIDE-not-versus posture and the run-both guidance, placed so it cannot be read as being about the unrelated `plugin-eval` matrix row.
- No other code implementation sites: this is a positioning decision with one pinned factual leg, not a change to any check's severity or scoring.
