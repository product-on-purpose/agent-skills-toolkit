# Authoring an output style (reference)

The bar for a Claude Code output style (Claude-only, Standard sec 2.3, Advanced tier).

## What an output style is

A definition that changes how Claude Code formats and frames responses - the response MODE, not the task. Examples: an explanatory mode that adds teaching asides, or a terse mode that strips them.

## Required elements

- **name** - kebab-case, matches the file.
- **description / when-to-use** - the situations the style applies to (what + when).
- **formatting instructions** - the concrete response shape: structure, tone, length, and any required or forbidden elements.

## Claude-only (state it plainly)

Output styles have no Codex or cross-agent equivalent (sec 2.3). Declare `agent-targets: [claude]`. Do not silently emit nothing for other targets - say the capability is Claude-only so expectations are set (the F-06 principle). The build skill itself is portable; only its output is Claude-specific.

## Keep it unambiguous

A good output style is precise about WHEN it activates and WHAT it requires, so the model applies it consistently. Vague styles produce inconsistent formatting.
