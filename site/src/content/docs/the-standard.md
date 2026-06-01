---
title: The Standard
description: The component model and the design principles behind the Advanced Skill Library Standard.
---

The Advanced Skill Library Standard defines how to structure a plugin as an advanced skill library that goes beyond a flat collection of standalone skills.

## The two-axis model

- **Structure:** a *component* (the atomic building block and unit of reuse) sits inside a *plugin* (the package with a manifest and the one version, the unit of release), which a *marketplace* catalogs.
- **Quality:** a *skill library* is not a separate artifact. It is the grade a plugin earns by conforming - Bronze, Silver, or Gold.

So the path is: loose components, then a plugin, then a graded library.

## Components

The Standard specifies each component type: skills, slash commands, subagents, hooks, workflows, chain contracts, MCP servers, and the `AGENTS.md` instructions entrypoint. Each has a required structure, a frontmatter contract, per-agent format notes, and validation rules.

## Design principles

- **Deterministic where objective; LLM where judgment.** Conformance, portability, and security are objective, so they are checked by portable scripts with no model in the loop (CI-safe). Domain fit, output quality, and triggering behavior are judgment, so they are delegated to an opt-in LLM layer that sits beside the gate and never returns a CI pass or fail.
- **One dispatcher, builders per type.** A single `evaluate` is the assessment front door; a `build-<type>` skill authors each component type with create and improve modes.
- **A la carte minimalism.** A plugin ships only what it needs. Governance files (a chain contract, for instance) are required only when the thing they govern is in use.

## Cross-agent, honestly

The Standard is concept-convergent and format-divergent across Claude Code and Codex. Skills, MCP, and `AGENTS.md` are portable on both. A command's Codex form is its backing skill. Subagents, output styles, and statuslines are Claude-only for plugin distribution. The toolkit encodes these facts so a plugin's claims match what the agents actually support.
