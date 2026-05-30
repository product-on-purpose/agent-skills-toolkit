# Reference: Silver (Convergent) conformance checks

Six checks (S1-S6) earn Silver tier. Each fires findings tagged `reqId: "S<n>"`; tier-report buckets them into the `convergent` tier and lists unmet ones in `blocked.convergent`.

| reqId | Module | What it checks | Standard | Conditional? | Example fix |
|---|---|---|---|---|---|
| S1 | `scripts/checks/agent-targets.mjs` | `library.json.agent-targets` is a non-empty array of `claude`/`codex` | sec 5.1, sec 2.2 | no | Add `"agent-targets": ["claude", "codex"]` to `library.json`. |
| S2 | `scripts/checks/prefix.mjs` | `library.json.prefix` is lowercase kebab-case ending in `-` | sec 8.2 | no | Add `"prefix": "<short>-"` to `library.json` (e.g. `"askit-"`). |
| S3 | `scripts/checks/components-index.mjs` | `library.json.components.skills` and `library.json.components.subagents` indexes match on-disk `skills/` and `agents/` respectively | sec 5.1, sec 10.3 | no | Ensure `library.json.components.skills` lists each on-disk skill and `library.json.components.subagents` lists each on-disk subagent, each with `{name, path, version, tier, status}`. An undeclared component or a dangling declaration both fail S3. |
| S4 | `scripts/checks/chain-contract.mjs` | `agents/_chain-permitted.yaml` has no orphan or phantom entries; contract is present when chaining is in use | sec 3.6 | yes (chaining-in-use) | Orphan: a frontmatter `chain:` invocation not listed under the caller in the contract - add the `<caller>: [<callee>]` entry. Phantom: a contract entry naming a caller or callee that matches no on-disk component - remove the stale entry or create the missing component. |
| S5 | `scripts/checks/workflow-skills.mjs` | Workflows reference only on-disk skills | sec 3.4 | yes (workflows exist) | Fix the workflow's `steps:` list to reference an existing skill name. |
| S6 | `scripts/checks/per-target-presence.mjs` | Each `agent-targets` entry has its native manifest on disk (`.claude-plugin/plugin.json` / `.codex-plugin/plugin.json`) | sec 5.1, sec 10.1 | yes (agent-targets declared) | Run `node scripts/generators/gen-manifest.mjs . --write --target=all` to generate the missing native manifest. |

**Subagents are Claude-only for plugin distribution (Standard sec 3.3).** Codex v0.135
plugins cannot ship subagents (`plugin.json` has no `agents` field;
`[agents.*]` is a user-level `config.toml` concern). A subagent declares
`agent-targets: [claude]` in its frontmatter. For S3, a subagent's presence on disk
as `agents/<name>.md` is what matters - there is no Codex artifact to cross-check.
The S6 dual-target component-level check does not apply to subagents in this phase;
S6 remains a plugin-manifest-level check.

Findings cite their Standard section in the message, so an agent reading a report can navigate to the rule. Convergent errors do NOT fail the gate at the Universal tier - they appear in `blocked.convergent` until the plugin declares `convergent` and addresses them.
