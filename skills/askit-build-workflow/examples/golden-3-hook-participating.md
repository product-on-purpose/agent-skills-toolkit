# Golden example: chain with a hook, and its Gold eval obligation

**Demonstrates:** an arc where `askit-build-hook` participates by authoring a guard hook, and the craft doc's G3 consequence: the registered hook event requires an eval entry with `"covers": {"hook": "<event>"}` by the time the plugin is assessed at Gold.
**Provenance:** authored by `askit-build-workflow` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

The user asked: "I want a workflow that authors a new skill, adds a guard hook alongside it, and makes sure the eval set covers the hook event so the Gold gate doesn't surprise me later."

Create-mode interview answers:

| Question | Answer |
|---|---|
| Arc name | `skill-with-guard` |
| Ordered skills | author skill, author hook, author evals (including hook coverage), grade |
| Hook event to demonstrate | `PreToolUse` |
| What is handed between steps | skill directory; hook event name; eval file path; evaluate report |
| Exit criteria | 0 errors on conformance gate; eval file present with correct `covers.hook` |
| Target agents | claude only (31-event Claude hook set; Codex covers a subset and hook ingestion is a known caveat) |

## Output

`_workflows/skill-with-guard.md`

```markdown
---
name: skill-with-guard
description: Authors a new skill, adds a companion guard hook for a tool-use event, creates the eval set including hook event coverage, and confirms the plugin is clean. Use when adding a skill that needs a PreToolUse or PostToolUse guard alongside it.
metadata:
  version: 0.1.0
  tier: convergent
  status: active
  agent-targets:
    - claude
steps:
  - skill: askit-build-skill
  - skill: askit-build-hook
  - skill: askit-build-samples
  - skill: askit-evaluate
---

# skill-with-guard

## Steps

**Step 1: `askit-build-skill` (create mode)**

Input: skill name (kebab-case), purpose sentence, trigger keywords, target tier.

Output: `skills/<name>/SKILL.md` with conformant frontmatter and a procedure body.

Artifact handed on: the skill directory path (e.g., `skills/my-plugin-validate/`).

Exit criterion: `node scripts/evaluate.mjs skills/<name> --json` reports 0 errors. Iterate in `askit-build-skill` improve mode until clean before moving to step 2.

Failure: a U5 description score below 0.7 means the description lacks the action verb or trigger keywords. Rewrite per the authoring guide and re-run evaluate; do not proceed to step 2 with a failing description because the hook's scope statement in step 2 references the skill by name, and a renamed skill invalidates that reference.

**Step 2: `askit-build-hook` (create mode)**

Input: the event to guard (e.g., `PreToolUse`); the tool matcher (e.g., `Write|Edit|NotebookEdit`); the scope (what the guard enforces); the failure behavior (block with an actionable message or warn-only); the skill name from step 1 as context for the scope description.

Output: `hooks/hooks.json` (created or updated with the new hook registration); the hook command script (e.g., `hooks/no-content-violations.mjs`); a new entry in `library.json` `components.hooks` recording `{ name, version, tier: "advanced", status: "active" }`.

Artifact handed on: the registered hook event name as a string (e.g., `"PreToolUse"`). This exact string is the value that step 3 must place in `covers.hook`.

Exit criterion: `hooks/hooks.json` exists and the hook entry uses `${CLAUDE_PLUGIN_ROOT}` in its command path. The event, trigger, scope, and failure behavior are documented in the hook's comments or in a companion `hooks/README.md` (Standard sec 3.5 MUST). `node scripts/evaluate.mjs . --json` shows no new errors after the registration is added to `library.json`.

Failure: if the chosen event is not supported by the target agent (for example, Codex does not support `UserNotification`), narrow the event to one in Codex's supported set, or remove the hook if it is Claude-only and update `agent-targets` in step 1's skill frontmatter and in the workflow header to `[claude]`. Do not proceed to step 3 with a hook registered for an unsupported event; the eval file in step 3 names the event, and a mismatch between the registration and the eval is a G3 error at Gold.

Why after step 1: the hook guards the skill's tool-use events. Creating the hook before the skill exists means authoring a guard for a component that is not yet on disk. The scope statement in the hook references the skill's purpose; writing it before step 1 is complete forces a rewrite after the fact.

**Step 3: `askit-build-samples` (create mode)**

Input: the skill name from step 1 AND the hook event name from step 2 (the exact string, e.g., `"PreToolUse"`).

Output:
- `skills/<name>/examples/` directory with at least 3 golden examples and at least 1 anti-example (Standard sec 7.2).
- `evals/<hook-script-name>.eval.json` with `"covers": {"hook": "<event>"}` matching the event from step 2 (the G3 obligation).

The shape of the hook eval file must match the format the G3 `library-regression` check and the `askit-evaluate` behavioral runner consume. This toolkit's `evals/no-dashes-hook.eval.json` is the reference:

```json
{
  "covers": { "hook": "PreToolUse" },
  "description": "The <hookname> guard denies a <payload description>.",
  "cases": [
    { "given": "a call that should be blocked", "expect": "the hook emits a deny decision with an actionable reason" },
    { "given": "a call that should pass through", "expect": "the hook exits 0 with no deny output" },
    { "given": "a malformed (non-JSON) stdin payload", "expect": "the hook exits 0 and allows the call rather than blocking on a hook bug" }
  ]
}
```

Artifact handed on: the path to the eval file (e.g., `evals/no-content-violations.eval.json`).

Exit criterion: the eval file exists, is valid JSON, its `covers.hook` value equals the event string from step 2, and it has at least one case for the block path and one for the allow path.

Failure: if the eval file has the wrong `covers.hook` value (for example it says `"PostToolUse"` but the hook was registered for `"PreToolUse"`), the G3 check at Gold will report missing coverage for the registered event. Correct the `covers.hook` value to match the registration and re-run the gate before step 4.

Why after step 2: `askit-build-samples` must know the registered event name to produce the correct `covers.hook` value. The event is not known until step 2 chooses and registers it. Authoring the eval before step 2 creates a guessed event name that is likely to be wrong.

**Step 4: `askit-evaluate` (conformance mode)**

Input: plugin root.

Output: per-rule conformance report and tier.

Exit criterion: 0 errors on the plugin root. At Gold, the G3 `library-regression` check reads every `evals/*.eval.json` and confirms that each registered hook event has at least one eval entry with a matching `covers.hook` value. A missing or mismatched eval is a G3 error. At lower tiers, G3 is not yet in scope, but the eval file is already required by the arc so Gold is not a surprise.

Failure: a G3 error naming a hook event means the eval file in step 3 is either missing, has the wrong `covers.hook` value, or was produced for a hook event that was later renamed. Return to step 3 and re-run `askit-build-samples` with the correct event string.

## The G3 consequence, stated plainly

At Gold, the `library-regression` check (G3) requires at least one `evals/*.eval.json` whose `"covers"` key names every registered hook event. This toolkit's own `evals/no-dashes-hook.eval.json` (which carries `"covers": {"hook": "PreToolUse"}`) is the operational example of this shape. The eval obligation is not a test of whether the hook works; it is evidence that someone specified the hook's expected behavior in an inspectable artifact. A hook registered without a matching eval is a gap the gate flags at Gold but silently ignores below Gold. Authoring the eval in the same arc that creates the hook (step 3) prevents that surprise.

## Why this order matters

Step 2 must follow step 1 because the hook guards the skill that step 1 creates. Step 3 must follow step 2 because the eval must name the registered event, which is not known until step 2 commits to a specific event. Step 4 must come last because it validates the complete state: skill, hook registration, and eval coverage all present together.

## Exit criteria

`askit-evaluate` (step 4) reports 0 errors on the plugin root. `evals/<hookname>.eval.json` exists with `"covers": {"hook": "<event>"}` equal to the event registered in step 2.
```

## Why this is golden

- **Sec 3.4 and 3.8:** the workflow description states the arc AND when to run it ("Use when adding a skill that needs a PreToolUse or PostToolUse guard alongside it"). The `steps` sequence is a flat list of all four skills; S5 would validate each exists on disk.
- **G3 eval obligation made explicit (sec 3.5, Gold G3):** the body names the exact eval shape the G3 check consumes, cites the real `evals/no-dashes-hook.eval.json` as the reference, and explains the failure mode (wrong `covers.hook` value). The gate is silent on this at Bronze and Silver; the body is where the author commits to the obligation before Gold scope arrives.
- **Artifact handed between steps is the right granularity (craft doc):** step 2's artifact is the hook event name as a string, not "the hook configuration." The string is the precise value step 3 needs; "the hook configuration" is a mood, not a handoff.
- **`agent-targets: [claude]` narrowed with rationale:** Claude supports 31 hook events; Codex supports a subset and hook ingestion is a known caveat. The body says so, so a future maintainer knows why the arc is narrow and can revisit when Codex coverage improves.
- **S5 (workflow-skills) would pass:** every skill in `steps` exists on disk. Verified by hand below.

## Verification

Skills listed in `steps` verified on disk:

```
$ ls skills/askit-build-skill/SKILL.md
skills/askit-build-skill/SKILL.md

$ ls skills/askit-build-hook/SKILL.md
skills/askit-build-hook/SKILL.md

$ ls skills/askit-build-samples/SKILL.md
skills/askit-build-samples/SKILL.md

$ ls skills/askit-evaluate/SKILL.md
skills/askit-evaluate/SKILL.md
```

Real eval format confirmed from `evals/no-dashes-hook.eval.json` in the worktree (file read directly; the shape shown in the body is the actual file content).

Frontmatter parsed with `node -e "import('./scripts/lib/frontmatter.mjs').then(m=>{const fs=require('fs');const f=fs.readFileSync('<scratch>/wf-golden3.md','utf8');console.log(JSON.stringify(m.parseFrontmatter(f).frontmatter,null,2))})"`:

```json
{
  "name": "skill-with-guard",
  "description": "Authors a new skill, adds a companion guard hook for a tool-use event, creates the eval set including hook event coverage, and confirms the plugin is clean. Use when adding a skill that needs a PreToolUse or PostToolUse guard alongside it.",
  "metadata": {
    "version": "0.1.0",
    "tier": "convergent",
    "status": "active",
    "agent-targets": [
      "claude"
    ]
  },
  "steps": [
    { "skill": "askit-build-skill" },
    { "skill": "askit-build-hook" },
    { "skill": "askit-build-samples" },
    { "skill": "askit-evaluate" }
  ]
}
```

`steps` is a YAML sequence; each element is a mapping with `skill:`. S5 reads exactly this shape.

No relative markdown links in this file (all file paths written as inline code).
