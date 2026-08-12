---
title: "scripts/lib/marketplace - folder guide"
---

# scripts/lib/marketplace

The third evaluation scope (ADR 0039, marketplace-scope evaluation). Plugin scope grades one plugin and
component scope grades one skill; this grades a **catalogue** - a directory whose
`.claude-plugin/marketplace.json` lists member plugins - and reports the defects that exist only in the
union of its members and are therefore invisible to grading them one at a time.

Kept as its own folder deliberately. The Standard's canonical home is decided to be
`agent-plugins/standards/` (that repository's ADR 0001) with the physical move sequenced separately;
new engine-adjacent code is built as a delimited module so that move stays a mechanical diff rather than
an unpicking exercise.

## What the scope decides, in one paragraph

Every member is graded **at its own declared tier and its own Standard pin**, exactly as it would be
graded alone, and the collection is red if any member fails **its own** claim (self-consistency
worst-member). No collection-level tier expectation is invented for anybody, and there is no threshold to
tune. Two failures both wear the word "unresolved" and only one of them is a red: a **broken catalogue
entry** is a defect and reds, while a member **absent from this machine** is an environment gap, reported
`not-graded`, with the coverage count carried unconditionally on the verdict line.

## Inventory

- `manifest.mjs` - reads and shape-validates the catalogue, classifies each entry's source kind
  (`local-path`, `url`, `github`, `npm`, `archive`, `git-subdir`), reads the `renames` field, and owns
  the shape test that keeps this scope and `U13` provably disjoint.
- `resolve.mjs` - maps entries to local member directories (explicit sidecar mapping first, then
  discovery), classifies the two unresolved failures apart, and reads each member's graded sha from
  `.git` with no subprocess.
- `analyze.mjs` - the cross-member analyses: duplicate catalogue names, rename collisions, registry-vs-
  member version agreement, skill-directory and command-name collisions, the plugin-shipped-agent
  restricted-fields reading, and three advisory analyses that can never move the verdict.
- `evaluate-marketplace.mjs` - the orchestrator and the terminal renderer: grades each resolved member
  through the same `runGate` every plugin gets, aggregates, and returns the collection report object.

## What this folder deliberately does not do

- **Fetch anything.** ADR 0039 question 1 defers remote fetch-at-sha, so a run answers "what would the
  next re-pin grade", not "what do installers get". The pin sha, entry version, graded sha and
  divergence marker are unconditional report columns precisely so that limit is disclosed rather than
  hidden.
- **Emit a numbered spine check.** Every finding here carries `reqId: null`. ADR 0039 question 3 chose
  scope-local findings so the 30-check spine does not move in the release that adds the capability.
- **Change any existing verdict.** A plugin graded alone grades identically whether or not it is also a
  catalogue member.
