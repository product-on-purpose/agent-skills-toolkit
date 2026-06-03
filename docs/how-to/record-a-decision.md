---
title: "Record a decision"
description: "Capture an architecture decision as a numbered MADR ADR, or propose a change via an RFC (Standard sec 10.4)."
audience: engineer
level: intermediate
---

# How to record a decision

Capture an architecture decision as a numbered MADR ADR, or propose a change via an RFC (Standard sec 10.4).

## Record an ADR

Invoke `askit-decision` (adr mode). It picks the next number (`docs/internal/decisions/NNNN-title.md`), authors the MADR record from `templates/adr.md`, and adds the mandatory `## TL;DR` (Decision / Why / Status). ADRs are immutable once accepted - to change one, write a new ADR that supersedes it.

## Propose via RFC

Invoke `askit-decision` (rfc mode) for a cross-cutting proposal (a Standard amendment, a new convention). It drafts the RFC under `docs/internal/rfcs/`; on acceptance, graduate the outcome to an ADR.

## Add a TL;DR

Invoke `askit-decision` (summary mode) to emit or lint the 3-line TL;DR on a long decision doc, so the summary and detailed body stay in sync.

## See also

- [`askit-decision` reference](../reference/askit-decision.md)
- [authoring-decisions](../../skills/askit-decision/references/authoring-decisions.md)
