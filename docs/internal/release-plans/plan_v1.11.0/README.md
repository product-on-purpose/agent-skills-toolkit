# plan_v1.11.0 - "reach"

**Written last, from the code**, which is the process change this packet inherits from v1.10.1. See
[RELEASE-PLAN.md](RELEASE-PLAN.md) for intent and acceptance criteria; this file is state.

Spine stays **30 checks**, Standard stays **v0.12**, tier stays **Advanced**. **No plugin's tier or
exit code moves.** MINOR, because there is new capability and no change to what conformance requires.

## What shipped

| Workstream | Result |
|---|---|
| W1 npm packaging | Public package, single bin, 60-file allowlisted tarball, dispatch-only publish workflow. Consumer-position install proven. |
| W2 machine-readable output | `--json`, SARIF 2.1.0, GitHub annotations, provenance in five outputs, optional `line` on findings. |
| W3 Action and tier badge | Composite Action running the checked-out tree, sha-pinned shields endpoint. |
| W4 validator-parity harness | Report-only, parsed-values based, with a documented-exception path. ADR 0042. |
| W5 Bronze installability | Seed emits a minimal native manifest; interview supplies a real author. ADR 0043. |
| E28 rider | `clampNotice` now reaches the Markdown and HTML reports. |

## The four decisions worth reading

**The package name is a security question, not a taste question.** `askit` exists on npm and belongs
to an unrelated author, so shipping it as a bin name would make `npx askit` fetch and execute their
code from a clean environment while any failure looked like ours. Single bin, `agent-skills-toolkit`,
with the reasoning recorded in the bin file itself.

**A placeholder author was rejected and the acceptance criterion was corrected instead.** The obvious
way to make `claude plugin validate --strict` pass on the seed is `"author": {"name": "REPLACE - your
name"}`. That is the defect `U5` (description-score) already penalizes under ADR 0033: a `TODO` that
scores well is the scorer being fooled. The criterion this packet originally inherited from the audit
said "the seed passes `--strict`" without qualifying which artifact, and the implementation is what
proved it wrong.

**The parity harness checks parsed values, not exit codes.** ADR 0040 records `agentskills validate`
reporting "Valid skill" for all 24 skills while `metadata.chain` was silently mangled, because the
validator never inspects `metadata` contents. A harness checking status codes would have reported this
repository green through that entire defect. It is demonstrated catching a seeded violation, because
a harness never seen to fail is not evidence.

**No invented line numbers.** Findings mostly do not carry a line. SARIF emits a `region` only when
one exists, and a file-level location otherwise. Emitting `startLine: 1` would have filled every
field and been a lie; a gate whose value is that it does not guess does not get to guess here.

## Deliberately not here

- The actual `npm publish` and any registry listing. The maintainer's single command.
- **E26** (`U13` carries the same config-escalation exposure the v1.10.1 migration cap closed).
  Lowering a severity is always safe under ADR 0027, so this is scope-bound, not policy-bound.
- **E29** (the count guard cannot tell a quoted example from a live claim; the fix needs `stripCode`,
  currently private to a graded check module). Dropped rather than rushed, exactly as the plan
  reserved the right to do.
- Flipping the parity harness to gating. One line, and it waits one release: the mechanism has only
  ever run locally and has not yet executed on a real runner.
- Line numbers on the other 29 checks.
- Any new spine check, any Standard bump.

## Whether the process changes worked

v1.10.1 needed six adversarial review rounds and produced seventeen findings, sixteen of them
introduced by that release. Three changes were carried into this one: claims written last from the
code, shared helpers from the first commit rather than after the third duplicate, and review run per
workstream rather than once before the tag.

The honest scorecard belongs in
[adversarial-review-resolutions.md](adversarial-review-resolutions.md) once this release's review has
run, and it should record whether the round count actually fell. A process change asserted without a
measurement is the same defect this project keeps finding in itself.
