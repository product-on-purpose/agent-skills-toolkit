# Migration workflow (reference)

Adopt an existing repository into a Standard-conformant plugin. The three modes (`assess`, `plan`, `adopt`) form one arc: see what is there, decide the order, make it gradeable.

## The conformance gap, by tier

The Standard grades a plugin Bronze (Universal), Silver (Convergent), then Gold. Migration closes the gap bottom-up, because each tier assumes the one below it.

### Bronze (make it parse and self-describe)
- A parseable `library.json` at the root (U1).
- A root `AGENTS.md` (U2, every tier).
- Every skill has valid frontmatter: a `name` (1-64 chars, lowercase kebab) and a `description` (1-1024 chars) (U3).
- Each skill's `name` equals its directory (U4).
- Each skill description scores at the quality bar (U5, a warning): a recognized action verb plus a "use when" clause.
- Reference links in a `SKILL.md` body resolve (U6).
- No em-dashes or en-dashes in committed `.md` / `.mjs` (U10).

### Silver (cross-agent shape)
- `agent-targets` declared in `library.json` (S1): `claude`, `codex`, or both.
- A plugin `prefix` (kebab-case ending in a hyphen) carried by every component name (S2).
- A `components` index in `library.json` that matches disk in both directions (S3).
- A chain contract (`agents/_chain-permitted.yaml`) if any component declares a `chain:` (S4).
- Every workflow step names a skill that exists (S5).
- Each declared target has its native manifest on disk (S6): `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`.

## assess

Inventory first, then map. A foreign repo rarely uses the Standard's directory names, so classify by content:

| Found | Standard type | Canonical home |
|---|---|---|
| `SKILL.md` (frontmatter + body) | skill | `skills/<name>/SKILL.md` |
| slash-command markdown | command | `commands/<name>.md` |
| agent / delegate definition | subagent | `agents/<name>.md` |
| event script + registration | hook | hooks config |
| MCP server config | MCP | `.mcp.json` |
| `AGENTS.md` / `CLAUDE.md` | instructions | root |

If a `library.json` exists, run `node scripts/evaluate.mjs <repo> --json` and read the per-rule findings. If it does not, the conformance core cannot grade the repo yet; report the pre-manifest gaps (no manifest, no prefix, unclassified components) and proceed to `adopt`, then re-run `assess`.

## plan

Stage the work so the repo is shippable at each tier boundary:

1. **To Bronze:** write `library.json` + `AGENTS.md` (`adopt`), then fix frontmatter, directory names, and broken links. Re-run `askit-evaluate` until Bronze is clean.
2. **To Silver:** declare `agent-targets`; choose and apply the prefix (a deliberate rename, slice by slice); build the `components` index; emit native manifests (`gen-manifest`); add a chain contract only if chaining is used.
3. **Optional tail:** hooks, workflows, a docs site, samples.

For each gap, name the resolver: the `askit-build-<type>` skill authors a missing component; the failing check's message states the fix; `askit-evaluate` re-confirms. Record the plan in the repo (a backlog or a migration note) so it is resumable.

## adopt

The smallest change that makes the repo gradeable:

- A minimal `library.json`: `name`, `version` 0.1.0, a `prefix` (kebab-case ending in a hyphen), `agent-targets`, and a `components` index built from the inventory.
- A root `AGENTS.md` if absent.
- `node scripts/generators/gen-manifest.mjs . --write --target=all` to emit the native manifests for the declared targets.

Then hand off: `askit-evaluate` drives the findings to zero and the `askit-build-*` skills author what is missing. `adopt` deliberately does not rename components wholesale or rewrite skill bodies; those are slice-by-slice steps in the plan, each separately verifiable.

## Boundary with init

`askit-migrate` adopts an existing repo. Scaffolding a brand-new plugin from an interview is `askit-init-plugin`. The split keeps each skill's job legible: migrate reconciles what already exists with the Standard; init starts from nothing.
