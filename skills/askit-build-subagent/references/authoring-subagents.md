# Authoring subagents (reference)

A subagent is a bounded delegate with its own tools and prompt, defined in `agents/<name>.md` (markdown + YAML frontmatter). Claude auto-discovers it and it is @-mentionable. Standard sec 3.3, 3.6, 3.8.

## Frontmatter contract (sec 3.8)
- `name` (kebab-case, equals the file basename).
- `description` (what + when + trigger keywords; sec 8.1).
- `tools` (the narrowest set the role needs; sec 9 - never grant more than the job requires).
- `model` (OPTIONAL; omit to inherit).
- `chain` (the components this subagent MAY invoke; declare only when it invokes another, and mirror it in `agents/_chain-permitted.yaml`).
- `metadata.version` (REQUIRED, semver), `metadata.tier`, `metadata.status`, `metadata.agent-targets: [claude]`.

## Claude-only (sec 3.3)
As of Codex CLI v0.135, a distributed plugin cannot register Codex subagents (`plugin.json` has no `agents` field; `[agents.*]` is user/project `config.toml` only). So a subagent shipped in a plugin targets Claude. Declare `agent-targets: [claude]`. There is no Codex artifact to generate.

## Chain safety (sec 3.6)
If a subagent (or a skill) invokes another component, that invocation MUST be permitted by `agents/_chain-permitted.yaml` (`caller: [callee, ...]`). Tooling flags a declared-but-unpermitted invocation as an orphan (S4) and a contract entry pointing at a missing component as a phantom.

## Tool scoping (sec 9)
Grant the fewest tools that let the role do its job. A read-only assessor needs read + the ability to run the validator, not write access. Document why each tool is present.
