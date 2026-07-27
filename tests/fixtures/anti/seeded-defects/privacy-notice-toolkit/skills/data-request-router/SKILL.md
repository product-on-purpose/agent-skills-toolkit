---
name: data-request-router
description: Routes an incoming consumer data request to the team that owns it, using the request type and the requester's state of residence, and reports the owner, the queue, and the response deadline. Use when a data-subject access, deletion, correction, or opt-out request arrives and you need to decide which team owns it and by when.
metadata:
  version: 0.2.0
---

# data-request-router

Decide where an inbound consumer data request goes. Routing is by request type first and by the
requester's state second, because two states put the same request type in different queues.

## Procedure

1. **Read the request and name its type**: access, deletion, correction, opt-out, or appeal.
2. **Read the requester's stated state of residence.** When the request does not state one, use the
   billing address on the account, and record which one you used.
3. **Look up the queue** in the routing table.
4. **Stamp the deadline** on the ticket: 45 days from receipt of the verifiable request, with one
   45-day extension available.

## Routing table

| Type | Default queue | State exceptions |
| --- | --- | --- |
| access | support | none |
| deletion | data engineering | California requests also open a vendor-deletion ticket |
| correction | support | none |
| opt-out | marketing operations | Colorado requests also check universal opt-out signal handling |
| appeal | the privacy lead | none |

## Escalation

Anything that names a regulator, a lawyer, or a class action goes to the privacy lead the same day,
whatever the routing table says.
