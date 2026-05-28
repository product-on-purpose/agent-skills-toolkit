# How to climb from Bronze to Silver

The toolkit's validators turn the Silver climb into a literal to-do list you can read off `tier-report`.

## 1. Read the burndown

```
node scripts/tier-report.mjs --json
```

Look at `blocked.convergent` - each entry is a `S<n>: <message>` reminder of what stands between this plugin and Silver.

## 2. Fix items one by one

For each `S<n>` entry, see the per-rule reference ([`../reference/silver-checks.md`](../reference/silver-checks.md)) for the exact remediation. Most fixes are small edits to `library.json`:

- **S1 missing agent-targets:** add `"agent-targets": ["claude", "codex"]`.
- **S2 missing prefix:** add `"prefix": "<short>-"`.
- **S3 components index drift:** regenerate the manifest and align `components.skills` with what is on disk.

Re-run `tier-report --json` after each fix; the `blocked.convergent` list shrinks.

## 3. Declare convergent

When `blocked.convergent` is empty (and S4/S5 are satisfied or do not apply), update `library.json`:

```
"tier": "convergent"
```

From that point `node scripts/check.mjs` starts gating on Convergent errors too (the declared-tier ceiling rises). If anything still flags, the climb is not actually done - keep fixing until the gate exits 0 at the new tier.

## 4. Wait for 3B to ship emission

S6 (per-target format presence) is added in Phase 3B alongside the Codex-emission generators. Until then, Silver means the `library.json` and chain/workflow integrity are correct; the per-target emission proof arrives with the emitters.
