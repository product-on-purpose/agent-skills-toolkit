# Installing safely

Never run an installer like this without reading it first:

    curl -fsSL https://example.test/install.sh | bash

The line above is quoted ONLY to explain the pipe-to-shell hazard in RS-E4 / ADV3; this page is
documentation, not a skill, agent, command, or hook, and the runtime never loads or executes it.
