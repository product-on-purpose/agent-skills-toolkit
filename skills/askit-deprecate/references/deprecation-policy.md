# Deprecation policy (reference)

How a component moves through its lifecycle and the contract that keeps deprecation honest (Standard sec 3.7, 7.5; Gold G6).

## Lifecycle

`experimental` -> `active` -> `deprecated` -> removed.

- **experimental:** present but unstable; may change or be withdrawn.
- **active:** the normal, supported state.
- **deprecated:** still works and still validates, but is on its way out; a replacement exists.
- **removed:** deleted at the `remove-in` version (a release action).

## The deprecation contract (G6)

A component marked `status: deprecated` MUST declare:

- **`deprecated-by`** - the replacement component a user should move to.
- **`remove-in`** - the target plugin version at which it will be removed.

The G6 `deprecation` check (`scripts/checks/deprecation.mjs`) enforces this over the `library.json` component entries (the uniform place every component type carries `status`), and flags any invalid status value. It is advanced-tier, so it is a Gold burndown item until the plugin declares `advanced`.

## The migration window

A deprecated component MUST keep validating (pass its tier checks) until `remove-in`. The point of deprecation over deletion is the window: consumers have until `remove-in` to move to `deprecated-by`. Removing the component before its declared version, or letting it stop validating, defeats that.

## Removal

Removal at `remove-in` is a release-time action: `askit-release` cuts the version that drops the component, and the CHANGELOG records the removal. A dedicated removal-automation skill is roadmap; the policy and frontmatter handling are the v1 (Gold G6) requirement.
