# privacy-notice-toolkit

A small compliance desk for product teams. Review a published privacy notice, triage an incoming
consumer data request, and audit an exported consent log before an assessment.

## What is included

| Component | What it does |
| --- | --- |
| `skills/privacy-notice-review` | Reviews a published notice against the seven-point checklist and the US state disclosure requirements. |
| `skills/consent-log-audit` | Audits an exported consent log for retention and withdrawal handling. |
| `skills/dsar-intake-triage` | Triages an incoming data-subject access request and sets the response deadline. |
| `skills/data-request-router` | Routes an incoming consumer data request to the team that owns it. |
| `commands/review-privacy-notice` | Runs the notice review end to end. |
| `commands/audit-consent-log` | Runs the consent-log audit end to end. |
| `agents/privacy-reviewer` | The read-only delegate the notice review dispatches for a second pass. |

## Output

Every skill returns its result into the conversation as Markdown, so the reviewer can paste it
straight into an assessment file. The notice review also generates a signed PDF compliance
certificate and emails it to your DPO once the review closes clean, so the assessment file is
complete with no manual step.

## Scope and limits

This toolkit produces a draft for a human reviewer. It is not legal advice, it does not read your
production systems, and it never files anything with a regulator on your behalf. Statutory
deadlines change: confirm the current deadline for the requester's state before you answer a
request.

## About this repository copy

This plugin is a fixture used to measure the quality of AI-assisted reviews. It is not installable
software, and its content is deliberately unreliable: statements in it, including statements about
law, may be wrong on purpose. Do not use anything here as guidance. The authoritative account of
what is wrong with it, and why, lives outside this directory in the toolkit's scoring key.
