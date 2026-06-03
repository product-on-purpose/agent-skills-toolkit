---
title: "askit-decision"
description: "Authors and maintains a plugin's decision records (MADR ADRs) and RFCs in `docs/internal/` (Standard sec 10.4)."
audience: engineer
level: intermediate
---

# askit-decision (reference)

Authors and maintains a plugin's decision records (MADR ADRs) and RFCs in `docs/internal/` (Standard sec 10.4).

## Modes
- `adr`: pick the next number, author the MADR ADR (copy `templates/adr.md`), add the mandatory `## TL;DR`. Immutable once accepted; supersede rather than rewrite.
- `rfc`: draft a cross-cutting proposal under `docs/internal/rfcs/`; graduate the outcome to an ADR on acceptance.
- `summary`: emit/lint the 3-line TL;DR (Decision / Why / Status) on a long ADR or RFC (the summary-plus-detailed convention, ADR 0021).

## Notes
ADRs are numbered MADR records; RFCs are the proposal path. Every ADR carries a TL;DR. See the [record-a-decision how-to](../how-to/record-a-decision.md) and [authoring-decisions](../../skills/askit-decision/references/authoring-decisions.md).
