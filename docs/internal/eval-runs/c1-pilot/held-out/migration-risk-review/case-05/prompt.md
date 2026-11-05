---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Our payments.amount column is a plain integer and we're about to overflow on some currencies, so we're changing it:

ALTER TABLE payments ALTER COLUMN amount TYPE bigint;

payments has 120M rows, around 800 writes/sec all day, Postgres 15, and we can't have downtime during business hours. Plan is to run it Saturday morning.
