---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

We finally want to clean up the tickets table. Plan for tonight:

ALTER TABLE tickets DROP COLUMN legacy_notes;
DROP TABLE tmp_import_2022;

tickets is about 8M rows with maybe 50 requests per second. The app code still has a few places that select legacy_notes but I'm pretty sure they're dead code. Postgres 13. OK to go?
