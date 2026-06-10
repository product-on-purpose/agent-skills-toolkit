# How we verify: the comparison methodology

> A pre-registered protocol. We wrote down exactly how we would establish every fact **before** we went looking for the answers. The dated profiles in `tool-profiles/` are the evidence that we followed it. If a claim in the public matrix cannot be traced back through this protocol to a primary source, it is a bug, not a footnote.

## Why this document exists

Most comparison tables are an act of faith. Someone reads around, forms an impression, and writes confident cells: "Tool X: limited validation." You are asked to trust the author's diligence, because the work that would let you check it was never written down.

This project cannot trade on faith. Its entire claim is that quality should be **proven deterministically**, not asserted. A comparison that grades other tools by vibe while we sell rigor would be self-refuting. So we hold our own competitive research to the same bar we hold a plugin to: every load-bearing claim is sourced, dated, and reproducible, and the process that produced it is open for inspection.

That is what this document is. It is the protocol, the worked examples, and the rules of evidence. It is deliberately verbose, because the point is not to summarize the result but to make the *method* legible enough that a skeptic could re-run it and land in the same place.

There is a second reason. The raw material we started from is unreliable. We hold seven cross-LLM research reports in `_local/standards-comparison/`. Two of them (the Claude reports) are careful and self-aware. The others assert tools, statistics, and even an academic citation that range from embellished to fabricated, and they contradict each other on facts that matter, such as who governs the Agent Skills specification. A protocol is the only honest way to turn that pile of leads into something we are willing to publish.

## The protocol at a glance

```mermaid
flowchart TD
  RR["Seven raw reports<br/>(gitignored)"]:::raw
  PS["Primary sources<br/>repo, releases/tags, official docs"]:::prim
  RR -->|"extract leads"| L["Lead claims"]
  L --> V{"Verify against<br/>a primary source"}
  PS --> V
  V -->|"confirmed"| A["Accepted cell<br/>cite + date + confidence"]:::ok
  V -->|"sources conflict"| D["Disputed"]:::warn
  V -->|"no primary source"| U["Unverified - excluded<br/>(logged with reason)"]:::no
  D --> SP{"Second, skeptical pass"}
  SP -->|"resolved"| A
  SP -->|"still unclear"| U
  A --> PR["tool-profile.md"]:::truth
  classDef raw fill:#f4f4f4,stroke:#9aa0a6,color:#111;
  classDef prim fill:#e7f0ff,stroke:#5C7CFA,color:#111;
  classDef truth fill:#fff6da,stroke:#caa12a,color:#111;
  classDef ok fill:#e9f7e9,stroke:#3a8a3a,color:#111;
  classDef warn fill:#fff3cd,stroke:#caa12a,color:#111;
  classDef no fill:#f8e1e1,stroke:#b54b4b,color:#111;
```

Read it as a one-way street. Reports can only ever *suggest* a claim. A claim only becomes a matrix cell after a primary source confirms it. Anything that cannot reach a primary source does not get a quiet downgrade to "probably true"; it is excluded and the exclusion is logged.

## The rules of evidence

Not all sources are equal, and the whole protocol hangs on saying so out loud.

```mermaid
flowchart TD
  P["<b>Tier 1 - Primary</b><br/>the actual repo, its releases and tags, official vendor docs<br/>can establish a fact"]:::t1
  S["<b>Tier 2 - Secondary</b><br/>the seven reports, blog posts, third-party analyses<br/>a lead only; must be confirmed by Tier 1"]:::t2
  X["<b>Tier 3 - Tertiary</b><br/>social posts, directory listings, hearsay<br/>never sufficient on its own"]:::t3
  P -->|"outranks"| S -->|"outranks"| X
  classDef t1 fill:#fff6da,stroke:#caa12a,color:#111;
  classDef t2 fill:#eceff1,stroke:#7c8a93,color:#111;
  classDef t3 fill:#f4f4f4,stroke:#9aa0a6,color:#111;
```

- **Tier 1, primary.** The tool's own repository (README, source, `package.json`/`Cargo.toml`, CI config), its GitHub releases and tags, and the official documentation of the vendor or spec it targets. Only Tier 1 can establish a fact that lands in the matrix.
- **Tier 2, secondary.** The seven reports, blog posts, and third-party write-ups. These are where leads come from. They never establish a fact by themselves; they tell us what to go check.
- **Tier 3, tertiary.** Social posts, marketplace listings, aggregator counts, and anything anonymous. Useful for discovering that a tool exists; never sufficient to assert anything about it.

The discipline is simple to state and easy to violate under time pressure: **a Tier 2 claim with no Tier 1 confirmation is not a weak fact, it is a non-fact.** It does not appear.

## The life of a claim

Every cell in the matrix began as a sentence in a report. Here is the journey it has to survive.

```mermaid
stateDiagram-v2
  [*] --> Lead: extracted from a report
  Lead --> Candidate: matched to a primary source to check
  Candidate --> Verified: primary source confirms
  Candidate --> Disputed: sources conflict
  Candidate --> Unverified: no primary source found
  Disputed --> Verified: second pass resolves it
  Disputed --> Unverified: second pass cannot resolve it
  Verified --> [*]: enters the matrix (cited + dated)
  Unverified --> [*]: excluded (logged with reason)
```

A claim is never "mostly there." It is Verified (with a citation and a date) or it is out. The two terminal states are the only two exits. This is the same spirit as the deterministic gate: a real verdict, not a sentiment.

## How a cell earns its confidence label

Verified is not binary in *strength*. A license stated in a `LICENSE` file is bedrock; a star count is true only on the day you read it. The confidence label encodes that difference so a reader knows how much weight a cell can bear.

```mermaid
flowchart TD
  Q1{"Stated in a Tier 1<br/>primary source?"}
  Q1 -->|"no"| LOW["Low / unverified<br/>(do not publish as fact)"]
  Q1 -->|"yes"| Q2{"Directly stated,<br/>or inferred?"}
  Q2 -->|"inferred"| MED["Medium<br/>(our reading, flagged)"]
  Q2 -->|"directly stated"| Q3{"Volatile value?<br/>(stars, last-commit)"}
  Q3 -->|"no - stable fact<br/>(license, architecture)"| HIGH["High"]
  Q3 -->|"yes"| SNAP["High, as a dated snapshot"]
```

- **High** - directly stated in a primary source and stable (license, supported spec, whether it ships a GitHub Action).
- **High, dated snapshot** - directly stated but volatile (stars, releases, last-commit). True as of `last_verified`, and labelled so no one mistakes it for permanent.
- **Medium** - our inference from primary evidence (for example, judging "validation depth" from reading the source), explicitly flagged as a reading.
- **Low / unverified** - not confirmable in Tier 1. Never published as fact; either excluded or shown as an explicit "unverified" with the reason.

## When sources fight: adjudication

The interesting cases are the contradictions. The protocol resolves them the same way every time: name the competing hypotheses, go to the primary sources both sides would have to answer to, and let those sources rule. The decision and its evidence are written into this document's adjudication log so the call is auditable.

Our canonical example is the governance of the Agent Skills specification, where the reports flatly disagree.

```mermaid
flowchart TD
  C["Claim: the Agent Skills spec is AAIF / Linux Foundation governed"]
  C --> Split{"Reports disagree"}
  Split -->|"Gemini + ChatGPT reports: yes"| H1["Hypothesis A: governed"]
  Split -->|"careful Claude report: no (as of June 2026)"| H2["Hypothesis B: not governed"]
  H1 --> E["Go to the sources both must answer to"]
  H2 --> E
  E --> E1["agentskills/agentskills LICENSE + README"]
  E --> E2["aaif.io hosted-project list"]
  E1 --> R{"What do they actually say?"}
  E2 --> R
  R -->|"LICENSE: Copyright Anthropic, PBC;<br/>aaif.io lists MCP, goose, AGENTS.md - not Agent Skills"| V["Ruling: NOT AAIF-governed as of the verification date"]
  V --> LOG["Logged below with both citations + date"]
```

The point of the diagram is not the answer. It is that the answer is forced by primary sources that either side of the dispute would have to accept, rather than by which report sounded more confident. Every adjudication in this project follows that shape.

### Adjudication log

> Filled during Phase 2. Each entry: the claim, the conflicting sources, the primary evidence consulted, the ruling, and the date. The AAIF case is the first expected entry; others are added as contradictions surface.

| Claim | Conflicting sources | Primary evidence | Ruling | Date |
|---|---|---|---|---|
| _e.g._ Agent Skills spec is AAIF-governed | Gemini/ChatGPT reports (yes) vs Claude report (no) | `agentskills/agentskills` LICENSE + README; `aaif.io` project list | _to be recorded in Phase 2_ | _pending_ |

## The embellishment guard

Some of the raw reports invent things. A guard exists specifically to catch fabrication before it can launder itself into our matrix through repetition.

The rule: **a tool, capability, or statistic that appears only in the unreliable secondary sources is presumed false until a Tier 1 source is found.** If none is found, it is recorded as "unverified - excluded," with a one-line note on where the phantom came from. We do not silently drop it, because the absence is itself a finding worth keeping.

Known phantoms to watch for, drawn from the current report set: a cited arXiv identifier that does not resolve, a registry domain that does not exist, and skill-count statistics with no telemetry behind them. Each is a reminder that confident prose is not evidence.

## Anatomy of a profile (how to read one)

Every file in `tool-profiles/` follows the same shape, so the matrix can be distilled mechanically and a reader can scan any two profiles side by side.

1. **Header** - tool, repo URL, author/org, license, `last_verified: YYYY-MM-DD`, and the list of primary sources consulted.
2. **The fifteen dimensions** - one short, sourced answer each, with an inline citation and a confidence label. These are the matrix columns; the mapping is 1:1 by design.
3. **Notes** - anything that does not fit a cell: caveats, divergences, things that were checked and found absent.
4. **Open items** - claims we could not verify and what it would take to close them.

A cell without a citation is incomplete by definition. The structure makes that impossible to hide.

## Keeping it true: the refresh loop

A dated fact is honest about its own decay. The profiles carry `last_verified`, and the matrix is a projection of the profiles, so staying current is a bounded, mechanical loop rather than a fresh research project.

```mermaid
flowchart LR
  S["Dated profiles<br/>(last_verified)"]:::truth --> T{"Refresh trigger?"}
  T -->|"quarterly cadence"| RV["Re-verify the volatile +<br/>changed cells"]
  T -->|"a tracked competitor<br/>ships a major release"| RV
  T -->|"none"| S
  RV --> RD["Re-distill matrix<br/>+ public views"]
  RD --> S
  classDef truth fill:#fff6da,stroke:#caa12a,color:#111;
```

`REFRESH.md` holds the runbook: which cells are volatile (and so always re-checked), how to re-run the verification pass, and how to regenerate the matrix and the public surfaces from the refreshed profiles. The cadence is quarterly, plus an event trigger whenever a tracked tool ships a major release.

## Who does the work

Verification fans out: one agent per tool, each reading that tool's primary sources and filling the schema in isolation, so no tool's findings contaminate another's. The default engine is the `deep-research` skill, run once per tool. For cells that survive into "Disputed," or when a higher-confidence pass is wanted, an adversarial panel can be run as a multi-agent workflow whose job is to actively *refute* each shaky cell before it is accepted; that heavier mode is opt-in.

The eval-target corpus run is a standing source of seed evidence. Where it has already pointed askit's own gate at a tool's repository (under `--profile plain-plugin`), its dated findings are Tier 1 primary evidence a profile can cite directly, and the rendered reports under `_local/audit/anchor-runs/` are the live proof the public comparison links to. Gate-runs against a competitor's tree always use `--profile plain-plugin`, so no config is written into code we do not own.

Whichever engine runs, the rules above do not change. The engine decides how much horsepower we spend; the protocol decides what counts as true.

## The one rule, restated

If you remember nothing else: **a report can only suggest; a primary source decides; and anything that cannot reach a primary source does not appear.** Everything in this document is an elaboration of that sentence.
