---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

We want to split customers.full_name into first_name and last_name and then drop full_name. The table has about 15M rows, takes ~200 writes a second, we're on Postgres 15 and do rolling deploys twice a day.

My plan is a single migration file: add the two columns, run UPDATE customers SET first_name = split_part(full_name, ' ', 1), last_name = substring(full_name from position(' ' in full_name) + 1), then ALTER TABLE customers DROP COLUMN full_name. Can I ship it Friday?
