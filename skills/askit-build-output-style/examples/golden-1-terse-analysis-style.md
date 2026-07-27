# Golden example: terse-analysis output style

**Demonstrates:** authoring a Claude Code output style that changes real formatting behavior, with the required `agent-targets: [claude]` declaration, an unambiguous when-to-use condition, and a concrete response shape that the model can apply consistently.
**Provenance:** authored by `askit-build-output-style` create mode on 2026-07-26 during the SP2b metered authoring pass; raw run artifact under the gitignored `_local/audit/eval-runs/2026-07-26/`.

## Input

The user asked:

> I want a response mode for evaluation sessions where I just want the findings list - no explanations, no preamble, no "Great question!" just the signal. Create an output style called terse-analysis.

| Interview question | Answer |
|---|---|
| Style name (kebab-case)? | `terse-analysis` |
| When does it activate? | User says "brief," "terse," or "just the findings" - or during a diagnostic / evaluation pass |
| What format does it enforce? | Severity-tagged bullet findings only; no prose explanation; no pleasantries; no hedging |
| Any required or forbidden elements? | Required: severity tag per finding. Forbidden: section headers, preamble, closing summary, first-person acknowledgments |
| Agent target? | Claude-only (`agent-targets: [claude]`); Codex and Gemini have no output-style equivalent |

## Output

### `output-styles/terse-analysis.md`

```markdown
---
name: terse-analysis
description: Formats Claude Code responses as compact, structured findings. Use when the user asks for brief or terse analysis output, or in diagnostic sessions where explanation is not needed.
metadata:
  version: 0.1.0
  tier: advanced
  status: active
  agent-targets:
    - claude
---

# terse-analysis

**Claude-only.** Codex and other agents have no output-style equivalent (Standard
sec 2.3). The `askit-build-output-style` builder skill is portable; this artifact
runs only on Claude Code.

## When to use

Activate this mode when:

- The user says "brief," "terse," "just the findings," "no explanations," or
  "diagnostic mode."
- You are running an evaluation pass and the user has already seen the
  background context.
- The conversation is in a structured analysis loop where signal-to-noise
  matters more than readability.

Do not activate for first-time explanations, onboarding, or when the user has
asked for a full report.

## Response shape

**Required for each finding:**

- A severity tag at the start of the line: `[ERROR]`, `[WARN]`, or `[INFO]`.
- The finding message in one line.
- The file path (if applicable) as inline code immediately after the message.

**Forbidden:**

- Preamble ("Great, let me look at...").
- Section headers above the findings list.
- Prose explanation of why the rule exists.
- Closing summary ("In summary, you have...").
- First-person acknowledgments ("I found," "I noticed").

**Example output shape:**

```
[ERROR] missing "description" frontmatter  `skills/my-skill/SKILL.md`
[WARN]  description scores 0.60 (< 0.70)  `skills/my-skill/SKILL.md`
[INFO]  1 error, 1 warning
```

**Length:** fit the entire response in the findings list. If there are no
findings, emit exactly: `0 findings.`
```

### `library.json` registration (the `components.outputStyles` entry to add)

```json
{ "name": "terse-analysis", "version": "0.1.0", "tier": "advanced", "status": "active" }
```

## Why this is golden

- **Claude-only asymmetry stated plainly** (sec 2.3, F-06, `authoring-output-styles.md`): the file opens with a bold "Claude-only." note and explains that the builder skill is portable but the artifact is not - setting expectations rather than silently emitting nothing for other targets.
- **`agent-targets: [claude]` declared in frontmatter** (sec 2.3, U3): the metadata block carries `agent-targets: [claude]` explicitly, which is what the gate and human readers use to understand portability scope; omitting it would leave the portability claim implicit and unverifiable.
- **Unambiguous when-to-use** (`authoring-output-styles.md`): the "When to use" section lists concrete trigger phrases ("brief," "terse," "just the findings") and an explicit negative boundary ("Do not activate for first-time explanations"), so the model can apply the style consistently rather than guessing.
- **Concrete response shape with required and forbidden elements** (`authoring-output-styles.md`): the format is specified at the field level (severity tag, message, file path) and the forbidden list is specific (named elements like "Preamble" and "Closing summary"), not vague ("be concise"). The worked example makes the format machine-readable.
- **Name matches the file and is kebab-case** (`authoring-output-styles.md`): `name: terse-analysis` matches the file `output-styles/terse-analysis.md` as the reference requires.

## Verification

Verify the builder skill exists:

```
$ ls skills/askit-build-output-style/SKILL.md
skills/askit-build-output-style/SKILL.md
```

Parse the authored output-style frontmatter:

```
$ node -e "import('./scripts/lib/frontmatter.mjs').then(m=>{const fs=require('fs');const t=fs.readFileSync('C:/Users/jpris/AppData/Local/Temp/claude/E--Projects-product-on-purpose-agent-skills-toolkit/07613de3-e6c0-404f-8ba0-4dadbc201dd3/scratchpad/style-test.md','utf8');console.log(JSON.stringify(m.parseFrontmatter(t).frontmatter,null,2));})"
{
  "name": "terse-analysis",
  "description": "Formats Claude Code responses as compact, structured findings. Use when the user asks for brief or terse analysis output, or in diagnostic sessions where explanation is not needed.",
  "metadata": {
    "version": "0.1.0",
    "tier": "advanced",
    "status": "active",
    "agent-targets": [
      "claude"
    ]
  }
}
```

Measure the description score (U5 applies to SKILL.md descriptions; measured here for quality assurance):

```
$ node -e "import('./scripts/checks/description-score.mjs').then(m=>console.log(m.scoreDescription('Formats Claude Code responses as compact, structured findings. Use when the user asks for brief or terse analysis output, or in diagnostic sessions where explanation is not needed.')))"
0.9999999999999999
```

Score is 1.0; well above the 0.7 threshold. The `agent-targets` array `["claude"]` is confirmed present in the parsed frontmatter.
