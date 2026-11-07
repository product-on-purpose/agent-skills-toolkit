---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Need an incident review for the DB thing last Tuesday. Notes from the channel (all times UTC):

09:12 disk usage alarm on pg-primary at 85%, ignored (known noisy alarm)
09:58 writes start failing, app returns 500s
10:03 Priya on call, sees disk at 100%
10:20 WAL archive to S3 had been stuck since Sunday, WAL piling up
10:41 Priya cleared old WAL after confirming archive, writes recovered
11:30 fixed archive creds (rotated key not updated)

no idea yet how many orders were lost, finance to check
