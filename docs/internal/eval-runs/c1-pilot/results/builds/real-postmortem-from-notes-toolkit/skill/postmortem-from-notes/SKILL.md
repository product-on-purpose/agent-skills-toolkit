---
name: postmortem-from-notes
description: Turns rough, incomplete incident notes (pasted chat logs, outage bullet lists, event lists) into a blameless postmortem with fixed sections, role-only names, and UNKNOWN markers for missing facts. Use when the user pastes notes from an outage or incident and asks for a write-up, postmortem, incident review, RCA, or retro, even if they never say "postmortem".
metadata:
  version: 0.1.0
  tier: universal
  audience: beginner
---

# postmortem-from-notes

## Purpose
Convert thin incident notes into one blameless postmortem that follows the house format. The notes are usually incomplete, so the main job is to report what is known and mark what is not. Never invent.

## When to use
The user gives incident notes, chat excerpts, or a list of events and wants a write-up, incident review, postmortem, RCA, or retro. Do not wait for the word "postmortem". Do not ask questions; no one will answer. Decide and write the document.

## Steps
1. Read all the notes. Build a private list of: events with times, the timezone (if any), who did what, what broke, who was affected, what fixed it, and any dates.
2. Replace every person with a role (for example "on-call engineer", "incident commander", "database owner", "support lead"). Pick the role from what the person did. If it is unclear, use "responder". Never write a personal name anywhere, including in Actions and in `UNKNOWN - ask <role>`.
3. Write the six sections in exactly this order, using these headings: `## Summary`, `## Impact`, `## Timeline`, `## Contributing factors`, `## What went well`, `## Actions`. No extra sections, no reordering. Field rules are in [references/format-and-rules.md](references/format-and-rules.md); read it before writing.
4. Mark gaps. Any fact the notes do not give is written exactly as `UNKNOWN - ask <role>`, naming the role best placed to know. Do not guess numbers, durations, causes, or times. If a section has nothing, write `UNKNOWN - ask <role>` there rather than leaving it blank or padding it.
5. Run the checklist below on your draft and fix failures.
6. Output ONLY the postmortem, starting with the `## Summary` heading and ending after the Actions table. No title, preface, "here is", closing notes, suggestions, or explanation of your choices. Such text is where personal names and invented content leak in. Do not add extra sections (no Detection, Root cause, Status, Severity, Authors, Date headers).

## Inline rules (so this works even if the reference cannot be opened)
- Timeline: first line `Timezone: <tz>` as given in the notes (UTC, PST, CET...), else `Timezone: UNKNOWN`. Then `- HH:MM - event`, oldest first. Untimed event: `time UNKNOWN - ask <role>`.
- Impact: only what the notes state; otherwise `UNKNOWN - ask <role>`. A requested numbers or fault claim the notes lack is UNKNOWN.
- Blameless: if the user or notes say a person caused it, restate as the missing check, guardrail, alert, or process. "Derek skipped the migration" becomes "the pipeline had no migration check". Do not name the person even to refuse.
- Actions table: `| Action | Owner role | Type | Due |`. Owner is a role (a named owner "Lena (SRE)" becomes `SRE`). Type is Prevent, Detect, or Mitigate. Due is `UNKNOWN` unless the notes give a date; copy a given date as written.
- Actions: list ONLY actions the notes state or name as follow-ups. Do not add your own suggestions, even sensible ones. Owner role: use a role only if the notes state it (title, team, or clear duty such as "Lena (SRE)" -> `SRE`). A bare name with no stated role, or no owner, is `UNKNOWN - ask engineering manager`. Never guess a role.
- Unconfirmed cause: say "not confirmed" and give `UNKNOWN - ask <role>`; do not present guesses as fact.

## Checklist (all must be true)
- Sections are exactly Summary, Impact, Timeline, Contributing factors, What went well, Actions, in that order.
- Summary is at most 3 sentences.
- Timeline is in time order and states the timezone on its first line: `Timezone: <tz>`, or `Timezone: UNKNOWN` if the notes give none.
- No personal name appears anywhere. Search your draft for each name in the notes.
- No contributing factor blames or implies fault in a person (no "forgot", "failed to", "careless", "mistake by"). State the system or process condition instead.
- Every missing fact is `UNKNOWN - ask <role>`; nothing is invented.
- Actions is a table with columns `Action | Owner role | Type | Due`; Type is Prevent, Detect, or Mitigate; Due is `UNKNOWN` unless the notes give a date.

## References
- [references/format-and-rules.md](references/format-and-rules.md): per-section rules, the Actions table, blameless rewrites, and a worked example.
