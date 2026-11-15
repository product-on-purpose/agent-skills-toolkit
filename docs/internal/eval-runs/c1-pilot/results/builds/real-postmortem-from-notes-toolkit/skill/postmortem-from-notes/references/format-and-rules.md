# Format and rules (reference)

## Per-section rules

**Summary** - at most 3 sentences: what broke, who or what was affected, how it ended. Unknown parts: `UNKNOWN - ask <role>`.

**Impact** - bullets of what the notes state: users, services, duration, money, data. Anything not stated is `UNKNOWN - ask <role>` (for example `Duration: UNKNOWN - ask incident commander`). Do not estimate duration from partial times unless both a start and an end time are in the notes.

**Timeline** - first line `Timezone: <tz>` (or `Timezone: UNKNOWN`). Then one entry per event, oldest first, as `- HH:MM - event`. If an event has no time, put it after the last timed event it must follow and write `time UNKNOWN - ask <role>`. If notes are out of order, sort them. Do not write a timezone the notes did not give, and do not convert times.

**Contributing factors** - conditions in systems, process, tooling, or monitoring that let the incident happen or last. Never a person. Do not claim a root cause the notes do not support; if the cause is unconfirmed write `Cause not confirmed - ask <role>`.

**What went well** - things the notes show worked (fast detection, good rollback, clear comms). If none are stated: `UNKNOWN - ask incident commander`.

**Actions** - a markdown table:

| Action | Owner role | Type | Due |
|---|---|---|---|

- Type is exactly one of Prevent (stop recurrence), Detect (notice sooner), Mitigate (reduce impact or speed recovery).
- Owner role is a role, never a name. If the notes do not say who owns it: `UNKNOWN - ask engineering manager`.
- Due is `UNKNOWN` unless the notes give a date. Never invent a date, and do not turn "next week" into a date.
- Use only actions the notes state. Do not add suggested actions of your own. Owner role only if the notes give a role/title/team; a bare name is `UNKNOWN - ask engineering manager`. If there are none, add one row: `Confirm follow-up actions | UNKNOWN - ask incident commander | Prevent | UNKNOWN`.

## Blameless rewrites

| Notes say | Write |
|---|---|
| "Dana pushed a bad config" | "A configuration change went out without a validation step" |
| "Sam forgot to renew the cert" | "Certificate expiry was not monitored or alerted on" |
| "Lee didn't escalate" | "The escalation path was unclear or not triggered by the alert" |

Roles replace names: "Priya (on call) rolled back" becomes "The on-call engineer rolled back".

## Worked example

Notes: `fri 3/7 checkout 500s. Marcus paged 14:05 PST. Jen found bad deploy, rolled back 14:40. ~2k orders failed? no alert fired, customer support noticed first`

Output:

## Summary
Checkout returned errors after a deploy, and was restored by a rollback. Support noticed the problem before any alert fired.

## Impact
- Roughly 2,000 orders may have failed (notes are uncertain): UNKNOWN - ask incident commander to confirm.
- Revenue impact: UNKNOWN - ask finance lead.

## Timeline
Timezone: PST
- Time UNKNOWN - ask incident commander: a deploy went out.
- 14:05 - The on-call engineer was paged.
- 14:40 - The deploy was identified as bad and rolled back.

## Contributing factors
- No alert covered checkout error rates, so detection depended on customer support.
- The deploy process did not catch the defect before release. Cause details: UNKNOWN - ask on-call engineer.

## What went well
- The rollback restored service after the bad deploy was identified.

## Actions
| Action | Owner role | Type | Due |
|---|---|---|---|
| Confirm follow-up actions (notes list none) | UNKNOWN - ask incident commander | Prevent | UNKNOWN |
