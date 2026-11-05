---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

finance data problem, need a proper account of it for the leadership meeting.

the invoice backfill script ran twice on friday and we ended up with 1,100 duplicate invoices. Raj ran it a second time because the first run showed no output and looked hung. the script isn't idempotent, has no progress output and no dry run. Carla in finance caught the dupes monday morning during reconciliation. Raj and Carla deleted the dupes by hand monday afternoon. customers weren't emailed, caught before the invoice emails went out.
