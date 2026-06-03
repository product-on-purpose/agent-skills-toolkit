---
title: "Adopt a foreign repo"
description: "Bring an existing skills repository to the Standard with `askit-migrate`."
audience: engineer
level: intermediate
---

# How to adopt a foreign repo

Bring an existing skills repository to the Standard with `askit-migrate`.

## Assess the gap

Invoke `askit-migrate` (assess mode). It inventories the repo (skills, commands, subagents, hooks, MCP, instructions, any manifest), maps each to a Standard component type, and reports what is missing for Bronze, then Silver. If a `library.json` already exists it runs `askit-evaluate` for the per-rule findings; if not, it reports the pre-manifest gaps and you run assess again after adopt.

## Plan the migration

Invoke `askit-migrate` (plan mode) to order the gaps into a staged roadmap: Bronze first (make it parse and self-describe), then Silver (cross-agent shape and the prefix), then the optional tail. Each step names its resolver, so the plan reads as a checklist of `askit-build-*` invocations and check fixes.

## Adopt (make it gradeable)

Invoke `askit-migrate` (adopt mode) to write the Bronze-minimal `library.json` (exactly the U1-required fields: name, version, description, standard, tier) and a root `AGENTS.md` if absent, so the conformance core can grade the repo. The Convergent-only fields (prefix, agent-targets, a components index) and the native manifests come with the Silver step. From there, `askit-evaluate` drives the remaining findings to zero and the builders author what is missing.

## See also

- [`askit-migrate` reference](../reference/askit-migrate.md)
- [migration-workflow](../../skills/askit-migrate/references/migration-workflow.md)
- [climb-from-bronze-to-silver](climb-from-bronze-to-silver.md)
