---
title: "Watch the upstream spec"
description: "Run the upstream spec watcher, read what changed and which checks it lands on, and re-pin once the ADR is accepted."
audience: engineer
level: advanced
tags: [governance, standard, upstream, agentskills]
---

# How to watch the upstream spec

Run the upstream spec watcher, read what changed and which checks it lands on, and re-pin once the ADR is accepted.

[`STANDARD.md`](../../STANDARD.md) sec 6 says the Universal tier MUST track agentskills.io as it evolves. `askit-standards-watch` is how that obligation is discharged: it fetches the four watched artifacts, compares their git blob SHA-1 against the committed pin at `foundation/claims/upstream-pin.json`, reports which checks any delta lands on, and stops. The human decides; the tool does not apply anything.

## 1. When to run

Nothing schedules this automatically. The natural moments are:

- **Before cutting a Standard MINOR release.** A clean run is evidence that the Universal tier is still written against the current upstream.
- **When you hear the upstream has moved.** If a commit to `agentskills/agentskills` shows up in your feed, run the watch before doing anything else.

If you are not about to cut a release and have not heard of a change, there is no reason to run.

## 2. Run the watch

```
npm run standards-watch
```

The command fetches the watched artifacts, hashes them, and prints a verdict.

**Outcome `unchanged` (exit 0)** - the most common case. Every watched artifact hashes to its pinned value. Stop; there is nothing to do.

Output captured 2026-07-27:

```
upstream standards watch - agentskills.io
pin verified 2026-07-27 | run 2026-07-27

VERDICT: unchanged

Watched artifacts
  unchanged docs/specification.mdx  (20cf9f6b6723)
  unchanged skills-ref/src/skills_ref/validator.py  (22cf6f8ae5f9)
  unchanged skills-ref/src/skills_ref/models.py  (77fa89ed2ccc)
  unchanged skills-ref/src/skills_ref/parser.py  (690c14e27b61)

Limits
  - Detection is deterministic; materiality of a prose change is not. A section-body change is reported, never classified.
  - The reference implementation (skills-ref) is watched by content hash only; its diff is not parsed.
  - This tool proposes. Amending a check or STANDARD.md requires an ADR and the sec 7.7 warn-first burndown.

No proposal to make. Re-run after the next upstream release, or refresh the verified date with --emit-pin.
```

**Outcome `needs-review` or `material-change` (exit 1)** - something changed. The report names what moved and which checks it lands on. Work through it (section 3 below). Both verdicts exit 1; both require a human to read the upstream diff.

**Outcome REFUSED (exit 2)** - the tool encountered an error it cannot reason past and refused to emit a verdict rather than reporting a false clean. A refusal is never a pass. See section 2b.

### 2b. What REFUSED means

Exit 2 prints a single error line to stderr and exits without any report:

```
standards-watch REFUSED: the '### Frontmatter' section was not found in the specification; the extractor cannot locate the field contract
```

The two causes the message will name:

- **Extraction failed** - the upstream restructured the specification's headings or tables so the extractor cannot find its anchors. Nothing about the run is trustworthy, including the parts that appeared to work. Fixing this requires updating the extractor, which is a code change with its own review, not a documentation task.
- **Fetch failed** - a watched file returned a 404, meaning the upstream renamed or removed a normative artifact.

Do not treat REFUSED as "try again later." Investigate the message, then fix what it names.

## 3. What to do with needs-review

This is the substantive step. The tool found a change, located where it is, mapped it to the checks it lands on, and deliberately stopped. It will not tell you whether the change is normative; only a person reading the upstream diff can decide that.

### Reproduce the worked example

A real upstream change is pinned in the examples directory. Running the watcher against the historical pin reproduces detection of the genuine 2026-05-16 event:

```
node scripts/standards-watch.mjs . --pin skills/askit-standards-watch/examples/pin-historical-2026-05-15.json
```

**The watcher ships with the plugin, not with the npm package**, which carries the grading gate and `STANDARD.md` only. Ask your agent to run `askit-standards-watch` if you installed that way.

Output captured 2026-07-27:

```
upstream standards watch - agentskills.io
pin verified 2026-05-15 | run 2026-07-27

VERDICT: needs-review

Watched artifacts
  CHANGED   docs/specification.mdx  (a45ead394920 -> 20cf9f6b6723)
  unchanged skills-ref/src/skills_ref/validator.py  (22cf6f8ae5f9)
  unchanged skills-ref/src/skills_ref/models.py  (77fa89ed2ccc)
  unchanged skills-ref/src/skills_ref/parser.py  (690c14e27b61)

Needs a human read (1) - located, deliberately NOT classified
  - [section-body-changed] #### `name` field
    the body of "#### `name` field" changed (a1044f25ca27d099 -> 5f781114ba5da147); read the diff and decide whether it is normative
    touches: U3, U4

Checks a delta lands on (resolved from docs/reference/universal-checks.md)
  U3  scripts/checks/frontmatter-valid.mjs
      Every component's frontmatter parses and carries a `name` and a `description`
      Standard sec 3.1 | tier universal | since 0.x | vendor-cited
  U4  scripts/checks/name-matches-dir.mjs
      A component's declared `name` equals its directory in kebab-case
      Standard sec 3.1 | tier universal | since 0.x | vendor-cited
```

The tool reports one `section-body-changed` delta: the body of the `#### name field` section changed. It resolved that delta to `U3` (U3 frontmatter-valid) and `U4` (U4 name-matches-dir). Then it stopped.

### Read the upstream diff

```
gh api "repos/agentskills/agentskills/commits/6868401b64f791e9ff565f29beb6338826b73a2b"
```

The change: one line inside the `#### name field` section:

```
- May only contain unicode lowercase alphanumeric characters (`a-z`) and hyphens (`-`)
+ May only contain unicode lowercase alphanumeric characters (`a-z`, `0-9`) and hyphens (`-`)
```

The frontmatter field table did not change. Its `name` row already read "Lowercase letters, numbers, and hyphens only." A watcher that only compared the table would have seen nothing. The per-section body hash caught it.

This is the honest picture of what the job feels like: the change is one line, the table summary is unchanged, and the tool correctly refused to say whether it mattered.

### Apply the materiality questions

Read [`skills/askit-standards-watch/references/materiality-rubric.md`](../../skills/askit-standards-watch/references/materiality-rubric.md) before writing a word of the ADR. In order:

1. **Does it change what a conformant skill may contain or must contain?** Yes. It expands the permitted charset for the `name` field.
2. **Does any existing check encode the sentence that moved?** Open `scripts/checks/frontmatter-valid.mjs` and read the actual expression:
   ```
   const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
   ```
3. **Is our behavior already correct by accident?** Yes. `a-z0-9` already includes digits. The upstream prose caught up to what both the table and our regex had always said.
4. **Is this tightening or clarifying?** Clarifying. No requirement changed.

Outcome: **re-pin only**. No check needs updating. That conclusion is yours, not the tool's, reached by reading two files. Draft an ADR when the reasoning is worth recording (recommended for anything where the answer is not immediately obvious), then proceed to section 4.

## 4. Re-pin after the ADR is accepted

Once you have decided (re-pin only, track it, or defer with a reason), update the pin. The command prints the proposed document to stdout and writes nothing to disk:

```
npm run standards-watch -- --emit-pin --by "Your Name"
```

Review the output, then redirect it yourself and save:

```
npm run standards-watch -- --emit-pin --by "Your Name" > foundation/claims/upstream-pin.json
```

Commit the new pin in the same PR as the accepted ADR (or on its own when the decision is re-pin only with no ADR). The two move together: the pin records a decision, and the decision explains the pin.

The `--emit-pin` command is write-incapable by construction. A unit test in `tests/unit/standards-watch.test.mjs` fails the build if any filesystem write API or `child_process` import appears in the watcher scripts. Re-pinning is always a reviewed file change, never a side effect of a run.

## 5. What if it says a change touches no check?

The most important output the tool can produce is this line:

```
touches: no check encodes this today
```

It appears when a delta lands in a field, directory, or section whose `touches` map is empty. It means the upstream now requires or names something the Universal gate cannot see. That is not a bug in the tool; it is the gap list.

Example: if the upstream added a required `schema-version` frontmatter field with an empty `touches` array in the pin, the report would say `touches: no check encodes this today` for that delta. The Universal tier has no check for this field, so a plugin missing it would pass the gate undetected.

The ADR outcome for a gap-list finding is `track it`, not `re-pin only`. The Standard MINOR that introduces the new check ships it as a `warn` for one release before it becomes a gate-failing `error`, giving downstream libraries a migration window (Standard sec 7.7).

## See also

- [`askit-standards-watch` reference](../reference/askit-standards-watch.md) - what it watches, the pin format, and what it can and cannot decide.
- [Record a decision](record-a-decision.md) - the ADR path every behavioral change goes through.
- [Materiality rubric](../../skills/askit-standards-watch/references/materiality-rubric.md) - the four questions, in detail.
- [Worked example](../../skills/askit-standards-watch/examples/golden-2-real-upstream-delta.md) - the complete read on the real 2026-05-16 upstream change.
