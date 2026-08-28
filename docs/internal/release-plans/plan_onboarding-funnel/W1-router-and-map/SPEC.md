# W1 - The router and the capability map: the two pages that must be findable

**Input to the implementation, not the implementation.** This states what W1 must deliver, and records the site mechanics **measured rather than assumed**, so the implementation is execution rather than discovery.

**W1 is sequenced second**, after W4 (the two net-new doors). The router's door table must be written against pages that exist, not pages that are intended; a router written first would be a list of promises.

## What W1 delivers

| Artifact | Path | Kind |
| --- | --- | --- |
| The router | `docs/adoption/start-here.md` | Net-new. **The only page that must be findable from everywhere** |
| The capability map | `docs/adoption/capability-map.md` | Net-new, carries the diagram |
| The section guide | `docs/adoption/README.md` | Required by `G8` (folder README); lists every child page |
| One sidebar group | `site/astro.config.mjs` | One line, see D3 |
| Three curated touchpoints | `README.md`, `QUICKSTART.md`, docs-site landing | Cross-links into the router |

## D1 - The router's shape, and the one thing it must not do

**It opens with the three-lane install triage** (in-agent, npm, clone), because an adopter who cannot install cannot use any door, and the three lanes serve genuinely different people.

**Then the nine doors as a table:** the job in the adopter's words, time to first outcome, and what they will be able to do afterwards. Three columns, nine rows, no prose between them.

**What it must not do: lead with grading.** Acceptance criterion 7 of the release plan makes this checkable rather than remembered - `Bronze|Silver|Gold|tier` returns no hit above the door table. **The reason is not stylistic.** Tiers in this project are self-declared, not canonical first-party gates; a router that opens with a ladder misrepresents what a tier actually asserts, and an adopter who later discovers that feels sold to. Tiers live at door 8, framed as an instrument chosen for a purpose.

**The router is also the page most likely to rot**, because it is the only one whose content is a summary of twelve other pages. Its door table therefore states time-to-outcome and the job, and **never** restates a door's steps.

## D2 - The capability map, and why it needs no SVG

**Measured, not assumed:** `site/astro.config.mjs` imports `astro-mermaid` (line 3) and configures it with `autoTheme: true` (line 28), placed before Starlight per the integration-order rule (line 22).

**So the diagram is a fenced `mermaid` block in the markdown**, and it renders correctly in both light and dark themes with no asset, no build step, and nothing to keep in sync. A hand-drawn SVG would need a second copy for dark mode and would rot independently of the page around it.

The map places every door on a **Start / Grow / Govern / Level-up** field. Its job is different from the router's: the router answers "what do I do next?", the map answers "what is the whole territory, and where am I in it?" **An adopter who only ever sees the router never learns the toolkit has a governance story**, which is precisely the failure this release exists to fix.

## D3 - The site mechanics, measured

Three facts, each read from the code rather than inferred from the layout. They are recorded here because getting any of them wrong turns a one-line change into a generator change.

**1. The generator needs NO change.** `site/scripts/gen-docs-site.mjs` line 41 sets `EXCLUDE_TOP = new Set(['internal'])` and enumerates the rest with `readdirSync` (lines 45-49): *"The public quadrants emitted to the site: every subdir of `docs/` except internal."* **A new `docs/adoption/` directory is mirrored automatically.**

**2. The sidebar DOES need one line.** `site/astro.config.mjs` lines 55-58 list four explicit groups, each with `autogenerate: { directory: '<quadrant>' }`. The autogenerate directory is the slug-relative quadrant, not a `docs/`-prefixed path. So the section needs exactly:

```js
{ label: 'Adoption', items: [{ autogenerate: { directory: 'adoption' } }] },
```

**Placement matters.** The router must occupy the sidebar's top slot, which means the Adoption group goes **above** Tutorials rather than appended after Explanation.

**3. The folder README is tracked but is NOT a site route.** `gen-docs-site.mjs` (line 60) does not emit a quadrant's index page, because the sidebar already lists the quadrant's pages. So `docs/adoption/README.md` satisfies `G8` and costs a tracked file, but it adds **no** route-manifest entry and cannot be linked as an on-site page.

**Consequence for route parity:** the manifest grows by one entry per door page plus the router, the map and the gallery, and **not** by the README. The manifest currently holds 88 routes.

## D4 - The three curated touchpoints

The router is worthless if it cannot be found, and it is the one page in this release whose discoverability cannot be delegated to the sidebar.

| Surface | Change | Why this one |
| --- | --- | --- |
| `README.md` | A "Find your way in" section linking the router | The GitHub-rendered hero is where most strangers arrive |
| `QUICKSTART.md` footer | "That was one lane. Here are the other eight jobs" | Catches the reader who finished the quick start and does not know what is next |
| Docs-site landing (`index.mdx`) | Router in the primary call to action | The only surface a search-engine arrival sees |

**These three are hand-edited and therefore drift.** Each is one line, and each is listed here so the dogfood walkthrough (W6) can check all three rather than remembering two.

## Acceptance for W1

Each able to fail.

1. **The router lists exactly nine doors, every link resolves, and the set is closed both ways.** No door page unlisted; no listed door without a page.
2. **`Bronze|Silver|Gold|tier` returns no hit in `docs/adoption/start-here.md` above the door table.** Grep-checkable.
3. **The capability map renders in BOTH themes**, verified by looking at the built site in light and dark, not by trusting `autoTheme`.
4. **Route parity is green against a BUILT site**, and the manifest names the router, the map and the gallery. An unbuilt site reports a new page as a baseline route removed, so a parity run without a build proves nothing.
5. **The Adoption sidebar group sits above Tutorials**, verified in the built site.
6. **All three curated touchpoints link the router**, verified by following each from a browser rather than by grepping for the string.
7. **`docs/adoption/README.md` carries a non-empty frontmatter `title` and lists every child page**, so `G7` (docs frontmatter) and `G8` (folder README) both pass.

## What W1 does NOT decide

- **The door page contents.** W2, W3 and W4 own those. W1 owns only the table that points at them.
- **Whether the four Diataxis quadrants are reordered.** Adding a group above Tutorials is not a reorganisation of the existing four, and turning it into one would put an unrelated navigation change inside a docs release.
- **Any change to `gen-docs-site.mjs`.** Measured above: none is needed. If the implementation finds one is, that is a finding worth stopping on, because it means one of the three facts in D3 was wrong.
