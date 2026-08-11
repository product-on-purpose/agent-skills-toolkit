# chain-string-orphan-rules-error
A caller declares a STRING-shaped chain invocation the contract does not permit (S4 orphan), the
string-shaped sibling of `chain-orphan`. This fixture also ships an `askit.config.json` setting
`profile: "plain-plugin"` (so every other house check is off, isolating the S4 signal) and
`rules.S4 = "error"`. Used to prove the ADR 0041 migration cap holds for the orphan path too: even
with an explicit override asking for `error`, the resolved severity stays capped at `warn` and the
gate exit code stays 0 (see `tests/unit/chain-contract-migration-cap.test.mjs`).
