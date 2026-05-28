# Reference: Silver (Convergent) conformance checks

Five checks (S1-S5) earn Silver tier. Each fires findings tagged `reqId: "S<n>"`; tier-report buckets them into the `convergent` tier and lists unmet ones in `blocked.convergent`.

| reqId | Module | What it checks | Standard | Conditional? | Example fix |
|---|---|---|---|---|---|
| S1 | `scripts/checks/agent-targets.mjs` | `library.json.agent-targets` is a non-empty array of `claude`/`codex` | sec 5.1, sec 2.2 | no | Add `"agent-targets": ["claude", "codex"]` to `library.json`. |
| S2 | `scripts/checks/prefix.mjs` | `library.json.prefix` is lowercase kebab-case ending in `-` | sec 8.2 | no | Add `"prefix": "<short>-"` to `library.json` (e.g. `"askit-"`). |
| S3 | `scripts/checks/components-index.mjs` | `library.json.components.skills` index matches on-disk `skills/` | sec 5.1, sec 10.3 | no | Run `node scripts/generators/gen-manifest.mjs . --write` to refresh the resolved manifest, then ensure `library.json.components.skills` lists each on-disk skill with `{name, path, version, tier, status}`. |
| S4 | `scripts/checks/chain-contract.mjs` | `agents/_chain-permitted.yaml` has no phantom entries; present when workflows exist | sec 3.6 | yes (chaining-in-use) | Either remove the unused contract entry, or add the missing component on disk. |
| S5 | `scripts/checks/workflow-skills.mjs` | Workflows reference only on-disk skills | sec 3.4 | yes (workflows exist) | Fix the workflow's `steps:` list to reference an existing skill name. |

Findings cite their Standard section in the message, so an agent reading a report can navigate to the rule. Convergent errors do NOT fail the gate at the Universal tier - they appear in `blocked.convergent` until the plugin declares `convergent` and addresses them.
