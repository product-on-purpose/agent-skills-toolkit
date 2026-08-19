# Component staleness (reference)

How to answer "which of our components were written against an older agent than the one shipping today", and the trap that makes the answer worthless if you get it wrong.

## What the data is

`metadata.verified-against` (ADR 0054): a map of agent to the agent version a component was last **actually checked against**. It lives under `metadata` per `STANDARD.md` sec 3.7, and the frontmatter vocabulary is OPEN under sec 3.8, so declaring it is legal today without any Standard change. Making it **required** would be a tightening and needs its own ADR and migration window.

```yaml
metadata:
  version: 0.2.0
  agent-targets: [claude-code, codex]
  verified-against:
    claude-code: "2.1.208"
    codex: "0.148.0"
```

## The staleness report

For each component, three inputs and one output:

| Input | Source |
|---|---|
| which agents it targets | `metadata.agent-targets`, or the plugin default |
| what it was verified against | `metadata.verified-against`, or **unknown** |
| what shipped since | the survey record and `surveyed-pin.json` |

Output, per component: `current`, `stale (N releases behind the finding)`, or `unknown`.

## The four rules, and the first one is the whole point

**Stale is not wrong.** A component verified against `2.1.180` is very probably still correct; most releases change nothing that touches it. The report says **where to look**, never what is broken. A staleness list presented as a defect list is a false-report generator, and this repository grades other tools on exactly that failure.

**Unknown is not stale, and must not be rendered as stale.** A component with no `verified-against` has never made a claim. Collapsing "never claimed" into "claimed and now old" invents a finding out of an absence, which is the single easiest way to make this report untrustworthy on its first run - when *every* component will be `unknown`.

**Only a component the finding could actually touch is worth listing.** A finding about Codex plugin manifests has nothing to say about a skill declaring `agent-targets: [claude-code]`. Filter first, then report; a report listing all 26 components for a finding affecting 2 is noise wearing the costume of thoroughness.

**Writing `verified-against` requires having verified.** Stamping a version onto a component nobody re-read asserts a check that did not happen. This is not a hypothetical risk in this repository: its workflows pin actions by SHA with a `# vX.Y.Z` comment, a tool advanced the SHA and left the comment, and the disagreement was caught by eye three times and by a machine zero times before `action-pin-watch` was built for it. **A version written down is not evidence of a reading**, and this key is the same kind of object.

## Who writes the key

**This skill, and only for components it actually assessed.** Never the survey skill - a survey examines vendors, not components, and a bulk stamp across every component from a survey run is the defect above, multiplied by the size of the library.

When a component is assessed and found current, updating its `verified-against` is a real and useful act, and it should be a small, reviewable diff naming which components were read.

## The bootstrap, stated so the first run is not mistaken for a crisis

On the first run **every component is `unknown`**, because nothing carries the key yet. That is the expected state and not a finding.

Backfilling it wholesale is the wrong move: a backfill would be exactly the bulk stamp this document forbids. The key accrues honestly - a component gets its `verified-against` the first time somebody actually assesses it against a finding. **Coverage grows as a by-product of real work**, and the coverage number itself is worth reporting as a measure of how much of the library has ever been checked.
