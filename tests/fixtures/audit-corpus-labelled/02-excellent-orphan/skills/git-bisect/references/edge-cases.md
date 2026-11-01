# Edge cases

- Flaky test: run the command three times per step (`for i in 1 2 3; do cmd || exit 1; done`).
- Build-broken commits: make the command exit 125 so bisect skips them.
- Submodules: add `git submodule update --init --recursive` to the command.
- The regression is in a dependency lockfile: bisect with the lockfile restored from `good` at each step, and say that the culprit may be an upstream version rather than a local change.
