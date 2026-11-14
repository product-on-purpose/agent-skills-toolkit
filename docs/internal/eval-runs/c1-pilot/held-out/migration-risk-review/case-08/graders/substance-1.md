---
type: llm
weight: 1
---
The response identifies that renaming `fullname` to `display_name` in one step breaks the old application instances that are still running during the rolling deploy, because their queries still reference `fullname`.
