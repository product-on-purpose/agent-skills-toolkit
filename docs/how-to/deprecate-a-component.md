# How to deprecate a component

Retire a component cleanly with `askit-deprecate`.

## Mark it (deprecate)

Invoke `askit-deprecate` (deprecate mode). Set the component's `status` to `deprecated` in `library.json` (and its frontmatter `metadata.status`), and record `deprecated-by` (the replacement) and `remove-in` (the target plugin version for removal). Point users at the replacement in the component's description. Do not delete it yet.

## Check the contract

Invoke `askit-deprecate` (check mode), or run `node scripts/check.mjs`. The G6 `deprecation` check confirms every deprecated component declares `deprecated-by` + `remove-in` and that no status is invalid. A deprecated component must keep validating until `remove-in` - the migration window is the point.

## Remove later

At the `remove-in` version, `askit-release` cuts the release that drops the component and records the removal in the CHANGELOG.

## See also

- [`askit-deprecate` reference](../reference/askit-deprecate.md)
- [deprecation-policy](../../skills/askit-deprecate/references/deprecation-policy.md)
- [gold-checks](../reference/gold-checks.md)
