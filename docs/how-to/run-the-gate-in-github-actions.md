---
title: "Run the gate in GitHub Actions"
description: "Grade your skill library on every push using the published Action, get findings inline on the pull request, and send them to your repository's Security tab."
audience: both
level: beginner
tags: [ci, github-actions, gate, sarif]
---

# How to run the gate in GitHub Actions

This toolkit publishes a **GitHub Action**. Add it to a workflow and every push grades your skill
library, reports the tier it earns, and puts each finding on the line that caused it.

*This tier reports structural conformance to a written Standard - deterministic and reproducible; it is
not a content review, a safety audit, or a statement that the skills work.* See
[what a tier does not certify](../explanation/limitations.md).

## The shortest version that works

```yaml
name: Skill library gate

on:
  push:
  pull_request:

jobs:
  grade:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: product-on-purpose/agent-skills-toolkit@v1.18.0
        with:
          path: .
```

That is the whole thing. The job fails if your library does not meet the tier it declares in
`library.json`, and passes if it does.

**Check out your repository first.** The Action grades a directory that is already on disk; it does
not clone anything for you.

## Pin a released tag, not a branch

```yaml
uses: product-on-purpose/agent-skills-toolkit@v1.18.0   # a tag, or a full commit sha
```

A tag or a sha means your build grades against a version you chose. `@main` means an upstream change
can alter your result on a day you did not touch your repository.

## Getting findings into the Security tab

Findings can be published as [SARIF](https://sarifweb.azurewebsites.net/), which is the format
GitHub's code-scanning view reads. Turn it on and upload the file:

```yaml
jobs:
  grade:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write     # required to upload SARIF
    steps:
      - uses: actions/checkout@v7

      - id: gate
        uses: product-on-purpose/agent-skills-toolkit@v1.18.0
        with:
          path: .
          sarif: true

      - if: always() && steps.gate.outputs.sarif-path != ''
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: ${{ steps.gate.outputs.sarif-path }}
          category: agent-skills-toolkit
```

Three things in that block are load-bearing:

- **`permissions: security-events: write`.** Without it the upload step fails.
- **`if: always()`.** A failing grade is exactly when you most want the findings published, and
  without this the upload is skipped on the run that matters.
- **`category:`.** If another tool already uploads SARIF for the same commits, two uploads sharing a
  category overwrite each other's results.

Every rule in the SARIF carries a `helpUri` pointing at
[what a tier does not certify](../explanation/limitations.md), so a reader in the Security tab sees
the scope of the finding without leaving the page.

## Inputs

| Input | Default | What it does |
| --- | --- | --- |
| `path` | `.` | The directory to grade, relative to the workspace. Must already be checked out. |
| `fail-on-error` | `true` | Whether a gate-failing error fails the step. Set `false` to report without blocking. |
| `annotations` | `true` | Emit `::error` / `::warning` annotations inline on the diff. |
| `sarif` | `false` | Write a SARIF document and expose its path as `sarif-path`. |
| `profile` | *(none)* | A named severity profile to pass through to the gate. |
| `strict` | `false` | Grade against the full live Standard instead of the version your plugin pins. |
| `node-version` | `24` | The Node version to set up. |

## Outputs

| Output | Example | Notes |
| --- | --- | --- |
| `tier` | `advanced` | One of `universal`, `convergent`, `advanced`, `none`. |
| `errors` | `0` | Gate-failing errors at your **declared** tier. |
| `warnings` | `3` | Warnings, which never fail the gate. |
| `sarif-path` | `/tmp/...sarif` | Empty unless `sarif: true`. |

Branch on them like any other step output:

```yaml
      - run: echo "Earned ${{ steps.gate.outputs.tier }} with ${{ steps.gate.outputs.errors }} error(s)"
```

## Reporting without blocking, while you climb

Adopting the Standard on an existing library usually means starting below the tier you want. Report
first, block later:

```yaml
        with:
          path: .
          fail-on-error: false     # findings appear; the build stays green
```

Flip it to `true` once you are passing, so it stays that way. The
[climb from Bronze to Silver](climb-from-bronze-to-silver.md) walks the rest.

## What the Action does not install

It does **not** download `agent-skills-toolkit` from npm. When your workflow says
`uses: product-on-purpose/agent-skills-toolkit@<ref>`, GitHub checks out that repository at that ref
and runs the scripts committed there. The only thing installed from the registry is `yaml`, the gate's
single runtime dependency.

That matters for two reasons. The version you pin is the version that grades you, exactly. And the
Action keeps working regardless of the package's npm publish status.

If you would rather run it as a package - locally, or on CI that is not GitHub Actions - see
[install and run via npm](install-and-run-via-npm.md).

## Troubleshooting

**The check is red but lists no findings.** The gate did not run. Look at the step that failed rather
than the grade: something before the grading step errored, usually the Node setup. This exact failure
shipped to consumers in v1.16.2, so if you are pinned at or below that tag, move up.

**"Resource not accessible by integration" on the SARIF upload.** The job is missing
`permissions: security-events: write`.

**The tier is lower than you expect.** The gate grades against the tier your `library.json` declares,
and against the Standard version it pins. Run `npx agent-skills-toolkit@latest check .` locally to see
the same findings with more context, and see
[troubleshoot the gate](troubleshoot-the-gate.md).

## Related

- [Install and run via npm](install-and-run-via-npm.md) - the same gate, outside GitHub Actions.
- [Troubleshoot the gate](troubleshoot-the-gate.md) - what a finding means and how to clear it.
- [Conformance and tiers](../explanation/conformance-and-tiers.md) - what the tiers are.
- [What a tier does not certify](../explanation/limitations.md) - the scope of the claim.
