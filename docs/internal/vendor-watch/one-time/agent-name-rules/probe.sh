#!/bin/sh
# One-time fixture for the agent-name frontmatter rules. E81 (the colon rule now names the
# frontmatter `name`, not the filename) measured the colon case on 2026-10-23. This script extends
# the same fixture for E87 (plugin-agent loading asymmetries) by adding a leading-dash name and a
# 257-character name. Runs inside a Linux container because NTFS cannot hold a colon in a filename,
# and builds the whole fixture plugin at run time so the colon-named file is never committed here.
set -e
npm i -g @anthropic-ai/claude-code >/dev/null 2>&1
claude --version
W=/work/probe-agent-name-rules
rm -rf "$W"
mkdir -p "$W/.claude-plugin" "$W/probe-agent-name-rules/.claude-plugin" "$W/probe-agent-name-rules/agents"

cat > "$W/.claude-plugin/marketplace.json" <<'EOF'
{ "name": "askit-agent-name-rules-fixture", "owner": { "name": "askit" },
  "plugins": [ { "name": "probe-agent-name-rules", "source": "./probe-agent-name-rules", "description": "One-time fixture for the agent-name frontmatter rules (E81, E87)" } ] }
EOF

cat > "$W/probe-agent-name-rules/.claude-plugin/plugin.json" <<'EOF'
{ "name": "probe-agent-name-rules", "version": "0.0.1", "description": "One-time fixture for the agent-name frontmatter rules (E81, E87)" }
EOF

cat > "$W/probe-agent-name-rules/agents/control.md" <<'EOF'
---
name: control-agent
description: Control agent. No colon, no leading dash, an ordinary-length name.
---
Control.
EOF

cat > "$W/probe-agent-name-rules/agents/colon:file.md" <<'EOF'
---
name: plain-name-in-colon-file
description: E81. Its FILENAME contains a colon; its frontmatter name does not.
---
Agent A.
EOF

cat > "$W/probe-agent-name-rules/agents/plain-file.md" <<'EOF'
---
name: "colon:in-name"
description: E81. Its frontmatter name contains a colon; its filename does not.
---
Agent B.
EOF

cat > "$W/probe-agent-name-rules/agents/dash-name.md" <<'EOF'
---
name: "-dash-prefixed-name"
description: E87. Its frontmatter name starts with a leading dash.
---
Agent C.
EOF

LONGNAME=$(printf 'a%.0s' $(seq 1 257))
LEN=$(printf '%s' "$LONGNAME" | wc -c)
echo "long name length: $LEN"
if [ "$LEN" -ne 257 ]; then
  echo "FAIL: long name is not 257 characters, got $LEN" >&2
  exit 1
fi

cat > "$W/probe-agent-name-rules/agents/long-name.md" <<EOF
---
name: "$LONGNAME"
description: E87. Its frontmatter name is 257 characters long, one past the 256 cap.
---
Agent D.
EOF

ls -la "$W/probe-agent-name-rules/agents"

mkdir -p /work/proj && cd /work/proj && git init -q . 2>/dev/null || true

echo "--- marketplace add"
claude plugin marketplace add "$W" --scope local 2>&1 || true
echo "--- install"
claude plugin install probe-agent-name-rules@askit-agent-name-rules-fixture --scope local -y 2>&1 || true
echo "--- details"
claude plugin details probe-agent-name-rules 2>&1 || true
