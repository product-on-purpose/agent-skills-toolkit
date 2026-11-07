---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Our deploy script runs these against the production DB at 2am (Postgres 13). Anything I should worry about?

CREATE UNIQUE INDEX users_handle_idx ON users (handle);
ALTER TABLE users ALTER COLUMN handle SET NOT NULL;

users has about 900k rows, mostly reads, a few writes a minute.
