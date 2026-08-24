---
title: "v1.16.1 - the four-lens review, and what it found"
---

# v1.16.1 - review findings

The pre-cut gate requires a four-lens adversarial panel over every substantive PR merged since the last release, with no finding left open. This is that record.

**Scope.** The six commits between `v1.16.0` and `f419575`, of which four are substantive: the `G2` fix (#282), three guard defects (#280), and two plain-language documentation passes (#281, #283).

**Method.** Each lens was run by probing the changed code with adversarial fixtures rather than by reading it. Where a probe reported a defect, the first question asked was whether the change introduced it or merely inherited it.

## Lens 1 - false PASS

*Can the changed code report success where it should fail?*

**Finding 1.1 - `G2` counts a gate named inside a string. NOT introduced here; filed as E56.**

`- run: echo "we should add npx agent-skills-toolkit one day"` satisfies `G2`. Comment stripping removes `#` lines but nothing looks at what a `run:` line does with the text.

Checked against the pre-change matcher before claiming it: `- run: echo "one day we should run node scripts/check.mjs here"` passed the **old** `G2` too. So the widening adds a phrase more likely to appear in prose than a file path, which raises the odds rather than creating the class. Filed as E56 rather than fixed in a patch cut, because a real fix means parsing the YAML instead of matching text.

**Finding 1.2 - `G2` accepts an `agent-skills-toolkit` Action from any owner. Deliberate; now documented and pinned.**

The matcher does not check who publishes the Action. That is consistent with the form that predates it: `GATE_PATH` accepts any `scripts/check.mjs`, including one the plugin wrote itself. `G2` asks whether CI is wired to a conformance gate, not whose copy of it. Left as-is, stated in the reference page, and pinned by a test so it is a decision rather than an accident.

**Clean:** installing the package (`npm install agent-skills-toolkit`) does not count. A lookalike package name (`agent-skills-toolkit-fork`) does not count. `vendor-watch` reports exit 1 for a source id that is empty, missing, case-different, or carries a trailing space.

## Lens 2 - false FAIL

*Can it report failure where it should pass?*

**Nothing found.** Seven legitimate ways to run the gate all pass: `npx` bare, with a flag (`--yes`), with a version pin (`@1.16.0`), with gate flags, inside a multi-line `run:` block, via an npm script that shells to npx, and the original vendored path. `vendor-watch` reports exit 0 for a normal resolving claim, for a declared source carrying no claim, and for two claims sharing one source.

One probe **appeared** to find a false fail and did not: the fixture set a claim's text to `"x"` while the page said something else, so `MISSING` was the correct verdict. The probe was wrong, not the code. Recorded because this repository's own rule - a first reported defect is a suspect - applies to a reviewer's instruments as much as to a guard's output.

## Lens 3 - determinism

*Same input, same output?*

**Clean.** `buildReport` produces byte-identical JSON across repeated runs on identical input, including the undeclared-source list, whose order derives from claim order rather than Set iteration. No wall-clock dependence: `--today` remains the only clock input.

## Lens 4 - contract fidelity

*Does the code do what its own documentation says?*

**Finding 4.1 - the reference page said `npx agent-skills-toolkit` "if you vendor the gate". Fixed.**

That sentence is nonsense: npx is the **non**-vendored form. It was introduced by this cycle's own bulk command substitution (#283), which rewrote a line where the vendored path was the **subject** rather than an instruction. Five pages were deliberately held back from that substitution for exactly this reason and this one was missed, because it sat in a page edited in an earlier commit.

Swept for others: **one instance only.** Every remaining `npx` line in the public docs is a genuine command example.

**Finding 4.2 - the accepted forms and the documented forms disagreed in two directions. Fixed.**

The docs named `product-on-purpose` as the Action owner while the code accepts any, and did not mention the installed bin invoked directly, which the code also accepts. The reference page and the check's own failure message now state all five forms, and two new tests pin the two that were undocumented.

## Disposition

| Finding | Outcome |
| --- | --- |
| 1.1 gate named in a string | Filed as **E56**. Pre-existing, not a regression, not a patch-cut fix |
| 1.2 any-owner Action | **Kept deliberately.** Documented and pinned by a test |
| 4.1 nonsense sentence in `gold-checks.md` | **Fixed.** Swept; one instance only |
| 4.2 contract narrower than behaviour | **Fixed.** Both directions, plus two pinning tests |

**No finding remains open.** E56 is filed rather than open against this release: it is not a regression, and the fix is a different check.
