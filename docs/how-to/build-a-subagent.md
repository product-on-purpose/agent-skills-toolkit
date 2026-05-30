# How to build a subagent

A walkthrough of creating a conformant `agents/<name>.md` delegate, wiring it into
the chain contract, and reaching 0 S3/S4 errors.

## When to reach for a subagent vs a skill

A **skill** is a reusable instruction set that any caller can invoke directly. A
**subagent** is a bounded delegate with its own tools and prompt that Claude
auto-discovers and makes @-mentionable. Reach for a subagent when the job needs a
tightly scoped tool set that differs from the caller's, when you want to enforce a
read-only or write-only boundary, or when the work is complex enough to benefit from
a separate focus point.

Examples from this toolkit: `skill-author` carries `Read`/`Write`/`Edit`/`Bash`
for scaffolding; `evaluator` carries only `Read`/`Bash` and is intentionally
prevented from mutating what it grades.

The Claude-only constraint (Standard sec 3.3) applies: Codex v0.135 plugins cannot
ship subagents (`plugin.json` has no `agents` field; `[agents.*]` is a user-level
`config.toml` concern). Declare `agent-targets: [claude]` in the frontmatter. No
Codex artifact is generated.

## 1. Create

Invoke `askit-build-subagent` (create mode). It asks for the name (kebab-case), the
bounded job, the narrowest tools needed, and which components (if any) it may
invoke. It then scaffolds `agents/<name>.md` from `templates/agent.md`.

You can also scaffold manually:

    cp templates/agent.md agents/<name>.md

Then fill the frontmatter fields:

- `name` - kebab-case, equal to the file basename (no `.md`).
- `description` - what the subagent does AND when to delegate to it, with trigger
  keywords (Standard sec 8.1). Third person.
- `tools` - the narrowest list the role requires (Standard sec 9). Document the
  reason for each in the `## Tools` body section.
- `model` - optional; omit to inherit the caller's model.
- `chain` - list of component names this subagent may invoke. Omit entirely if it
  invokes nothing.
- `metadata.version`, `metadata.tier`, `metadata.status`, `metadata.agent-targets: [claude]`.

## 2. Declare in library.json

Add the subagent to `library.json` under `components.subagents`:

```json
"subagents": [
  { "name": "<name>", "path": "agents/<name>.md", "version": "0.1.0", "tier": "convergent", "status": "active" }
]
```

S3 checks that every on-disk `agents/<name>.md` (with a valid frontmatter `name`)
is declared here, and that every declared entry exists on disk. An undeclared
subagent or a dangling declaration both fail S3.

## 3. Add to the chain contract (if it invokes another component)

If the subagent's frontmatter declares a `chain:`, add a matching entry to
`agents/_chain-permitted.yaml`:

```yaml
<name>:
  - <component-it-invokes>
```

S4 flags any `chain:` invocation that is not permitted by the contract as an
**orphan**. It also flags any contract entry that names a component not on disk as a
**phantom**. Both are S4 errors. If the subagent invokes nothing, skip this step and
omit `chain:` from the frontmatter.

## 4. Validate

    node scripts/evaluate.mjs . --json

Look at the findings array. An S3 error means the `components.subagents` index is
out of sync with disk - check the declared name and path match exactly. An S4 orphan
means a `chain:` entry has no corresponding contract permission - add the line to
`_chain-permitted.yaml`. An S4 phantom means the contract names something not on
disk - fix the name or create the missing component.

Iterate until the report shows `0 error(s)`.

## 5. Claude-only distribution note

Because `agent-targets: [claude]` is the only valid declaration for a
plugin-distributed subagent, `askit-build-subagent` never calls `gen-manifest.mjs`
for the subagent itself. The plugin's own per-target manifests (`.claude-plugin/` and
`.codex-plugin/`) are unaffected. The S6 per-target manifest check remains at the
plugin level; component-level S6 coverage for subagents is a later phase.

## See also

- [`askit-build-subagent` reference](../reference/askit-build-subagent.md)
- [`askit-build-skill` reference](../reference/askit-build-skill.md)
- [Silver checks reference](../reference/silver-checks.md)
- [How to build and evaluate a skill](build-and-evaluate-a-skill.md)
