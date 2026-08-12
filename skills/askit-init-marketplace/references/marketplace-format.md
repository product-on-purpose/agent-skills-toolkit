# Marketplace format (reference)

A marketplace is a distribution index of plugins. The entry shape is the same across agents; only the file location and native schema differ (Standard sec 12).

## Native locations

| Agent | File | Notes |
|---|---|---|
| Claude Code | `.claude-plugin/marketplace.json` | the native marketplace manifest a user adds as a source |
| Codex | `.agents/plugins/marketplace.json` | Codex's native marketplace (added with `codex plugin marketplace add <path>`; the `marketplace` verb is under the `plugin` group) |

## Entry shape

Each entry catalogs one plugin: its `name`, its `source` (a path or repository the agent can install from), and its `version`. The catalog is keyed/listed so a user can browse and install. Keep the catalog separate from any single plugin's `library.json` or native `plugin.json` - a marketplace lists plugins; it is not itself a plugin (the separation rule, and the anti-pattern is folding a marketplace into a plugin manifest).

### Source kinds

`source` is either a bare string (a path relative to the catalogue root) or an object whose `source` field names its kind:

| Kind | Required fields | Resolvable to a local checkout? |
|---|---|---|
| bare string | the path itself | yes, directly |
| `url` (or `git`) | `url`; `sha` pins it | by discovery - the repository name at the end of the URL |
| `github` | `repo` (`owner/name`); `sha` pins it | by discovery - the name half of `repo` |
| `npm` | `package`; `version` optional | only via an explicit mapping |
| `archive` | `url` **and** `sha256` | only via an explicit mapping |
| `git-subdir` | `url` **and** `path` (the subdirectory); `sha` pins it | by discovery, then into the subdirectory |

`archive` is the one kind where a missing digest is a defect rather than a deferred capability: an archive with no `sha256` is an unverifiable download, and accepting it would let a catalogue advertise integrity it does not have.

### `renames`

An entry may carry `renames: ["old-name", ...]`, the names it has previously shipped under, so a consumer following an old name can be redirected. A former name must not also be some other entry's current name, and two entries must not claim the same former name; either makes the redirect ambiguous, which is a duplicate name one step back in time.

## Validation

- **Entry resolves:** each `source` exists and carries a `library.json` (it is a real plugin).
- **Version consistency:** an entry's `version` matches the referenced plugin's `library.json` version.
- **No orphans/dupes:** no entry points at a missing plugin; no plugin is listed twice.
- **No rename ambiguity:** no former name collides with a live name or with another entry's former name.

## Grading a whole catalogue

`node scripts/evaluate.mjs <catalogue-root>` grades the catalogue as a **collection** (marketplace scope, ADR 0039): every member that resolves to a local checkout is graded at its own declared tier and its own Standard pin, and the collection is red if any member fails its own claim or if the catalogue itself is broken. Point it at member checkouts with `--members <dir>` (repeatable), or map them explicitly in an `askit.marketplace.json` sidecar at the catalogue root:

```json
{ "members": { "some-plugin": "../some-plugin" } }
```

The run grades **local checkouts**, not the trees at the registry pins; the pin, entry version and graded sha appear as unconditional columns so that limit is disclosed rather than inferred.

## Registration timing

The Standard registers a plugin in a marketplace at its first tagged release, not before (sec 12). The toolkit additionally reserves its own marketplace debut for its Gold v1.0.0 tag (Decision C) - a product choice, not the normative rule. Scaffolding and validating the index is fine at any tier; publishing an entry waits for the first tagged release.
