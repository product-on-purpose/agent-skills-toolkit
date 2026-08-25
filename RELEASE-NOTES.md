# Release notes

Curated, user-facing highlights. For the full technical history see [`CHANGELOG.md`](CHANGELOG.md).

## 1.16.2 - 2026-08-25

**If you used the reusable Action, your gate never ran. It does now.**

### Do you need to do anything?

**Yes, if you consume the Action.** Bump your `uses:` pin to `v1.16.2`. Nothing else changes: no check
is added or removed, the spine stays at **34**, and the Standard stays at **0.15**. Grades are
unaffected, because the broken step failed before any grading happened.

### What was broken

The Action's `Set up Node` step asked `setup-node` to cache npm using a `cache-dependency-path` built
from `github.action_path`. That is an absolute path outside the workspace, and `setup-node` resolves
the input as a glob relative to `GITHUB_WORKSPACE`, so it never matched. An unresolved path is an
error there, so the composite step failed and took the gate with it.

The failure was maximally confusing: a red required check, a log complaining about dependency caching,
and no findings, no tier, and no SARIF, because the grader never executed. Anyone reading it would
reasonably conclude their repository had a problem.

### Why the cache is gone rather than fixed

The install being cached is one package. There is also no workspace-relative path that can point at
the Action's own lockfile, which is the whole reason the absolute form was reached for. Removing the
cache costs a second or two per run and removes an entire failure mode.

## 1.16.1 - 2026-08-24

**If you installed this toolkit from npm rather than cloning it, you could not reach Gold. Now you can.**

### Do you need to do anything?

**Almost certainly not.** No check is added, none is removed, the spine stays at **34** and the Standard stays at **0.15**. Five plugins were graded before and after this change and not one moved.

**The exception is if you were chasing Gold and `G2` kept failing.** Nothing to change on your side: re-run your pipeline, and a CI file that was already correct should now pass.

### The bug

`G2` asks for CI that runs the conformance gate. It recognised one way of writing that: `node scripts/check.mjs`, a path that exists only if you cloned this repository.

Our own install instructions tell you to use npm or the plugin marketplace. Do that, and you have no `scripts/` folder at all. The command you *can* run was the one `G2` refused. **So Gold was unreachable for anyone who followed the documentation.**

`G2` now accepts five ways of running the same gate:

- `npx agent-skills-toolkit .`
- the installed command on its own, if you added the package as a dependency
- an `agent-skills-toolkit` GitHub Action
- `node scripts/check.mjs`, if you do vendor the gate
- an npm script that runs any of the above

Installing the package still does not count. Running it is the point.

**Nothing about the rules changed.** The Standard already asked for CI that runs the suite *via the portable scripts*, and `npx` runs exactly those from the published package. Only the checker disagreed with it.

### Three more fixes, all in our own guards

- **A vendor-claim watcher reported a clean run on a claim nothing could ever check.** One mistyped character in a claim's source made it permanently unverifiable while the gate said everything was fine. It is one of five gates that block a release here.
- **A parity check treated a corrupt file and a missing file as the same event.** They are not: one is a defect, the other is nothing to compare.
- **A worked example labelled a rewritten sentence as a direct quote.** The page it came from carries a list; the example had flattened it into prose and still called it verbatim.

### The documentation got a plain-language pass

**Eighty-eight commands across 37 pages did not work for the reader they were written for.** They all said `node scripts/...`, which needs a clone, while the install guide sends you to npm. They now use a command you can actually run.

One page had been **false for three months**: it told readers to wait for something that had already shipped. And the glossary is now reachable from every section rather than buried in one.

The rules behind those fixes are now built into the skill that writes our documentation, so new pages start from them.
## 1.16.0 - 2026-08-22

**The evidence this Standard rests on gets an address - and the release found that some of it was resting on nothing.**

### Do you need to do anything?

**No.** No check was added, none was removed, the spine stays at **34**, and the Standard stays at **0.15**. All six reference-family plugins were graded before and after. Every one came back **byte-identical**.

**Installing changes nothing either way.** Files moved inside the repository. The npm tarball ships the gate and `STANDARD.md`; the plugin install carries the whole tree. Both paths carry them as before.

**One exception, if you pin the GitHub Action to a tag.** `action.yml`'s example now reads `@v1.16.0`. Pin a released tag or a commit sha - the example is an example, not a recommendation to track.

### One thing worth re-reading

**If you used the README's tier model to decide what Bronze requires, read it again.** It described the Universal tier as `U1-U9`, `U11-U13`, 12 checks. The tier actually ships **16**: `U1-U9` and `U11-U17`. Six lines above it, the same section stated the spine correctly, which is how the error survived - the wrong count and its wrong list agreed with each other perfectly.

Four Universal checks therefore had **no description anywhere in the README**:

- **`U14` `agent-restricted-fields`** - a plugin-shipped agent declares none of `hooks`, `mcpServers` or `permissionMode`; Claude Code refuses those on plugin-shipped agents for security reasons, so an author who writes one gets no signal it was ignored.
- **`U15` `agents-dir-registerable`** - every `.md` under `agents/` is a registered subagent, because the runtime loads every file it finds there. A stray `README.md` ships as a live phantom subagent.
- **`U16` `metadata-placement`** - a governance key sits under `metadata`, not at the frontmatter top level where nothing reads it. The vocabulary itself stays open; only placement is checked.
- **`U17` `catalogue-manifest-shape`** - a `marketplace.json` you ship parses, carries a `plugins` array, and does not mix skill sources with plugin sources.

**If your `standard` pin is `0.15`, all four already apply to you as errors.** Nothing about the gate changed in this release; only what the README told you about it.

Eight public files carried a stale version of that list. All are corrected, and `scripts/check-doc-enumerations.mjs` now expands every check range in the documentation and compares it against the registry, so prose and gate cannot drift apart again without the suite failing.

### Why this release exists

The tier ladder is defined by what Claude Code and Codex support. That makes **every tier boundary a claim about software this project does not control.**

Those claims used to live scattered across one skill's private folder and three separate directories. **No artifact recorded which vendor fact any boundary actually depended on.**
### What is new

**A `foundation/` folder** holding what the Standard rests on, in three layers: verified first-party sources, the machine-checkable claims, and the conclusions drawn from them. Every source record carries what was read, which version, when, and **by what method** - because "confirmed on the 19th" describes a page-read and a live experiment identically while distinguishing neither.

**`tier-basis.md`**, which records, per tier boundary, the vendor fact it depends on and whether that fact is pinned anywhere. **A boundary with no evidence gets a row reading `unverified`, never an omitted row.** An absent row reads as "no boundary here"; an `unverified` row reads as "a boundary nobody has grounded", which is the finding.

### What it found, stated plainly

**Every pinned claim in this repository sources from a Claude Code page.** There is no pinned claim for any Codex fact and none for any Cowork fact - so the Convergent tier, which is *defined* as what both agents support in different formats, has pinned evidence for one of them.

**The Codex hook event list in our capability matrix was missing an event.** The vendor documents eleven; this repository recorded ten. Found by opening the reference and counting.

**Two shipped checks accommodate Cowork behaviour the vendor documents nowhere.** They are almost certainly correct and they have no expiry, so if that behaviour changed, nothing here would notice.

None of these is fixed in this release. Each is filed, because a boundary resting on nothing is a finding to record, and moving a tier is its own decision with its own migration window.

### On the review

Two adversarial waves, a four-lens panel, and a direct probe of the panel's own fixes returned **more than thirty findings** between them. Several were defects in the fixes for earlier findings - including one that would have blocked every future release the moment a vendor re-rendered a documentation page.

That is recorded in full rather than summarized away, in the release packet's findings ledger, and it is the reason this release took the shape it did.

## 1.15.0 - 2026-08-20

**Two rules that had been warnings since 0.14 became errors. Nothing happens to you until you opt in.**

### Do you need to do anything?

**If `library.json` has a `standard` line** (the version of the rules you are graded against), **no.** Your grade does not change until you raise that number yourself.

**If it does not have one, yes - today.** A plugin with no `standard` line is graded against the newest rules the moment they ship, so both rules below already apply to you. Add the line and pick a version:

```jsonc
{ "standard": "0.14" }   // grades you against 0.14's rules, not whatever is newest
```

### See what adopting 0.15 would cost, before you commit

```bash
npx agent-skills-toolkit . --strict
```

That grades you against the newest rules **without changing your pin**. Anything that appears only under `--strict` is something adoption would turn real. Nothing is written; it just tells you.

### The two rules

**1. Declare your workflows.** Every `_workflows/<name>.md` file must be listed in `library.json` under `components.workflows`, and everything listed there must exist on disk.

*Why it matters:* a workflow file you never declared is invisible to whoever installs your plugin - it ships, and nothing loads it. A declared file that does not exist cannot be delivered at all.

**2. A marketplace catalogue must be readable in one piece.** If you ship `.claude-plugin/marketplace.json`, it must parse, it must have a `plugins` array, and its entries must not mix skill-style sources with plugin-style sources.

*Why it matters:* a catalogue that mixes both kinds is claimed entirely by the first tool that reads it, so the other half is examined by nothing and fails silently.

### Also new: your pinned GitHub Actions get checked

If you pin an Action by commit SHA, the `# v1.2.3` comment next to it is the only part a human reads - and the bots that bump the SHA routinely leave that comment stale. We had caught that by eye three times and never once automatically.

```bash
npm run action-pin-watch
```

It resolves every pin and reports where the label disagrees with what the SHA actually points at. **It reports and never rewrites**, because which half is wrong is a judgement call. A pin that is merely *behind* the latest release is reported and **never fails the run** - that is news about someone else's release, not a defect in yours.

This runs on our workflows. **It adds no requirement to your plugin.**

### Also new: three skills for keeping up with the agents

- **`askit-capability-whats-new`** - surveys what Claude Code, Cowork, Codex and the upstream spec shipped since you last looked, and writes a dated record. It decides nothing, and it records a **version** rather than a date, so "everything since 2.1.208" is exact and anyone can re-check it.
- **`askit-capability-gap-analysis`** - takes one of those findings and works out what it means for you. It **proposes** a change and implements none of it.
- Together with the existing **`askit-capability-advisor`** they read as the sequence they are: *what shipped, what it means for us, what we tell an author.*

**Why a survey you run rather than an alarm that fires:** while building this we measured one platform moving through **29 versions inside a single changelog window**, and another carrying **31 entries**. An alarm that fires weekly on entries which almost never matter teaches you to close it unread - and then it is worse than nothing, because its existence looks like assurance.

### A documentation fix worth re-reading

`docs/reference/universal-checks.md` - the page describing the entry-level requirements - **had stopped at `U13`**, missing four checks across two releases. The README always said 34 because that number is machine-checked; the table it pointed at was not. **If you used that page to understand the entry-level bar, read it again.**

### What did not change

**34 checks, same as before.** None added, none removed. Every plugin in our reference set was graded before and after, at its own pin, and **not one changed grade**.

### The part we would rather not print

The catalogue rule graduated against a survey that found **zero real instances** of the problem it prevents. It is preventive, not corrective. We shipped it anyway, because nothing in our plan schedules the growth that would change that answer - so "wait for evidence" would have quietly meant "never". **If catalogues that mix entry kinds turn out to be a real pattern rather than a mistake, that is the thing to tell us.**

The other rule waited a full release for one specific reason: graduating it immediately would have cost a real plugin in our reference set an entire grade, over nine workflows it shipped and had not declared. **That plugin declared all nine the day after we published the decision** - inside the window the decision created. That is what a migration window is for, and it is the first time we watched one work end to end.

## 1.14.0 - 2026-08-16

**Four things the grader was telling you that were not true, and three files it was never looking at.**

### Do you need to do anything?

**No.** Nothing here changes your grade until you raise the `standard` line in your own `library.json`. If you change nothing, nothing changes.

**Unless you have no `standard` line at all** - then you are graded against the newest rules the moment they ship. Add one and pick a version.

**One thing is worth checking even if you do nothing:** if your plugin has an `agents/` folder, read the third section below. It describes files that were shipping and being loaded without anyone noticing.

### Four wrong answers, now fixed

Each of these was the grader reporting a problem that did not exist. **A false alarm is worse than a missed defect** - it costs you time and teaches you to ignore the report.

- **"That workflow doesn't exist"** - when it did. A command saying `maps-to: my-workflow` was reported as pointing at nothing.
- **"That agent file isn't on disk"** - when it was. Honestly declaring `agents/_helper.md` got you told it was missing.
- **"Your description doesn't say when to use it"** - said to descriptions that said exactly that, **in French**. The scorer awarded more than a third of its points for English phrasing.
- **"Your command's description is too weak"** - it would have been, if we had shipped what we planned. We measured first: **0 of 14 commands** in our own reference set would have met the bar we were about to impose. We did not ship it.

### Three files your runtime loads and the grader never read

**Claude Code registers every `.md` file under `agents/`.** Not the ones you declared - every one. A folder `README.md` sitting there becomes a subagent named `README`, with no description and no purpose, silently.

**Check your own `agents/` folder.** If it holds a README, a template, or a scratch file, your plugin is shipping a phantom subagent right now. The grader now reports these; it never did before.

### What deliberately did not change

**Your frontmatter can carry whatever keys you like.** We considered restricting the vocabulary, and measured before deciding: **44.9 percent of 2342 skills** across the ecosystem carry a key our Standard does not name. Restricting would have failed nearly half of everything. We did not.

**A marketplace-level problem will never become a requirement on your plugin.** If two plugins in a catalogue collide on a skill name, neither author can fix it alone - it depends on who they were listed beside. **A requirement you cannot discharge by yourself is not a requirement.**

### How this was checked before shipping

- **Codex was actually run.** `codex-cli 0.144.5` **ingested** the emitted `.codex-plugin/plugin.json` and discovered the skills it points at. Listing is not ingestion, and a test that only checks the file parses has proved nothing.
- **1252 tests**, no failures, on Windows and Linux, on Node 22.12 and 24.
- **Six plugins in our reference set graded before and after every change. No grade moved.**

### Where this release came from

Seven decisions were written and **measured before any code was written**. **Three of those measurements overturned the decision they were testing** - including the command-description bar that would have failed all fourteen of our own commands.

That is the whole method: write down what you intend, measure it against something real, and let the measurement win. Three times out of seven it did.

## 1.13.0 - 2026-08-13

**You are now graded against the ruleset you pinned - in both directions.**

That was already true for a brand-new check: if your `library.json` says `"standard": "0.12"`, a check
introduced at 0.13 was reported as a warning, never a gate failure. It was quietly NOT true for a rule
that already existed and was being made stricter. Those took effect for everyone the day the tooling
shipped them.

It also was not true if you had an `askit.config.json`. Your own per-rule override was applied *after* the
pin, so it beat the pin - which sounds like a feature until you notice it works in the harmful direction
too: a rule you turned up to `error` would gate you on a check that did not exist when you pinned.

Both are fixed. There is now one ceiling, it is computed from the version you declared, and it is applied
last - after your profile, your overrides and your suppressions. If you change nothing, nothing about your
grade changes.

### What this costs you, and when

Nothing, until you raise your own `standard` pin. When you do, four things become effective. The full list
with remediation for each is in
[Adopting Standard 0.13](docs/reference/adopting-standard-0-13.md):

- **`U13`** - every skill directory you ship must be registered in your manifest, and every registered
  skill must exist on disk. This was scheduled for 0.13 when it was introduced at 0.12.
- **`S4`** - a chain declaration written as a string is held to the same bar as one written as an array.
  Also scheduled.
- **`U14`** (new) - an agent shipped inside a plugin may not declare `hooks`, `mcpServers` or
  `permissionMode`. Claude Code refuses these three, in its own words "for security reasons". The field is
  refused rather than ignored, and nothing tells you - so an agent carrying one has configured something
  that is simply not in effect. The toolkit already detected this when grading a catalogue; now it tells
  you when you grade your own plugin, which is how almost everyone runs it.
- **`selfValidation`** - a new optional `library.json` field. You almost certainly want to omit it.

**If you have no `standard` pin at all, none of this protects you.** An unpinned plugin is graded against
the current ruleset immediately, because a plugin that never declared which contract it adopted cannot be
graded against the one it adopted. Adding one line fixes it, and the page above leads with this.

### Two things that can now fail where they passed

Said plainly, because a guarantee whose exceptions are buried is not a guarantee:

- **`--strict` ignores your pin, by definition, and now ignores the ceilings too.** If you run `--strict`
  in your own CI at an older pin, the newly graduated checks will fail there. That is the flag doing what
  it has always said it does.
- **A published verdict can now fail where it passed.** In `published-verdict` mode - the mode for
  publishing a conformance verdict about *someone else's* plugin - a setting the graded subject wrote
  about itself can no longer weaken an objective or vendor-cited finding. Previously such a setting was
  merely clamped up to a warning, which meant turning the mode on could never fail a passing gate. A
  subject can still be *stricter* about itself, and any setting you supply as the grader is honoured in
  full. What changed is that a subject cannot grade itself leniently in the one mode built to publish a
  verdict about it.

### One thing we fixed that was our fault

`gen-index` wrote `Self-validating: node scripts/check.mjs` into every `INDEX.md` it generated - including
for plugins that consume this toolkit rather than vendoring it, and therefore have no such file. That is a
false instruction shipped inside your repository, over your signature. It now writes
`npx agent-skills-toolkit .` unless your `library.json` declares `"selfValidation": "vendored"`.

Regenerating your index is the fix. Until Standard 0.14, an `INDEX.md` that matches the old rendering
exactly is reported as a **warning**, not an error, so you are not gated on a defect we caused.

### How this release was verified

Cutting a release here means running a checklist where every item is a gated check rather than a
reminder. Two of them are worth stating in public, because they are the ones a reader cannot confirm
for themselves.

**The Codex round-trip was run for this tag.** The manifest this toolkit emits was installed into a
throwaway local marketplace against the real `codex` CLI, and the skills were confirmed INGESTED rather
than merely listed - the distinction matters, because a manifest can appear in a listing while the
runtime quietly loads nothing from it. Run against **Codex CLI 0.144.5** on 2026-08-14: passing. The
previously recorded verification was against 0.135.0, so this also re-confirms the emission against a
newer CLI.

**The branch was adversarially reviewed seven times, not once.** Each round reviewed the code the
PREVIOUS round's fixes produced, because that code is otherwise unreviewed - and this project has the
receipts for why that matters: v1.12.0 shipped after a single round and needed v1.12.1 for four more
problems, every one of them inside round-one fix code. The rounds found, among other things, a way to
bypass this release's own new check by putting a restricted field in a file the runtime loads but the
gate was not reading, and a stale count on the front page of the README. Every fix carries a test that
was proved capable of failing before it was trusted.

## 1.12.1 - 2026-08-12

v1.12.0 was reviewed once. This patch exists because we then reviewed **the fixes that review produced**, which nobody had looked at - including one to the check that had just started blocking pull requests.

That second pass found four more problems, all of them in code the first pass caused us to write.

### What was wrong

- **A deliberate exception was excusing more than it should.** One known, documented warning in our starter template is allowed to fail a vendor check. The way that permission was written, if the template ever picked up a *second, unrelated* problem, it would have been waved through too - hiding a defect in the very template every new plugin is created from. The permission is now tied to the specific warning it was granted for.
- **The tool could grade the wrong folder.** Members are found by directory name, so it checks the folder's git remote to confirm it really is your plugin. Two earlier versions of that check could be fooled by a lookalike address, and a folder with no git information at all could quietly beat the correct one. Identity is now compared exactly, a confirmed match always wins over an unconfirmed one, and if identity cannot be established the report says so out loud instead of assuming.
- **A plugin could be mistaken for a catalogue.** The test for "is this a plugin or a list of plugins" was checking too few things, so a plugin that happened to ship only certain component types could have been graded as a catalogue and skipped its own checks entirely.
- **The documentation described the old behaviour.** The rules for what turns a run red were corrected in v1.12.0's code but not in its docs.

### Upgrade

**No action required.** No check was added, removed or tightened; the Standard and the check spine are untouched. If you are not grading a marketplace, nothing here affects you.

## 1.12.0 - 2026-08-12

Until now, grading a marketplace meant running the gate once per plugin and reading six results. This release grades the **catalogue** - and the first thing it did was tell us ours is red.

### The problem it solves

A marketplace of six plugins can report six green grades and still be broken as a marketplace. Three things can only be seen by looking at the members together:

- **Two plugins shipping the same skill name.** Each one is fine on its own. In the union they occupy one name in a shared pool, and which one an agent picks is undefined.
- **A catalogue entry that resolves to nothing.** Every plugin that *did* resolve still grades green, so the summary reads healthy while anyone following that entry receives nothing.
- **A version in the catalogue that disagrees with the plugin's own manifest.** Either the plugin released without its listing moving, or the listing moved past a release that never shipped.

Nothing looked at any of these, because nothing looked at the catalogue.

### How it decides

Every member is graded **at its own declared tier and its own Standard version**, exactly as it would be graded alone. The collection is red if any member fails **its own** claim.

That is the whole rule, and the two things it refuses to do are the point. It never measures a plugin against a bar it did not claim just because a sibling claimed a higher one. And there is no threshold to adjust - no "green if four of six pass" - because a bar you can move until the number looks good is not a bar.

### Being told your own portfolio is red

Running this against our own six-plugin marketplace returns **red**, for two different and equally real reasons. One member declares Gold and earns Silver, its single error caused by a fix we shipped in an earlier release of this very toolkit. Another declares no tier at all and carries 235 errors.

We published the result rather than quietly fixing the rule, and there is now a [public page](https://product-on-purpose.github.io/agent-skills-toolkit/reference/family-registry/) showing it, with the exact command to reproduce every number on it.

### What the report is careful about

- **It tells you which tree it read.** A run grades the checkouts on your machine, not the commits the catalogue pins. So every row shows the pinned commit, the listed version, and the commit actually graded - **even when they agree**. A report that only mentions the pin when something is wrong teaches you to assume nothing is wrong when it stays quiet.
- **It separates "your catalogue is broken" from "your laptop is incomplete."** A dead entry your catalogue points at by name is a defect and fails the run. A plugin you simply have not cloned is not, and the verdict line always says how many of the members it actually covered.
- **It checks that the folder it found is really your plugin.** Members are located by directory name, which is not proof, so it compares the checkout's git remote against the source your catalogue declares. A folder that turns out to be a different repository is skipped rather than graded in your plugin's place. If a checkout has no git information at all, it is still graded, but the report says plainly that it could not confirm what it was looking at.
- **It shows what an old pin is hiding.** Each member's "Standard debt" counts the findings that are only warnings because that plugin targets an older version of the Standard. They become failures the day it updates.

### Also in this release

- Marketplaces can now list plugins from npm packages, from verified archives, and from subdirectories of a repository, and can record the names a plugin previously shipped under so people following an old name can be redirected.
- Plugins that ship subagents get a warning when one declares a setting Claude Code refuses to honor for security reasons, so you find out from a report rather than from the feature silently not working.
### One thing we found and did not ship

Installing our own published package into an empty folder and following our own instructions showed that a generated `INDEX.md` tells plugins which consume this toolkit to run a command only *this* repository has - written into their repository, over their signature.

The one-line fix took minutes. We reverted it, because measuring it showed it would have turned a currently-passing plugin in our own marketplace red, by changing what its index is expected to say. That is a fix worth making in a release that tells everyone to regenerate, and this release promises the opposite: that nothing you are graded by moves. It is queued for the next release, which carries a Standard update and a migration step anyway.

We are recording it here rather than quietly holding it, because the reasoning that nearly shipped it was wrong in a specific and instructive way: we assumed every affected plugin was already failing that check for an older reason. One measurement showed otherwise.

### Upgrade

**No action required, and nothing you are graded by has changed.** No check was added, removed or tightened; the Standard is untouched at 0.12 and the check spine is unchanged at 30. Everything new here is a capability, available when you point the tool at a catalogue instead of a plugin.

## 1.11.1 - 2026-08-11

A one-line story: v1.11.0 shipped a test that could not run in the shell most Windows users are sitting in, and because that test runs before publishing, it made publishing impossible.

### What was wrong

The test suite includes one test that runs the GitHub Action's real shell script, to prove the Action does what its documentation claims. It launched that script by asking the operating system for "bash".

On Windows, what you get back depends on where you asked from. From Git Bash you get Git's bash, which sees the same files Windows does. From PowerShell you get the Windows Subsystem for Linux, which is a different operating system with a different filesystem, and which deliberately does not receive the environment variables the test had just set. The script therefore tried to write to a path that resolved to the root of a Linux install, was refused, and died before producing output.

Seven tests then failed with a message about a missing tier value, which looks like a grading bug and is not one. That misdirection cost more time than the defect itself, so it is fixed too: if the script dies early, the test now says so, and shows the shell it used and what that shell printed.

### Why it matters more than a broken test

The publish step runs the test suite first, on purpose, so a broken build cannot reach the registry. That guard worked exactly as designed. It just fired on a defective test rather than a defective package, and the effect was that **the project could not be published from the default Windows shell at all**.

### The part worth keeping

**No amount of CI would have caught this.** Every Linux build machine has a real `bash`, so the test passes there forever. It surfaced because a person on Windows ran the published instructions in their own terminal and pasted what happened.

That is the same lesson this project keeps relearning in different clothes: an instruction is not verified until somebody runs it from where the reader will be standing.

### What changed

The test now looks for a specific, known-good bash rather than asking the system for whatever is first on the path, and it explicitly refuses the Windows Subsystem for Linux launcher instead of quietly using it. If it cannot find a suitable shell at all it fails loudly, because a test that silently skips when it cannot run is worse than one that fails: it reports success while checking nothing.

Every other test that starts a subprocess was checked. This was the only one making that assumption.

### Upgrade

**No action required.** Nothing that grades your plugin changed, no check moved, and the Standard is untouched. This affects only people running this project's own test suite on Windows.

## 1.11.0 - 2026-08-11

Until now this toolkit graded plugins and the grade stayed here. You could clone the repository and run it; that was the whole distribution story. This release is about making the grade something you can actually reach, use in CI, and point at.

### What you can do now that you could not before

- **Run the gate without installing anything permanent.** `npx agent-skills-toolkit /path/to/your-plugin` grades a plugin and exits non-zero if it fails. We proved this the awkward way rather than the convenient way: the package was built, installed into an empty directory on a machine with no copy of this project, pointed at a plugin somewhere else entirely, and run. That is the only way to find out whether the thing you shipped actually contains what it needs.

- **Put findings where your tools already look.** The gate now emits SARIF, so results appear in the GitHub Security tab, and GitHub Actions annotations, so they appear inline on the diff of a pull request. There is also plain `--json` if you want to do something else with them.

- **Add it to a workflow in a few lines.** There is a published Action. It takes the path, the profile and whether to fail the build, and it hands back the earned tier and the counts so you can branch on them.

- **See the grade without trusting a hand-typed badge.** The tier badge is now generated in CI and states what it graded: the tier, the commit, the Standard version, and the date. The previous badge was typed by a human, and this project's own front-page claims quietly went stale for two releases before anyone noticed. A badge that can go stale is worse than no badge, because it is wrong with a machine's authority behind it.

### Two things worth knowing about how this was built

**Provenance is now visible everywhere.** Every finding says whether the rule behind it is an objective fact, something a vendor documents, or this project's own opinion. That distinction was computed internally for a long time and never shown to you. It matters because "30 checks passed" means something quite different depending on how many of those thirty are simply our preferences, and you are entitled to filter to the portable ones.

**Nothing here changes what passes or fails.** Every output added is a re-serialization of what the gate already worked out. No plugin's tier moves, no exit code changes. Where we could not fill a field honestly we left it out: findings mostly do not carry line numbers yet, so SARIF points at a file rather than inventing a line. A tool whose whole value is that it does not guess should not guess.

### For anyone building on the Standard

The scaffold now produces a plugin the vendor's own validator recognizes, which it did not before. There is one honest wrinkle: `claude plugin validate --strict` wants an author, and a blank template genuinely has no author to name. So the raw template warns, permanently and correctly, while a plugin you scaffold through the interview supplies a real one and passes. We considered writing `"author": "REPLACE - your name"` to make the warning go away and decided against it, because a placeholder that satisfies a checker is exactly the kind of thing this toolkit penalizes other people for.

There is also a new parity harness that runs the vendors' own validators against this repository on every build. It checks the **parsed results**, not just whether the validators exited cleanly, because we recently shipped a defect where a validator said "valid" while quietly corrupting a field it never inspected. It is report-only for now: it has only ever run locally, and a check that has never executed in real CI has not earned the right to block anyone yet.

### Upgrade

**No action required.** Nothing that grades your plugin changed.

To try the new install path:

```bash
npx agent-skills-toolkit /path/to/your-plugin
```

Note that this requires the package to be published to npm, which is a separate manual step the maintainer takes; until then, the GitHub Action works regardless, because it runs this repository's code at a pinned commit rather than installing from a registry.

## 1.10.1 - 2026-08-11

A patch that ships no new capability. Everything in it is the toolkit correcting a claim it was making about itself, and then arranging for a machine to catch that claim next time.

### What changed

- **Two fixes that were already merged finally reach you.** The previous release changed how `INDEX.md` is generated, which puts any plugin with a previously-generated index into a `G4` drift error on upgrade, and it shipped without an upgrade note explaining that. The instruction telling you how to fix it then pointed at a command you do not have, because nothing installs the generators into your plugin. Both were repaired weeks ago and sat unreleased. A fix nobody can install is not a fix.

- **Our own fix from the last release was incomplete, and the incomplete version was worse.** We had moved the delegation-chain declaration in two skills out of a frontmatter field the specification does not allow and into the `metadata` namespace, which it does. That stopped the specification's validator rejecting them. It also introduced a quieter problem: the specification defines `metadata` values as strings, and its reference implementation does not reject a non-string, it silently rewrites one. Our list came back as a string containing a printed list. The validator kept reporting "Valid skill" the whole time, because it never looks inside `metadata` at all. We traded a loud failure for a silent one. The declaration is now a plain comma-separated string that survives the round trip unchanged, and the check that reads it accepts the old shapes too, so nothing you have written stops working.

  Worth taking from this if you write skills: **a validator passing is weaker evidence than it looks.** Ours passed 24 of 24 while carrying corrupted data, because nothing in the validation path inspected the field.

- **A path you typed is now normalized before it is used.** Every command-line entry point took a filesystem path and used it as given. Our own troubleshooting page told you to work around this by remembering to use forward slashes. The workaround is gone. The normalization is deliberately applied only where the platform makes a backslash a separator, because on Linux and macOS a backslash is a legal character in a filename and rewriting it there would be the same bug pointed the other way. A Windows CI job now runs the full suite and the gate on every change, so this is checked rather than reasoned about.

- **Three claims the repository made about itself are now machine-checked.** Our release checklist has always said the README's status must match the declared version, and only the badge was ever compared, so the version written in the prose beside it went unchecked. That is now checked, along with the skill count and the number of checks in the spine, all read from the repository rather than from a second list somebody has to update. The internal status document, which describes itself as the single live source of truth, had grown into a 151-line log that at one point described already-shipped work as outstanding; it is rewritten to 104 lines of current state.

- **The upstream specification moved, and we looked properly.** Our watcher flagged a change to the `metadata` field as material. Reading the actual diff showed the upstream had copied a sentence into a summary table from its own prose a few paragraphs down, where it had been all along. Nothing upstream requires changed. We re-pinned and changed no rule. The finding that mattered came from investigating it: our own skills had been violating that already-published sentence.

### Why this is a patch release

Nothing that grades your plugin changed. The spine stays at 30 checks and the Standard stays at v0.12. No check was added or removed, and **no plugin's tier or exit code moves because of anything here.**

There is one behavioral change in a check, and it is deliberately scheduled rather than immediate. A delegation chain written as a single string used to be read as no declaration at all, so the chain-contract check could not see it. It can now. That means the check can newly fire on a plugin it was previously blind to, which would be a tightening, and a patch release is the wrong place to tighten anything. So findings that come from a **string-shaped** declaration are **warnings** in this release and become errors at Standard 0.13. Declarations written as a list keep the behavior they have always had. If you get a new warning here, you have until the next Standard minor to add the contract entry, and nothing about your tier changes in the meantime.

This was caught by a pre-release adversarial review, not by us. The plan for this release asserted that no third-party verdict would move while the implementation carried an exception to that, and nobody noticed until an outside pass read both.

### Upgrade

**No action required.** Nothing here breaks an existing plugin.

**One thing worth checking if you declare a delegation chain.** If you copied our earlier guidance and wrote it as a YAML list under `metadata`:

```yaml
metadata:
  chain:
    - some-subagent
    - another-subagent
```

that still works with this toolkit, and we intend to keep reading it. But any tool that parses your skill through the agentskills.io reference implementation will silently turn that list into a string containing a printed list, because the specification defines `metadata` values as strings. If you care about how your skill reads to other tools, write it as:

```yaml
metadata:
  chain: some-subagent, another-subagent
```

You can confirm the difference yourself without taking our word for it:

```bash
uvx --from skills-ref python -c "from skills_ref.parser import parse_frontmatter; import pathlib; md,_ = parse_frontmatter(pathlib.Path('skills/your-skill/SKILL.md').read_text(encoding='utf-8')); print(repr(md['metadata']))"
```

**If you are still carrying the `G4` index drift from v1.10.0**, that upgrade note is in the 1.10.0 entry below and is unchanged.

## 1.10.0 - 2026-08-07

The release where the grader got graded. `critique-skills` was the first plugin built against this Standard from scratch, and being on the receiving end of it found three defects in this toolkit that no amount of self-validation had surfaced.

### What changed

- **The grader was wrong about Python projects.** Its list of directories to ignore covered the Node ecosystem and nothing else, so it walked into Python bytecode caches and reported them as missing documentation. Three of one plugin's five outstanding findings were this, with no action the plugin could take: you cannot document a folder that appears and disappears as tests run. The list now covers both ecosystems and is grouped by category, so the next gap is visible rather than latent.
- **The index generator described this toolkit instead of the plugin it was indexing.** Two sections of every generated `INDEX.md` were fixed text listing files that exist here, emitted verbatim into other people's repositories. One plugin's index linked seven files that did not exist. The failure hid itself: the drift check compares an index against the same generator that wrote it, so wrong-but-consistent passed forever, and a plugin that corrected its own index was then reported as drifted for being right. Both sections now list only what is actually on disk, and a plugin that has everything renders byte-identically to before.
- **A rule of ours was creating a real defect in every plugin that followed it.** We required a README in the `agents/` folder. Claude Code treats every markdown file in that folder as a subagent definition, so the README was silently registering as a subagent with no name and no description. We verified it by asking a running Claude Code what subagents it could see. Two plugins had shipped one, including this one. The rule is withdrawn.

  That last one had already happened once. Our own records show a folder README becoming "a bogus subagent" during earlier work, fixed by teaching *our* tooling to ignore it. That fixed our idea of what an agent is and left the actual runtime's untouched. The runtime is the one that ships.

- **A working practice for running more than one plugin.** New page, [Manage several plugins and a marketplace](https://product-on-purpose.github.io/agent-skills-toolkit/how-to/manage-multiple-plugins/): where the Standard is authoritative and where it is not, how to grade a whole catalogue today, how a re-pin works end to end, and which parts are still manual.
- **The toolkit now states what it cannot do.** New page collecting, with evidence, every limit worth knowing before trusting a grade: the gate checks structure and never content, the advisory layer is measured rather than guaranteed, and several checks have documented blind spots. Each limit is labelled deliberate, tracked, or not-built, so you can tell which ones will change.

### Why this is a minor release

Two checks changed what they require, which is a behaviour change for anyone grading against them, and a plugin previously reported as failing may now pass. Nothing that passed before newly fails. The spine stays 30 checks and the Standard stays v0.12.

### Upgrade

**If your plugin has an `INDEX.md` generated by an earlier version, expect one new `G4` error, and regenerate.**

This is the migration consequence of the index-generator fix above. The old generator wrote two boilerplate sections describing *this toolkit's* layout into every plugin it indexed. If yours does not ship a `.codex-plugin/`, a `templates/`, a `STANDARD.md`, or a `docs/internal/`, your index has been linking files you do not have. The new generator lists only what is on disk, so your committed index and the generator now disagree, and `G4` says so.

Regenerate, review the diff, commit:

```bash
node /path/to/agent-skills-toolkit/scripts/generators/gen-index.mjs /path/to/your-plugin --write
```

The plugin root is a positional argument, not a flag, and nothing installs the generators into your repository, so run them from wherever the toolkit is checked out. On Windows use forward slashes.

Three things worth knowing before you treat this as a regression:

- **The error is the fix working, not breaking.** The old drift check compared your index against the same generator that wrote it, so a wrong index passed every check forever. This is the first release in which the check can see the difference.
- **The diff will be small and subtractive.** Regenerating removes dangling entries and changes nothing else. A worked example: one plugin in our own marketplace had exactly four dangling paths, and regenerating removed two lines.
- **If your plugin ships every artifact, nothing changes.** The new output is byte-identical to the old fixed text in that case, and you will see no drift.

A plugin that declares `tier: advanced` and does not regenerate will **fail its own declared tier**, because `G4` is a Gold error. One member of our own marketplace is in exactly that state as of this writing, which is how the consequence was found.

The full `G4` procedure, including the diff-before-write form, is in [Troubleshoot the gate](https://product-on-purpose.github.io/agent-skills-toolkit/how-to/troubleshoot-the-gate/).

## 1.9.0 - 2026-07-27

Two ways of catching the same mistake: a rule that exists and quietly is not applied everywhere it should be.

### What changed

- **The toolkit can now tell when the industry spec has moved.** Its own rulebook contained a line saying "when the wider spec changes, we must keep up" - and nothing did that, because no record existed of which version we were written against. There is now. It watches the spec, tells you what changed and which of your checks it touches, and drafts a decision record for you. It never edits anything itself, which matters: the rules are only allowed to change through a recorded decision, and a tool quietly rewriting them would destroy the thing that makes a grade mean anything.
- **It is honest about what it cannot do.** It reliably detects that something changed and where. It refuses to judge whether a prose change is *important*, because that is a human call. The worked example replays a real spec change that a simpler tool would have missed entirely, then declines to classify it.
- **Every decision record now names what implements it.** Three separate bugs this week came from the same shape: a rule was written down, applied in one place, and forgotten in the second place that needed it. Decisions now list the exact files, found by searching rather than remembering.
- **That change found a bug on its first use.** Applied to yesterday's decision about a report that could claim a grade nobody earned, it found four more places the fix had missed. Those are fixed too.

### Upgrade

No action required, and nothing that passed before newly fails.

## 1.8.0 - 2026-07-26

Deep builders, measured advisory. Two things: the builders learn to teach, and the AI review layer stops being an impression and becomes a number.

### What changed

- **Every builder now ships working examples. Before this release, none did.** The toolkit has thirteen skills that draft components for you, and between all of them there was not one worked example to learn from - only empty shapes. Now the four hardest ship three good examples plus one deliberately wrong one each, and the rest ship one apiece. Twenty-five in total, and every runnable one was actually executed during review rather than merely written.
- **The four hardest builders explain the judgement calls.** Their reference notes were 22 to 41 lines of shape. They are now real guides: what works, what goes wrong, and why the rule exists. One example: a recurring score of 0.65 that had puzzled five separate corpora turns out to be the exact arithmetic signature of a description that says what it does *or* when to use it, but not both.
- **Two templates that pointed at files which have never existed are fixed.** One of them is kept, deliberately, as the teaching example of that exact mistake.
- **We can now measure whether the AI review layer is any good.** A test plugin carries nine known flaws plus three deliberate traps that are *not* flaws, and a scorer grades a review against it. The central rule: a confident wrong answer counts as both a false alarm and a miss, so it scores worse than saying nothing. An honest "something looks off here, I am not sure" costs less. Confidently inventing a correction is the most expensive thing a reviewer can do, which is exactly right.
- **Authoring costs are now measured rather than guessed**, with the caveats printed beside the numbers.
- **A report that could claim a grade nobody earned is fixed.** If a plugin had not declared a quality tier, the generated report would quietly fill in the tier it happened to score and announce that the plugin "declares" it. On one real library the report said "10 of 10 satisfied" while the same files, checked the other way, produced seven failures - and the report's own data contained all seven. The terminal had been telling the truth the whole time; only the shareable document was wrong.

### Upgrade

No action required, and nothing that passed before newly fails.

## 1.7.0 - 2026-07-26

Trust and craft. Two kinds of work: making the things the toolkit already says about itself actually true, and teaching it to judge quality rather than only conformance. Nothing here changes what conformance requires: the spine stays 30 checks and the Standard stays v0.12.

### What changed

- **The front page is true, and cannot quietly go stale again.** The README advertised version 1.2.0 and 29 checks; the real values were three releases newer. Fixed, and a check now runs on every build that fails if the badge and the manifest ever disagree. A number nobody guards is a number that drifts.
- **The skill builder learned to review craft, not just rules.** Passing the gate means a skill is well-formed. It does not mean the skill is a good teacher. After your skill is clean, the builder can now offer a second opinion against a written rubric: is the trigger clear, are the examples real, is it the right length. Three things make it safe to accept. It is only ever offered once the gate is already clean, so it can never become a way around a failure. Its suggestions are split in two, and only a closed list of mechanical fixes (a broken link, a formatting repair, a missing bookkeeping field) can be applied, only with your explicit say-so; anything touching instructions or meaning is reported and never edited. And it cannot change your grade, by construction.
- **Grading a corpus is one command.** The loop we use to improve the toolkit by grading real third-party libraries used to be run by hand. It is now `npm run eval-run`, against a pinned list of targets, and it refuses loudly rather than guessing: a checkout that has drifted from its pin, an empty directory, or a tree with uncommitted changes all stop the run before anything is graded. The old failure it closes is a real one from this project's history, where a mistyped path made the grader score an empty folder and report a clean pass.
- **Reports no longer overstate a pass.** If your plugin has no diagrams, the diagram check now reads "not applicable" rather than "passed". Passing a check you never exercised is not the same as passing it, and the report now says which is which.
- **CI grew up.** Dependency updates arrive automatically, security advisories block a merge instead of waiting to be noticed, both the oldest and newest supported Node versions are actually tested rather than merely claimed, third-party build actions are pinned to exact commits, and static security analysis runs on every change.

### The security fixes worth naming

Turning on static analysis found two real high-severity defects the same day, in code written independently. Both were the same mistake: text was escaped for one dangerous character but not for the character that escapes it, so a crafted value could break out of a table cell in a generated report. Both paths carried AI-written content, so both were genuinely reachable. Both are fixed with tests that fail against the old code.

### Upgrade

No action required, and nothing that passed before newly fails.

## 1.6.1 - 2026-07-25

The trust patch. We pointed the toolkit at five real plugin repositories it had never seen, then checked every finding by hand. It found roughly fifty genuinely broken things - and it also cried wolf. This release fixes the crying wolf.

### What changed

- **Valid diagrams are no longer failed.** The diagram checker was reading two pieces of legitimate Mermaid notation as broken brackets: the async message arrows in sequence diagrams (`-)`), and the crow's-foot cardinality in entity-relationship diagrams (`||--o{`). Across the five audited repositories, **11 of the 14 diagram errors it reported were its own fault**. They are gone, and the three real ones remain. The fix is scoped per diagram type, so a genuinely unbalanced bracket - in any diagram, including those two - still fails.
- **Template files are no longer punished for being templates.** A link pointing at a placeholder your generator fills in later (`{{docs_path}}/guide.md`, `{release-url}`) is not a broken link, and is no longer reported as one.
- **The report no longer looks like it contradicts itself.** If your plugin declares Bronze, the gate may still list Silver and Gold findings for information. Those used to print as a wall of `[error]` lines directly above a line reading "0 error(s)", which read as a contradiction to every person who saw it. They now sit under a heading that says plainly they cannot affect your grade.
- **Latent standard debt is now stated, not hidden.** If you pin an older version of the Standard, the gate used to tell you "no blockers detected" while quietly holding back findings that would all fail the moment you re-pinned. One repository we graded had 122 of them. You now get a single line telling you the count and the version at which they come due.

### Upgrade

No action required, and nothing that passed before will newly fail. If you use Mermaid sequence or ER diagrams, or ship template files, expect your error count to go down.

## 1.6.0 - 2026-06-14

Manifest completeness, made actionable. The Standard grows for the first time since the v0.11 relaxation - and it does so without breaking anyone.

### What changed

- **A new check catches plugins that ship skills they never listed.** If your plugin has a skill folder on disk that is missing from your catalog (your `library.json` components, or your marketplace listing), that skill is invisible to anyone installing it. The new `U13` (`skill-registration`) check finds exactly that - a real library we graded ships 49 skills but lists only 47. It is portable (it grades any plugin, not just askit's) and it names the skills that are missing.
- **The Standard moves to v0.12, and nobody's build breaks.** `U13` is the first check to use the toolkit's warn-for-one-minor policy: it ships as a warning for this version (it surfaces the problem but never fails your gate) and only becomes a hard error one version later. You get a migration window for free.
- **Every evaluation report now explains itself.** A new per-check glossary lists what each check verifies in plain language - including the ones that passed - so you can act on a grade without having read the Standard. The foundational Bronze checks also get the dedicated reference page the higher tiers already had.
- **Reports are readable on a phone.** The report layout now adapts below 600px instead of crowding.

### Upgrade

No action required. A plugin that pins Standard v0.11 keeps grading exactly as before; the new check surfaces as a warning until you re-pin to v0.12. Re-pin when you are ready to register every skill you ship.

## 1.5.2 - 2026-06-12

The eval-run patch. Every change in this release came out of pointing the toolkit's own evaluation layer at real third-party skills and plugins, recording what each run taught us, and fixing what was verified against ground truth. Nothing changes for a plugin graded the default way: the spine stays **29 checks**, the Standard stays **v0.11**, and the toolkit still self-grades Gold.

### What changed

- **The description scorer (U5) grades descriptions, not vocabulary.** Measured on five real corpora, strong skill descriptions were piling up cosmetic warnings because the scorer only recognized its own 12-verb word list. Recalibrated against the recorded corpus: warnings drop 98 to 18, and the survivors are the intended catch (descriptions with no real trigger clause). Unfinished placeholder descriptions ("TODO: ...") now score low instead of high.
- **Grading a single skill under `--profile plain-plugin` actually works now.** The flag was accepted and then silently ignored in component scope, so a third-party skill was still held to the askit house conventions. It is now resolved exactly like plugin scope, the report records the active profile, and a file-scoped waiver in a skill-level `askit.config.json` is honored end to end (including the exit code).
- **What an evaluation costs is now measured, not estimated.** The token-usage dossier carries eleven measured advisory runs (roughly 33k-103k tokens each, driven by target size more than model tier) and the honest model-tier lesson from running three models on the same target: a budget model's "verified" is not verification.
- **Report tables scroll instead of crushing on narrow screens**, and the AI-review delegates' documentation now matches how they really run (including the documented fallback for targets that ship no eval-set - which today is all of them).

### Upgrade

Already installed? Update from the marketplace as usual. Expect fewer U5 warnings on well-written descriptions, and `--profile` to behave on single-skill targets; pass/fail verdicts do not move.

## 1.5.1 - 2026-06-10

A calibration patch from a second round of grading real third-party plugins. The gate was pointed at the official Anthropic plugin set and four community marketplaces, and a handful of cases where it flagged well-built plugins on authoring convention rather than real defects were fixed. Nothing changes for a plugin graded the default way: the spine stays **29 checks** and the Standard stays **v0.11**, and the toolkit still self-grades Gold.

### What changed

- **Grading a third-party plugin is quieter and more honest.** Four calibrations remove systematic false positives when you grade a plugin you do not own: a name used as a display label or a namespaced command is no longer double-flagged, a managed connector is a warning rather than a blocking error, and a link or a Mermaid diagram shown as an example (inside code, a template slot, or an HTML comment) is no longer treated as a live, broken reference. Real defects - a genuinely dangling link, a malformed live diagram, a name that should match its directory under the strict ladder - still fail.
- **A new token-usage dossier.** A reference page (`docs/reference/token-usage-estimates.md`) explains what an evaluation costs in tokens. The short version: the grade and the rendered report are **free** (the gate runs no model), and only the optional AI review and authoring use a model, where your choice of model and effort trades off against advice quality without ever changing the grade.
- **A verified competitive comparison.** A public page and a primary-source-verified research corpus position the toolkit against other skill and plugin builders and validators.

### Upgrade

Already installed? Update from the marketplace as usual. Nothing breaks: a plugin graded the default way scores exactly as before, and the new grading behavior applies under the opt-in `--profile plain-plugin`.

## 1.5.0 - 2026-06-09

The outward-grading release. The toolkit's gate was built to grade other people's plugins, but pointed at a real third-party plugin it buried the genuine defects under its own house scaffolding. This release fixes that, so you can grade a plugin you do not own and get a short, credible list of real issues. No requirement changes: the spine stays **29 checks** and the Standard stays **v0.11**, and a plugin graded the default way scores exactly as before.

### What is new

- **Grade a third-party plugin in one flag.** `node scripts/check.mjs <path> --profile plain-plugin` (also on `evaluate.mjs`) grades a plugin you do not own on portable defects only, without writing a config file into its tree. Pointed at Anthropic's own skills library, the result drops from 23 findings to one (a real description over the spec cap) instead of a wall of "missing the askit scaffolding" noise.
- **The grader stops dinging house conventions as defects.** Two checks that fired on well-built official plugins on taste rather than correctness - requiring a root `AGENTS.md` (U2) and an automated description score (U5) - are reclassified as askit house conventions (ADR 0029). They still apply when you grade against the full askit ladder, but no longer count against a plain third-party plugin or a published verdict.

### Upgrade

Already installed? Update from the marketplace as usual. Nothing breaks: a plugin graded the default way scores exactly as before, and the new behavior is opt-in via `--profile`.

## 1.4.1 - 2026-06-09

A hardening patch over v1.4.0. A Codex adversarial review of the new report renderer surfaced three edge cases on the advisory and migration paths; all three are fixed. Nothing changes for normal use: same commands, same output, same verdict.

### What changed

- A malformed advisory file (one missing its findings or cases) now renders a clean report instead of erroring.
- The Markdown report escapes raw HTML from every part of an advisory (model name, finding text, insights, and summary), so an untrusted advisory file cannot inject markup into a `.md`.
- An unknown `--target-tier` is rejected with a clear error instead of silently producing an empty migration plan.

### Upgrade

Already installed? Update from the marketplace as usual. This is a pure hardening patch: no behavior change for valid input.

## 1.4.0 - 2026-06-09

The designed evaluation report. Until now an evaluation lived in a terminal or a JSON blob; now `agent-skills-toolkit` renders it as a polished, self-contained HTML page, or a Markdown twin for PR review, so you can hand a non-engineer a verdict they can read and act on. No requirement changes: the spine stays **29 checks** and the Standard stays **v0.11**.

### What is new

- **A designed report in one command.** `node scripts/evaluate.mjs <path> --format=html --out report.html` produces a self-contained, on-brand page: a verdict masthead, a status matrix, a per-requirement evidence ledger, exactly what blocks the next tier, and a copy-paste prompt to fix each gap. `--format=md` gives a Markdown twin. It opens offline, has a print / Save-PDF button, and hides nothing behind tabs.
- **Five report types, one renderer.** Beyond the conformance report, `--report=migration` renders a staged Bronze-to-Gold plan, `--report=release` a deterministic go / no-go readiness check, and `--report=review` / `--report=behavioral` render advisory (model-judged) layers beside the verdict. They all render from the one deterministic object, so the Markdown, HTML, JSON, and terminal never disagree.
- **The verdict stays the gate's.** The HTML and Markdown are presentation only: they add no judgment, and the advisory layers are clearly labeled and stamped with their model, never moving the grade. See `docs/reference/evaluation-reports.md`.

### Upgrade

Already installed? Update from the marketplace as usual. Nothing breaks: the terminal and `--json` output are unchanged, and the report formats are new opt-in flags.

## 1.3.0 - 2026-06-06

The gate-evolution release. The deterministic gate gets two upgrades that make it legitimate to point at other people's plugins: it now honors the Standard version a plugin pins, and it is configurable like a real linter. No new requirement is added, so the spine stays **29 checks** and the Standard stays **v0.11**, and a plugin with no config grades exactly as before.

### What is new

- **The gate honors your pinned Standard (ADR 0027).** Every check records the Standard version it was introduced at, and the gate reads `library.json.standard`. A plugin pinned to an older Standard is graded against the ruleset it actually adopted: a requirement added after your pinned version shows up as a `warn`, never a build-failing error, until you raise your pin. The Standard can now evolve without silently breaking downstream plugins.
- **Configure how the gate grades, without forking it.** An optional `askit.config.json` lets you turn a rule down or off, grade against a lighter `plain-plugin` profile (the portable, vendor-grounded checks only, instead of the full askit library ladder), or durably waive a known finding with a recorded reason. Every check is tagged by provenance, so the report separates "real issues" (objective defects and vendor-backed rules) from "profile conformance" (askit conventions you may not have opted into). See `docs/reference/gate-config.md`.
- **Tamper-proof published verdicts.** When the toolkit grades and publishes a verdict about someone else's plugin (`--mode published-verdict`), a subject cannot disable an objective check to dodge it: such a finding is surfaced as a warning with a notice, never silently dropped.

### Upgrade

Already installed? Update from the marketplace as usual. Nothing breaks: with no `askit.config.json` and a current pin, your gate result is identical to 1.2.0. The new behavior is opt-in (a config file) or only matters for older pins.

## 1.2.0 - 2026-06-06

A scope correction. The `U10` no-em-dash / no-en-dash check is retired from the conformance spine: it was a stylistic house preference with no portability or vendor basis (agentskills.io, Claude Code, and Codex impose no such rule), so grading other people's plugins against it was outside what a skill and plugin standard should decide. The spine is now **29 checks** (`U1-U9`, `U11-U12`, `S1-S8`, `G1-G10`) and the Standard moves to **v0.11**.

### What changed

- **`U10` (no-dashes) is gone from the gate.** Your plugin is no longer flagged for em-dashes or en-dashes. If you want a dash-free house style for yourself, the toolkit still ships an opt-in `PreToolUse` hook in `hooks/` you can adopt; it is no longer imposed on anything the gate grades.
- **Standard v0.11, a 29-check spine.** This is a relaxation: every plugin that passed before still passes, and nothing newly fails.
- **A refined report sample.** A Command Dashboard v2 evaluation-report template with cleaner typography and wrapping.

### Upgrade

Already installed? Update from the marketplace as usual; nothing breaks, and re-running the gate can only remove findings (the retired `U10`), never add them.

## 1.1.0 - 2026-06-03

The documentation-depth release. `agent-skills-toolkit` now grades a plugin's documentation as rigorously as its code, and the toolkit proves it on itself: a dual-audience Diataxis docs set, a generated docs site, folder-by-folder and file-by-file self-documentation, and **Standard v0.10**.

### What is new

- **Five new checks, a 30-check spine.** The deterministic gate grows from 25 to **30 checks** (`U1-U12` + `S1-S8` + `G1-G10`): `mermaid-valid` (Bronze - every diagram is structurally valid), and at Gold `docs-frontmatter`, `folder-readme` (every folder's README inventory matches its contents), `source-doc` (every source file carries a four-field header docblock), and `docs-presence` (the Diataxis quadrants are non-empty, every decision record has a TL;DR, and the architecture overview links its detail).
- **A real documentation site.** The Astro Starlight site is now a generated view of the repository's public docs, with a curated landing on top - so the docs you read on GitHub and the docs you browse on the web never drift apart.
- **The full Diataxis set.** Tutorials, how-to guides, reference, and explanation, each with a typed audience and level, plus a quickstart, glossary, FAQ, and troubleshooting.
- **A demonstrative hook.** The toolkit ships a portable `PreToolUse` no-dash guard, so the Gold "hooks are documented" check grades a real hook instead of passing on an empty surface.
- **Standard v0.10.** The Standard adds the five new requirements and pins the docs frontmatter taxonomy.

### Upgrade

Already installed? Update from the marketplace as usual; nothing in your plugin breaks. If you run the gate, note the spine is now 30 checks and a Gold plugin is expected to carry the documentation surface above (each new Gold check is conditional - it only binds once you have the thing it grades).

## 1.0.0 - 2026-06-02

The first Gold-tagged release, and the one that makes the toolkit **installable**. `agent-skills-toolkit` is now a plugin you can add from the `product-on-purpose` marketplace, and it self-validates at the Gold (Advanced) tier - it passes its own Bronze, Silver, and Gold checks (G1-G7) in CI, a self-proving example of the Standard it defines.

### Install

```bash
# Add the marketplace once (by repo path)
/plugin marketplace add product-on-purpose/agent-plugins

# Install the toolkit (by marketplace identity)
/plugin install agent-skills-toolkit@product-on-purpose
```

### What you can do

- **Start a plugin** from a single skill (`askit-build-skill`) or from scratch (`askit-init-plugin`), stand up a marketplace (`askit-init-marketplace`), or bring an existing skills repo to the Standard with a staged plan (`askit-migrate`).
- **Grow it** with every component type - subagents, slash commands, MCP servers, hooks, workflows, chain contracts, output styles, status lines, settings - through the `askit-build-*` authoring family, emitted in the right format for each agent.
- **Govern it** over its lifetime with `askit-backlog`, `askit-decision`, `askit-release`, `askit-deprecate`, and `askit-template-manager`.
- **Grade any plugin** against the Advanced Skill Library Standard and see the exact tier it earns with a burndown to the next: `node scripts/check.mjs`, or the `askit-evaluate` skill for a richer report.
- **Level up** by climbing Bronze to Silver to Gold; the tier report names exactly what blocks the next rung.

### Highlights

- The full v1 builder catalog: 23 skills plus 7 Claude-only delegate subagents and 2 commands.
- A 26-check deterministic validation spine (Bronze `U1-U11`, Silver `S1-S8`, Gold `G1-G7`) that runs in CI with no model in the loop, so the grade is trustworthy. Judgment-based evaluation sits beside the gate as opt-in evidence, never inside it.
- Genuinely cross-agent (Claude Code and Codex) from one canonical `library.json`, with the native per-agent manifests generated from it so the two never drift.
- A live documentation site with brand-colored diagrams and a CI link-integrity guard, so no browser-broken link or silently dropped page ever ships.
- Adopts the v0.9 Standard (runner Node baseline `>=22.12.0`) in `library.json`, and ships standardized release CI: a tag push mints this release behind a version-consistency guard.

This release repositions the README around the plugin lifecycle - start, grow, govern, and level up an advanced cross-agent plugin - and makes the tier model scannable. It carries forward everything since `v0.2.0`: the full catalog, the Gold self-conformance gate, and full Astro site conformance.
