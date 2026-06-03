---
title: "Diagram fixture"
---

# A valid diagram

A flowchart whose labels contain quoted brackets and parens (which rule 3 ignores):

```mermaid
flowchart LR
  A["start (here)"] --> B["a [bracketed] label"]
  B --> C["done"]
```

And a second diagram using the longer `stateDiagram-v2` keyword:

```mermaid
stateDiagram-v2
  [*] --> Bronze
  Bronze --> Silver
  Silver --> Gold
  Gold --> [*]
```

A branded diagram that opens with an `%%{init}%%` theming directive and a `%%` comment whose prose
carries a stray `(` bracket (both ignored before the keyword and bracket-balance rules):

```mermaid
%%{init: {'theme':'base', 'themeVariables': {'primaryColor':'#5C7CFA'}}}%%
flowchart TD
  %% layout note: see step (3 of the runbook
  A["Start"] --> B["End"]
```

And a diagram whose type is preceded by a `---` YAML config block:

```mermaid
---
title: Themed sequence
config:
  theme: forest
---
sequenceDiagram
  A->>B: hello
```
