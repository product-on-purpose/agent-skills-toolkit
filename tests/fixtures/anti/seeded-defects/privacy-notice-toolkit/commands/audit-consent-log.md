---
description: Audit an exported consent log and return the rows that need action before an assessment.
argument-hint: <path-to-export>
---

# /audit-consent-log

Runs `skills/consent-log-audit` over the export at `$1`.

## Before you run it

The export must carry the full column set, including `renewed_at`. An export from a platform that
does not record renewals cannot be audited for retention, only for data quality.

## Output

Three groups: expired retention windows, rows missing a lawful basis, and rows whose state and
timestamps disagree. Each group carries a count and its oldest offending row.
