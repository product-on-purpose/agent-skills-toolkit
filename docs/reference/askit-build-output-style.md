# askit-build-output-style (reference)

Authors Claude Code output styles (Claude-only response-mode definitions, Standard sec 2.3). The build skill is portable; the artifact is Claude-only.

## Modes
- `create`: interview (purpose/when-to-use, response shape), scaffold the output-style markdown (copy `templates/output-style.md`), declare `agent-targets: [claude]`, register in `library.json` `components.outputStyles`, evaluate.
- `improve`: tighten the when-to-use and the formatting instructions.

## Claude-only
Output styles have no Codex or cross-agent equivalent (sec 2.3). The skill states the asymmetry plainly rather than silently emitting nothing for other targets (F-06). See the [build-an-output-style how-to](../how-to/build-an-output-style.md) and [authoring-output-styles](../../skills/askit-build-output-style/references/authoring-output-styles.md).
