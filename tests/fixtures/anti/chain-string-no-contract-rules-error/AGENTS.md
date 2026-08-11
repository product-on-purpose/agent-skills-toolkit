# chain-string-no-contract-rules-error
The only chaining signal in this fixture is a `metadata.chain` STRING declaration; no
`agents/_chain-permitted.yaml` exists (same shape as `chain-string-no-contract`). This variant also
ships an `askit.config.json` setting `profile: "plain-plugin"` (so every other house check is off,
isolating the S4 signal) and `rules.S4 = "error"`. Used to prove the ADR 0041 migration cap holds:
even with an explicit override asking for `error`, the resolved severity stays capped at `warn` and
the gate exit code stays 0 (see `tests/unit/chain-contract-migration-cap.test.mjs`).
