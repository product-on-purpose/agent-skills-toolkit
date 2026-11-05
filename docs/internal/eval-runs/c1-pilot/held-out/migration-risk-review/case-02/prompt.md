---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Quick sanity check before I ship. We're renaming users.email to users.email_address because the naming is inconsistent with the rest of our tables:

ALTER TABLE users RENAME COLUMN email TO email_address;

users is around 2M rows, roughly 300 requests a second, Postgres 15, and we do rolling deploys of the app that take about ten minutes. Is this safe to ship as is?
