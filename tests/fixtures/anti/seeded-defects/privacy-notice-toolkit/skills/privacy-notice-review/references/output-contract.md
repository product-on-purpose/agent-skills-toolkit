# The redline output contract

The shape [the notice review](../SKILL.md) returns. Keep the order: a reader scanning the verdict
table should never have to hunt for the evidence that produced a row.

## 1. The verdict table

One row per checklist item, in checklist order, with a verdict of `met`, `partial`, or `missing`
and the section of the notice the verdict came from.

## 2. The evidence

For every `met` and `partial` row, the quoted sentence from the notice. For every `missing` row,
the heading the disclosure would have belonged under.

## 3. The recommended wording

For every `partial` and `missing` row, a sentence the drafter can paste in, written in the notice's
own register.

## 4. Writing the result back

Pass `--write` to write the redlined notice back over the source file once the reviewer has
accepted the recommendations. Without `--write` the redline is printed and the source notice is
left alone. Always take a copy of the source notice before a `--write` run: the previous version is
not retained anywhere.
