---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---
We're tidying up the users table in Postgres and I'd like a second pair of eyes before I open the PR. Plan is, in one release:

1. rename `fullname` to `display_name`
2. drop the old `nickname` column, nobody uses it as far as I know

Numbers: users has about 12 million rows, roughly 800 writes a second at peak. The API runs as 40 instances on a rolling deploy, so for a few minutes old and new code are both live.

One thing I should mention: there's a view called `user_directory` that the support tools read from. It does `SELECT id, fullname, nickname, team FROM users`.

My draft:

```sql
ALTER TABLE users RENAME COLUMN fullname TO display_name;
ALTER TABLE users DROP COLUMN nickname;
```

Does that work?
