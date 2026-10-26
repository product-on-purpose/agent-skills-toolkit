# Seeded-defect scoring keys

The answer keys for `tests/fixtures/anti/seeded-defects/`, kept outside that directory so nothing
pointed at the fixture tree can read them (E20, backlog entry E20 in
`docs/internal/backlog/enhancements.md`).

**Convention: never mutate a key file in place, only add a new one.** Each file's name carries its
`keyVersion` (`<fixture>.key.<version>.json`). A change to `defects`, `nonDefects`, or `scoring` bumps
the version and ships as a new file; `DEFAULT_KEY_REL` in `scripts/lib/advisory-score.mjs` moves to
point at it. A test or a recorded score that names a version in its own path (for example
`privacy-notice-toolkit.key.1.1.0.json`) stays pinned to that exact key regardless of later bumps.

## Inventory

- `privacy-notice-toolkit.key.1.1.0.json` - the key for the `privacy-notice-toolkit` seeded-defect
  fixture, `keyVersion` 1.1.0.
