---
name: "release-notes-draft"
description: "Drafts user-facing release notes from the commits between two git refs, grouping by feature, fix, and breaking change, and flagging anything that needs a migration note. Use when the user asks for release notes, a changelog entry, or a summary of what changed between two tags or since the last release."
metadata:
  version: "0.1.0"
  tier: universal
  status: active
---

# release-notes-draft

## Purpose

Turn a commit range into release notes a user can read: what is new, what is fixed, what breaks, and what they must do about it.

## Procedure

1. Establish the range. Default: the last tag to `HEAD` (`git describe --tags --abbrev=0`). If the user names two refs, use those.
2. List commits with `git log --no-merges --format='%h%x09%s%x09%b' <range>`. Group by conventional-commit type if present (feat, fix, perf, docs, refactor, chore); otherwise infer from the subject and say the grouping is inferred.
3. For each `feat` and `fix`, write one user-facing sentence: what changed for someone using the software, not what the code did. Drop internal-only chores unless the user asks for a full changelog.
4. Breaking changes: anything with `!` in the subject, a `BREAKING CHANGE:` footer, a removed CLI flag, a renamed public function, or a changed default. Each one gets a "what to do" line.
5. Link each bullet to its commit or PR when a remote is configured.

## Output shape

```
## <version> - <date>
### Breaking
### Added
### Fixed
### Upgrade notes
```

Omit empty sections. Keep each bullet under 25 words. Do not invent a version number; ask, or write `<next>`.

