# BOOTSTRAP - the self-hosting exemption

> Status: active through Phase 1. This document exists so that the claim "the
> toolkit always passes its own checks" is true for **every phase that has
> checks**, and the one gap is named honestly rather than hidden.

## The paradox

`agent-skills-toolkit`'s central credibility proof is that it validates itself
against its own Standard ([`../../STANDARD.md`](../../STANDARD.md)) in CI. But the
validators are themselves components of the toolkit being built. At t=0 there is
nothing to validate the toolkit with, because the thing that validates is the
thing being built. You cannot dogfood a tool that does not exist yet.

## The resolution (and its bounds)

1. **Freeze the Standard first.** A validator built against a moving Standard is
   perpetual rework. Done: the Standard is decision-complete (v0.7) with the Gold
   criteria frozen as G1-G7.
2. **Hand-author a minimal seed (Phase 0).** The smallest plugin skeleton the
   Standard defines as a Universal (Bronze) plugin, authored and reviewed by a
   human against a written Bronze checklist, without tooling. **This is the
   one-time exemption.**
3. **Build the validation spine next (Phase 1)** as plain Node scripts with their
   own unit tests, depending on no toolkit skill. The moment they exist, they are
   pointed at the seed: the toolkit's first act of self-validation.
4. **From Phase 1 onward, every new component is born validated** - authored, then
   immediately checked by the spine. Conformance is continuous, not retrofitted.

## The exemption, stated precisely

- **What is exempt:** the Phase 0 seed (this repository's initial committed state)
  and the Phase 1 validators-under-construction.
- **Why:** no validator exists yet to check them; the validator is the deliverable.
- **How the gap is controlled:** the seed is walked against a written Bronze
  checklist by eye before commit (Phase 0 exit gate), and then **re-verified
  automatically the instant Phase 1's checks exist** - the seed becomes Phase 1's
  first golden test fixture. The manual review is a bridge, not a substitute.
- **When the exemption ends:** at Phase 1 exit. From that point the toolkit
  declares `tier: universal` in [`../../library.json`](../../library.json) and
  passes all Universal checks against itself; `tier-report` prints the declared
  tier with an empty `blocked` list at every subsequent phase exit.

## The precise answer to "did you dogfood from the start?"

> From **Phase 1**. Phase 0 is a hand-authored seed, reviewed against a written
> Bronze checklist by a human, by necessity - the validators do not exist until
> Phase 1, and at that moment the seed becomes their first fixture. There is
> exactly one exempt window (Phases 0-1), it is bounded, and it is documented
> here. Every phase that has checks passes them.

## Related risk

R1 (bootstrap seed silently non-conformant) is the reason this exemption is
written down and the reason the seed is re-verified automatically as soon as the
checks exist. A sloppy bootstrap would collapse the whole self-hosting pitch; a
clean one means the repository itself is the proof.
