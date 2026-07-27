# Golden example: AGENTS.md for a multi-component plugin

**Demonstrates:** authoring a tight, conformant AGENTS.md for a plugin that has skills, a Claude-only subagent, and a command, using the five-section layout with positive-instruction discipline and the `sync-agents-md` regeneration step.
**Provenance:** authored by `askit-build-agents-md` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

The user asked:

> Write AGENTS.md for my `issue-triage` plugin. It has three skills (it-classify, it-suggest-labels, it-draft-response), one Claude-only subagent (it-classifier) that it-classify delegates to, and one command /it-classify. Node 22+. The manifest source of truth is library.json; native manifests are generated. Run `npm test` and `node scripts/check.mjs .` to validate.

| Interview question | Answer |
|---|---|
| What is the project? | `issue-triage`: three skills for GitHub issue routing, one Claude-only subagent |
| Runtime? | Node >= 22.12.0; no build step |
| Build / test / lint commands? | `npm test`; `node scripts/check.mjs .` |
| Source of truth / manifest? | `library.json`; `.claude-plugin/plugin.json` is generated from it |
| Working scratch? | gitignored `_local/` |
| Known gotcha? | Do not hand-edit the generated native manifest |

## Output

### `AGENTS.md`

```markdown
# AGENTS.md - issue-triage

Instructions and navigation for any agent (Claude Code, Codex, Gemini CLI,
GitHub Copilot, Cursor) working in this repository.

## What this is

`issue-triage` is an agentskills.io plugin with three skills for automated
GitHub issue routing: `it-classify` (routes an issue to a team), `it-suggest-labels`
(proposes label assignments), and `it-draft-response` (drafts a first-responder
reply). `it-classify` delegates the model-intensive classification step to the
`it-classifier` subagent.

## Current state (read before assuming capabilities)

Components present on disk:

- **Skills:** `it-classify`, `it-suggest-labels`, `it-draft-response`
- **Subagent:** `it-classifier` (Claude-only, `agent-targets: [claude]`)
- **Command:** `/it-classify` (`commands/it-classify.md`, maps to `it-classify`)
- **Chain contract:** `agents/_chain-permitted.yaml` permits
  `it-classify -> it-classifier`

Do not invoke `it-classifier` directly; it is the bounded delegate behind
`it-classify`.

## Conventions

- **Runtime:** Node >= 22.12.0; no build step required.
- **Manifest:** `library.json` is the canonical source of truth. The native
  manifest (`.claude-plugin/plugin.json`) is GENERATED from it - do not edit
  it by hand. Regenerate after any component change:
  `node scripts/generators/gen-manifest.mjs . --write --target=claude`
- **Component list (this section):** regenerated from the manifest via
  `node scripts/generators/sync-agents-md.mjs` - rerun after adding or removing
  components rather than hand-editing this list.
- **Working scratch:** session notes and design drafts live in the gitignored
  `_local/` tree and must never be committed.

## Build / test / lint

- `npm test` - run the unit suite.
- `node scripts/check.mjs .` - the aggregate conformance gate; fails on any
  error and surfaces warnings. Run after any component change.

## Where to look

- `library.json` - canonical component registry.
- `STANDARD.md` - the normative Advanced Skill Library Standard.
- `INDEX.md` - human map of the repository.
- `agents/_chain-permitted.yaml` - inter-component invocation contract.
```

## Why this is golden

- **Five required sections all present** (sec 3.10, `authoring-agents-md.md`): "What this is," "Current state," "Conventions," "Build / test / lint," and "Where to look" each earn their place because they carry information an agent cannot infer from the code alone.
- **Brevity and positive framing** (`authoring-agents-md.md`, ETH-Zurich principle): one prohibition appears ("Do not invoke `it-classifier` directly") and it is concrete and necessary. Every other instruction is positive - what TO do, not what NOT to do.
- **sync-agents-md generator called out** (G1, U3): the Conventions section names the exact generator command so the component list stays in sync with `library.json` without hand-editing; this mirrors the single-source-of-truth principle that prevents drift.
- **Cross-tool surface declared** (sec 3.10): the opening paragraph names all five major agents (Claude Code, Codex, Gemini CLI, GitHub Copilot, Cursor), making the portability of AGENTS.md explicit rather than implied.
- **Chain contract surfaced in "Where to look"** (S4): `agents/_chain-permitted.yaml` is listed so an agent can find the invocation contract without scanning the whole repo; this supports the S4 orphan/phantom discipline.

## Verification

Verify the builder skill exists:

```
$ ls skills/askit-build-agents-md/SKILL.md
skills/askit-build-agents-md/SKILL.md
```

Verify the `sync-agents-md` generator script exists (referenced in the Conventions section):

```
$ ls scripts/generators/sync-agents-md.mjs
scripts/generators/sync-agents-md.mjs
```

AGENTS.md carries no YAML frontmatter (it is plain markdown, not a SKILL.md), so there is no frontmatter block to parse and no U5 description score to measure. The builder's own SKILL.md description scores at the gate level, not the authored AGENTS.md.
