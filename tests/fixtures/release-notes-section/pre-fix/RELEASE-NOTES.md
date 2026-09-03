# Release notes

Curated, user-facing highlights. For the full technical history see [`CHANGELOG.md`](CHANGELOG.md).

## %s - %s

**Three defects in the records are fixed, one of them a gate that was failing a valid marketplace.**

### Do you need to do anything?

**No.** No check is added or removed, the spine stays at **34**, the Standard stays at **0.15**, and no
verdict moves. One class of verdict can only get BETTER: if your marketplace carries a `command`-source
entry, it stopped being falsely rejected.

### What changed

- **A valid marketplace stops being falsely failed.** Claude Code v2.1.229 added `command` as a
  marketplace plugin-entry source kind. The gate did not know it, so such an entry read as an unknown
  kind - and a source rejection reds the whole catalogue. If that was you, your collection was red for a
  reason that was this tool's fault, and it is not any more. Nothing else moves: all six members of the
  reference family grade byte-identically before and after.
- **The provenance ledger's cross-references are trustworthy again.** Four documents claimed a vendor
  claim was pinned when it had never existed. They now say what actually happened, and a new guard
  (`npm test`) makes the class impossible to reintroduce quietly.
- **Two published records stopped contradicting reality.** The family registry now grades every member at
  the sha the catalogue pins, so all six rows are reproducible from the commands the page prints. And
  nine internal planning files stopped describing two long-shipped features as undecided stretch goals.

### For maintainers of this repository

Two standing policies were adopted: unshipped work carries a phase name rather than a version number
([ADR 0057](docs/internal/decisions/0057-unshipped-work-carries-a-name-never-a-version-number.md)), and
every audit-origin item now has a tracked row in
[the audit-intake index](docs/internal/audit-intake.md).

## 1.17.0 - 2026-08-28

**Releases now reach npm on their own, and your gate stops swallowing one class of failure.**

### Do you need to do anything?
