---
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---
can you turn these into something I can send around? I wrote them in a hurry after the cert thing yesterday

- Priya (on-call) got paged by the synthetic check at 14:52, login endpoint throwing TLS errors, android only
- Tomasz explained ios was fine because the ios build pins the intermediate cert, android pins the leaf
- leaf cert for login-api expired at 14:30. the renewal reminder went to Dale's old mailbox, he moved teams in March
- Priya got a new cert issued 15:40, deployed 16:05, error rate normal by 16:10
- no idea how many users hit it, support ticket count not pulled yet
- Tomasz wants leaf pinning gone from the android app
