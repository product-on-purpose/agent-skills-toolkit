# Quick start

From zero to a graded plugin in a few minutes. Install the toolkit, grade a plugin against the Standard, then start a new plugin or bring an existing skills repo up to the bar.

New here? Read [What it is](README.md#what-it-is) in the README first. For the full normative rules, see [`STANDARD.md`](STANDARD.md).

## 1. Install

The toolkit installs on Claude Code and Codex - it ships both native manifests. You **add** the marketplace by its repo path, then **install** by the marketplace identity (`@product-on-purpose`): the path is the address, the identity is the brand.

```bash
# Add the marketplace once (by repo path)
/plugin marketplace add product-on-purpose/agent-plugins

# Install the toolkit (by marketplace identity)
/plugin install agent-skills-toolkit@product-on-purpose
```

## 2. Grade a plugin

Grading tells you the highest tier a plugin satisfies (Bronze / Silver / Gold) and a burndown of exactly what blocks the next tier. There are two ways to run it, and both run the same checks.

**Ask your agent.** Invoke the `askit-evaluate` skill - run the `/askit-evaluate` command, or just say "grade this plugin against the Standard." It runs the deterministic core and presents the tier, the burndown to the next tier, and per-rule remediation.

**Run the script.** The same gate is a portable script you can run directly - in CI, a pre-commit hook, or a plain terminal, anywhere Node 22.12+ runs (one runtime dependency, a YAML parser). From the plugin's root:

```bash
node scripts/check.mjs              # the tier + what blocks the next one, on a real exit code
node scripts/tier-report.mjs --json # the same result as JSON for tooling
```

A clean Gold plugin reports:

```
Tier: Advanced (no blockers detected)

0 error(s), 0 warning(s).
```

The skill is the door; the script is the engine. Only a deterministic gate with a real exit code can run in CI and let a plugin prove itself.

## 3. Then build

Pick the path that matches where you are.

**Start a new plugin.** Scaffold a Bronze-anatomy plugin from scratch and onboard yourself by interview, questionnaire, or hybrid mode. Invoke `askit-init-plugin`, or just ask your agent to "start a new plugin." It writes a minimal `library.json` (the five required fields) plus a root `AGENTS.md` and README/CHANGELOG starters, so the new plugin passes the conformance core from the first commit. Then add your first skill with `askit-build-skill` and re-run the grade to confirm Bronze.

**Bring an existing skills repo up to the bar.** Adopt an ad-hoc or foreign skills repo into a conformant plugin. Invoke `askit-migrate`, or ask your agent to "migrate this repo to the Standard." It runs in three modes:

- `assess` - survey the repo, map each piece to a Standard component type, and report the gap (Bronze blockers first, then Silver).
- `plan` - order the gaps into a staged roadmap and name the `askit-build-*` skill or check that closes each one.
- `adopt` - write the minimal canonical `library.json` and a root `AGENTS.md` if absent, so the repo becomes gradeable and the rest of the plan can run through `askit-evaluate` and the builders.

From there, the `askit-build-*` family adds each component to the Standard, and the grade tells you when you have cleared the next rung.

## Where to go next

- **Tutorials** - [`docs/tutorials/`](docs/tutorials/) for guided, start-to-finish lessons: [build your first skill](docs/tutorials/build-your-first-skill.md), [start a plugin and reach Bronze](docs/tutorials/start-a-plugin-and-reach-bronze.md), then [climb to Gold](docs/tutorials/climb-to-gold.md).
- **How-to guides** - [`docs/how-to/`](docs/how-to/) has task-focused walkthroughs: [scaffold a plugin](docs/how-to/scaffold-a-plugin.md), [adopt a foreign repo](docs/how-to/adopt-a-foreign-repo.md), [build and evaluate a skill](docs/how-to/build-and-evaluate-a-skill.md), [climb from Bronze to Silver](docs/how-to/climb-from-bronze-to-silver.md), and more.
- **Live docs site** - [product-on-purpose.github.io/agent-skills-toolkit](https://product-on-purpose.github.io/agent-skills-toolkit/) for the published guides, per-component reference, and explanation.
- **The README** - [`README.md`](README.md) for what the toolkit is, the tier model, and the full catalog.
- **The Standard** - [`STANDARD.md`](STANDARD.md) for the normative rules every tool here enforces.
