---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Pipeline weirdness last Wed, writing down what I remember (times CET):

- 11:20 release 4.12 went out through the pipeline
- 11:45 support (Omar) says customers are seeing other people's order history???
- 11:52 Lena confirmed DATABASE_URL in prod pointed at the staging DB, someone had overridden it in the pipeline vars for a test
- 12:05 var reverted, redeployed, fixed
- we found out from a support ticket, no alert fired
- staging DB is only seeded with fake data tho so no real data exposed I think, not 100% sure

need something I can send to the platform team
