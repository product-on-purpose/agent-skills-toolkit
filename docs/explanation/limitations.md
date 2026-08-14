---
title: "What this toolkit cannot do"
description: "The honest boundary. What the deterministic gate does not check, what the advisory layer cannot guarantee, where the Standard is known to be wrong, and which limits are deliberate versus not yet built."
audience: both
level: beginner
tags: [limitations, scope, honesty, boundaries, gate, advisory, standard]
---

# What this toolkit cannot do

Every quality tool is a claim about what it can see. A tool that never states the other half is asking to be trusted further than it has earned.

This page is the other half. It is written to be read **before** you rely on a grade, not after a grade surprises you. Where a limit is deliberate, it says so and gives the reason. Where a limit is simply not built yet, it says that instead, and links the tracked item.

Nothing on this page is a caveat added to soften a claim. Each entry is a specific, checkable statement about where the tooling stops.

---

## 1. The gate checks structure, never quality

The deterministic gate (`node scripts/check.mjs`) answers one question: **does this plugin have the shape the Standard requires?** It does not, and cannot, answer whether the plugin is any good.

A plugin can pass every one of the 31 spine checks at Gold and still be useless. Concretely, a Gold-passing plugin may contain:

- a skill whose instructions are wrong
- a reference document that confidently states a falsehood
- two skills that do the same thing in incompatible ways
- a procedure that contradicts the schema it cites

The gate sees a well-formed `library.json`, a present `AGENTS.md`, resolvable links, valid frontmatter, and a documented hook. It does not read for sense.

**This is deliberate.** The gate is model-free by design (Design Principle 3): same input, same output, every time, on any machine, at zero token cost, in CI. Correctness-of-content is a judgment, and a judgment cannot be made deterministic. The moment the gate started weighing content, its verdict would stop being reproducible and the grade would stop meaning anything precise.

**What to do instead:** the advisory layer (`--report=review`) is the judgment pass, and it is explicitly *beside* the verdict, never inside it. See section 2 for what it can and cannot promise.

## 2. The advisory layer is measured, not guaranteed

The advisory layer dispatches a model to read a plugin the way a reviewer would. It is genuinely useful, and it is not a guarantee.

**What is measured.** Against a fixture with nine planted defects and three decoys, three model tiers at equal instructed effort produced:

| Cell | Precision | Recall | Confabulations |
|---|---|---|---|
| Haiku 4.5 / high | 0.83 | 0.38 | 0 |
| Sonnet 5 / high | 1.00 | 0.54 | 0 |
| Opus 5 / high | 1.00 | 0.62 | 0 |

Recall is well under 1.00 at every tier. **A clean advisory review is not evidence that a plugin is clean.** It is evidence that a reviewer of that tier, at that effort, on that day, found nothing.

**What is not guaranteed.** Advisory output can be wrong in both directions. The project's own record contains a high-effort run that mis-triaged eleven real link defects as checker false positives, and a cheap-tier run that invented a statute and certified it as verified. That is why the review contract requires every finding to state whether it was verified against a file or inferred, and why the methodology forbids acting on an advisory recommendation about the checker without independent proof.

**The numbers above are provisional.** The scorer currently credits nothing when one finding engages two planted defects, which penalises thorough reviews. See [E16 in the enhancement backlog](https://github.com/product-on-purpose/agent-skills-toolkit/blob/main/docs/internal/backlog/enhancements.md).

## 3. Known defects in the Standard's own checks

These are current, tracked, and stated here rather than discovered by you.

**`U5` (description scoring) assumes English.** The check awards 0.35 for a use-when trigger phrase, matched by an English-only pattern. Measured against a 349-skill French corpus, the pattern fired on **0 of 346** descriptions while 341 carried an explicit French trigger clause. A description in a language the pattern does not know is capped at 0.65 against a 0.7 bar, so it **cannot pass**, regardless of quality. English controls matched 705 of 1016.

`U5` is one check of thirty, carries `house` provenance (so `--profile plain-plugin` drops it entirely), and emits a warning rather than an error. But within the default profile the limit is absolute, not a bias. Tracked as `E14`; the fix requires a decision between language detection, a pluggable lexicon, or a language-independent structural signal. Adding French patterns is explicitly the wrong fix, because it would leave every other language in the same position.

**`G3`'s skill branch is a documented no-op.** The `library-regression` check has a branch for skills that does nothing. A plugin cannot rely on `G3` to grade its skills, and any plan that assumes otherwise is unsatisfiable as written.

**`U6` does not scan commands or subagents.** The link-rot check iterates skills only. A broken reference in a command body or a subagent body passes clean. Demonstrated: a command linking a nonexistent file, with the gate reporting 0 errors. Tracked as `E18`.

**Nothing resolves `.claude-plugin/plugin.json` component paths.** A Claude plugin manifest can declare `agents: ["./agents/does-not-exist.md"]` and the gate will pass. `U13` (skill-registration) covers the catalogued-but-undeliverable case for **skills only**, and only via `library.json` or `marketplace.json`. Tracked as `E19`.

## 4. There is no marketplace scope

The gate has exactly two scopes: **plugin** and **component**. There is no way to point it at a marketplace and have it grade the collection.

That means the following are manual today, however many plugins you have:

- checking that every member of a marketplace resolves
- grading each member and reading the results together
- detecting two members that ship a colliding skill or command name
- keeping each member's pinned version in step with the registry

See [managing several plugins](../how-to/manage-multiple-plugins.md) for the workflow that exists in the meantime, and what it costs. Marketplace scope is the headline of a planned release and is not built.

## 5. Cross-agent support is uneven, by necessity

The toolkit emits for Claude Code and Codex. Support is not symmetric, because the platforms are not symmetric:

- **Output styles are Claude-only.** Codex has no equivalent.
- **Codex plugins cannot carry subagents.** The Codex plugin format ships skills, hooks, MCP servers and apps, but has no `agents` field, so Codex subagents are `config.toml`-only and cannot travel inside a plugin.
- **Statuslines differ** between the two.
- **There is no Gemini emitter.** It is referenced in a forward-looking code comment and nowhere else.

A plugin declaring `agent-targets: ["claude", "codex"]` is asserting that its components exist in a form each agent can ingest. It is not asserting that both agents get an identical feature set.

## 6. Grading a plugin you do not own needs the right profile

Pointing the default profile at a third-party plugin will produce noise. The default ladder (`askit-library`) includes `house` provenance checks that encode this project's own conventions, and a plugin that never adopted the Standard has no reason to satisfy them.

Use `--profile plain-plugin`, which drops the house checks and grades only what is portable. The difference is not cosmetic: on one third-party target the same tree scored **10 errors** under `plain-plugin` and **1034** under the full ladder. A report produced with the wrong profile is not a finding about the plugin; it is a finding about the profile.

## 7. What the tooling will not decide for you

Deliberate boundaries, not gaps:

- **It never edits a target it is grading.** Advisory findings are reports; applying them is yours.
- **It cannot tell you whether a rule is worth having.** Adding, tightening, or retiring a check is an ADR decision by a person.
- **It does not publish or re-pin anything.** Marketplace registry updates are staged as instructions and executed by a human.
- **A grade is not an endorsement.** Bronze, Silver and Gold describe conformance to a written standard. They are not a safety review, a security audit, or a statement that the skills work.

## 8. How to read a limit on this page

| Kind | Meaning | Example |
|---|---|---|
| **Deliberate** | Built this way on purpose; the reason is stated and the tradeoff is accepted | The gate not judging content (section 1) |
| **Tracked** | A real defect with a backlog item; will change | `U5` English-only, `U6` skills-only |
| **Not built** | Absent capability, planned or not | Marketplace scope, Gemini emitter |

If you find a limit that is on none of these lists, that is worth reporting: an unstated limit is the failure this page exists to prevent.

## See also

- [Conformance and tiers](conformance-and-tiers.md) - what each tier does assert
- [Validation and improvement](validation-and-improvement.md) - how the deterministic and judgment layers divide the work
- [FAQ](faq.md) - shorter operational answers
- [Managing several plugins](../how-to/manage-multiple-plugins.md) - the multi-plugin workflow as it stands
