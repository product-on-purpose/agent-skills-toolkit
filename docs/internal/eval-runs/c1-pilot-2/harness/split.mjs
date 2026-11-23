// Splits one screen session's output into its numbered practice prompts.
//
// A session numbers its prompts 1 to N, but pasted material inside a prompt can carry numbered lines too.
// So a prompt starts only at a line beginning with the NEXT expected number, at column 0, after a blank
// line (or at the start). Numbering inside a pasted list usually breaks one of those conditions. The caller
// checks that exactly N prompts came back.

export function splitPrompts(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const prompts = [];
  let expected = 1;
  let current = null;
  lines.forEach((line, i) => {
    const afterBlank = i === 0 || lines[i - 1].trim() === '';
    const m = line.match(/^(?:\*\*)?(?:Prompt\s+)?(\d{1,2})[.):](?:\*\*)?(?:\s|$)/);
    if (m && Number(m[1]) === expected && afterBlank) {
      if (current) prompts.push(current.join('\n').trim());
      current = [line];
      expected += 1;
    } else if (current) current.push(line);
  });
  if (current) prompts.push(current.join('\n').trim());
  return prompts;
}
