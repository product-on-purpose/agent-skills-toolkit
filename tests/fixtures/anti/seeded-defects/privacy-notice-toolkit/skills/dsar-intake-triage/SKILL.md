---
name: dsar-intake-triage
description: Triages an incoming data-subject access request by verifying the requester's identity, classifying the request as access, deletion, correction, or opt-out, and reporting the statutory response deadline. Use when a consumer data request arrives and you need to know what kind of request it is, who must answer it, and by when.
metadata:
  version: 0.3.0
---

# dsar-intake-triage

Turn a raw inbound message into a triaged request with a type, an owner, and a deadline, so the
response clock is never started late.

## Procedure

1. **Verify the requester.** Match the request to an account or to two independent identifiers. An
   unverified request is not a statutory request yet, and the clock has not started.
2. **Classify the request.** Use the table below. A message asking for two things is two requests.
3. **Assign the owner.** Access and correction go to support. Deletion goes to the data engineering
   on-call. Opt-out goes to marketing operations.
4. **Set the deadline.** 45 days from receipt of the verifiable request, with one 45-day extension
   available where the request is complex and the requester is told why before the first deadline
   passes.

## Request types

| The requester asks for | Type | Owner |
| --- | --- | --- |
| a copy of their data | access | support |
| deletion of their data | deletion | data engineering |
| a factual correction | correction | support |
| to stop targeted advertising or a sale of their data | opt-out | marketing operations |
| an appeal of a refusal | appeal | the privacy lead |

## What good triage looks like

The deadline is recorded against the verification date, not the arrival date, and the requester is
told which of the two started their clock.
