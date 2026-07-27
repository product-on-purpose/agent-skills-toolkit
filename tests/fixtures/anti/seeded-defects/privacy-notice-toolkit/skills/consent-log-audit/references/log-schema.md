# The consent log export schema

The column set [the consent-log audit](../SKILL.md) expects. Our platform exports these columns in
this order; an export from another platform has to be mapped onto them before the audit runs.

| Column | Type | Meaning |
| --- | --- | --- |
| `subject_id` | string | The pseudonymous identifier for the data subject. |
| `channel` | enum | `email`, `sms`, or `postal`. |
| `consent_state` | enum | `active`, `withdrawn`, or `pending`. |
| `lawful_basis` | enum | `consent` or `legitimate_interest`. Empty is a defect. |
| `granted_at` | date | When the subject first gave consent on this channel. |
| `renewed_at` | date | When the subject last reconfirmed consent. Empty when never renewed. |
| `withdrawn_at` | date | When the subject withdrew. Empty unless `consent_state` is `withdrawn`. |
| `retention_days` | integer | The retention window agreed for this channel. |

## The retention clock

A renewal restarts the retention clock. The retention window runs from `renewed_at` when that
column is populated, and from `granted_at` only when it is empty. A subject who reconfirmed last
month has a fresh window even when the original grant is years old, so a record must never be
treated as expired on the strength of its `granted_at` date alone.

## Withdrawal

A withdrawal ends the consent immediately. The row stays in the export for the audit trail, but it
is out of scope for this audit: deletion of the marketing record after a withdrawal is tracked in
the deletion queue and reported from there, not here.
