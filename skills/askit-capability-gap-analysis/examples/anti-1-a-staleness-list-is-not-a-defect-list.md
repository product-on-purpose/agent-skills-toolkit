# Anti-example: rendering the staleness report as a defect list

The way this skill produces its own false-report generator, and the reason the rule exists in [references/component-staleness.md](../references/component-staleness.md).

## The request

> The survey says Claude Code shipped 27 releases since our pin. Run the staleness report and open a
> backlog entry for every skill that is behind, so we can burn them down.

## Why it is tempting

It looks like diligence. There is a list, the list is derived from real data, and every item on it is genuinely older than the finding.

## Decline it. Three things are wrong.

**Stale is not wrong.** A skill verified against `2.1.180` is very probably still correct - most releases change nothing that touches any given component. The report says **where to look**. Converting it into a defect list asserts breakage that has not been observed, and this repository grades other tools on exactly that: *a grading tool's worst failure is not missing a defect, it is reporting one that is not there, because the author who trusts it changes correct code.*

**Unknown is not stale.** On the first run every component is `unknown`, because nothing carries `verified-against` yet. Rendering "never claimed" as "claimed and now old" invents findings out of an absence, and it does so at maximum volume on exactly the run where the report is being judged for the first time.

**Most of the list cannot be touched by the finding at all.** A Codex manifest finding says nothing about a skill declaring `agent-targets: [claude-code]`. Filter to what the finding could reach, then report. A list of 26 for a finding affecting 2 is noise wearing the costume of thoroughness, and it trains its reader to skim.

## What this repository has already paid for this shape

The `action-pin-watch` check shipped in v1.15.0 reported exactly one defect on its first run - a version label that disagreed with its commit. **It was a false positive.** One commit carries several tags, the check read whichever the registry listed first, and a correct label was reported as a release blocker on response ordering nobody controls. Adversarial review caught it before the tag; the fix and the admission are both in ADR 0053.

**A first run that produces a long list of findings is the single most likely moment for a new tool to be wrong at scale.** Treat it as a claim to verify, not a result to act on.

## What to do instead

Report three buckets and act on none of them automatically:

```markdown
Finding: [claude-code 2.1.232] subagent forking on by default.
Could reach: components declaring agent-targets including claude-code AND using subagent chaining.
  -> 7 subagents, 2 of which declare chain steps.

  current  : 0
  stale    : 0
  unknown  : 2   (neither carries verified-against; the key is new)

Recommendation: READ the two. Do not file anything until they have been read. If both are fine,
write verified-against on those two only - the two that were actually read.
```

Then read them. **Coverage of `verified-against` grows as a by-product of real assessment**, never as a bulk stamp - because a version written down is not evidence of a reading, and a bulk stamp is that lie multiplied by the size of the library.
