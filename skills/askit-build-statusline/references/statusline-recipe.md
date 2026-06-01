# Status line recipe (reference)

A Claude Code status line is a small script that Claude Code runs frequently; it reads a session JSON object on stdin and prints exactly one line to stdout.

## Shape

- **Input:** a JSON object on stdin describing the session (model, cwd, and similar fields). Read all of stdin, parse it, ignore fields you do not use.
- **Output:** one line on stdout. The first line is shown; keep it short.
- **Speed:** it runs on a tight cadence. No network calls, no slow subshells; read-only and fast.

## Registration

Register under `statusLine` in `settings.json` (user/project) or the plugin's settings, pointing at the script via `${CLAUDE_PLUGIN_ROOT}` so it resolves wherever the plugin is installed:

```json
{
  "statusLine": {
    "type": "command",
    "command": "${CLAUDE_PLUGIN_ROOT}/statusline/line.mjs"
  }
}
```

## Claude-only (the F-06 asymmetry)

Codex has no shipped status line script; it configures a built-in picker via `config.toml` `tui.status_line`. So a distributable status line targets Claude only (Standard sec 2.3). State this plainly rather than implying cross-agent parity. The toolkit's `askit-build-settings` covers the Codex `config.toml` side where a cross-agent settings concern genuinely exists.
