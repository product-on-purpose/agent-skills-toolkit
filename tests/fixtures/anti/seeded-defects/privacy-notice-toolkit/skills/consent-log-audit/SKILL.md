---
name: consent-log-audit
description: Audits an exported marketing consent log for expired retention windows, withdrawn consents still marked active, and rows missing a lawful basis, and returns the rows that need action. Use when a user asks to audit, check, or clean a consent log or a consent export before an assessment.
metadata:
  version: 0.2.0
---

# consent-log-audit

Read an exported consent log and return the rows a human has to act on before an assessment. The
audit is read-only: it never edits the export and never writes back to the consent platform.

## Before you start

Confirm the export carries every column in [the log schema](references/log-schema.md). An export
missing `renewed_at` is a partial export, and the audit says so instead of guessing.

## Procedure

1. Load the export and confirm the column set against the schema.
2. Drop every row whose `consent_state` is `withdrawn`. A withdrawn consent has nothing left to
   expire, and leaving it in the working set double-counts it in the summary.
3. For each remaining row, compute the retention deadline as
   `expires_at = granted_at + retention_days`.
4. Report every row whose `expires_at` is in the past as an expired consent that must be
   re-collected before the record is used again.
5. Report separately every row with no `lawful_basis`, and every row whose `consent_state` is
   `active` but whose `withdrawn_at` is populated. Those two are data-quality defects, not
   retention defects, and they are fixed in the platform rather than by re-collecting.

## Output

A table of rows needing action, grouped by the three categories in steps 4 and 5, with a count per
category and the oldest offending row per category. Do not paste the whole export back.
