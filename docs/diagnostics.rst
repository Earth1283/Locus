=============
 Diagnostics
=============

Six checks, always running, ambient — Locus does not wait to be asked
whether your proof has a hole in it (backward-chaining and diagnostics are
"pure bookkeeping" in ``PHILOSOPHY.md``'s taxonomy, so they run
automatically; forward-chaining does not, and you'll notice the
difference). Every one of these has a specific, checkable failure
condition, and every one of them tells you *why*, never just *that*.

.. contents::
   :local:
   :depth: 1

The six
=========

``ssa`` — the donkey theorem
-------------------------------

::

   Two sides and a non-included angle (SSA) don't guarantee congruence —
   a second, non-congruent triangle can satisfy the same measurements.

Fires when a claimed ``congruentTriangles`` fact classifies as SSA-shaped.
No quick-fix menu accompanies this one — the correct response is to prove
more, not to have Locus prove it for you. Drag a vertex in the figure pane
to see the ambiguity happen rather than take the warning on faith.

``aaa-similarity-only``
--------------------------

::

   AAA proves similarity, not congruence.

Fires when three matched angles are the only support for a claimed
congruence. Offers exactly two quick-fixes, and shows both, because there
is no single correct one:

1. **Switch conclusion to "△ABC ~ △XYZ" (similarity)** — an action. Rewrites
   the claim to what you actually proved.
2. **Keep congruence — but you'll need to additionally prove scale factor
   = 1** — guidance, not an action. Locus names the gap; it does not fill
   it. There is no button that adds a side-length proof for you, because
   that would be doing the proof.

``redundant-hypothesis``
----------------------------

::

   Proof valid. You proved 3 angles + 1 side. That's AAS — the third
   angle wasn't needed. Simplify?

This is the payoff of taking option 2 above: add one side to an AAA claim
and the proof becomes valid AAS by another route, with one angle now doing
no work. This is a real, checkable consequence of the Triangle Angle-Sum
Theorem — the third angle was always determined by the other two — not a
style opinion, and Locus says so plainly rather than dressing it up as a
suggestion. One quick-fix: remove the specific redundant angle match.

``wrong-correspondence``
----------------------------

::

   △ABC ≅ △XYZ doesn't match the proven parts — they imply
   △ABC ≅ △ACB instead.

The vertex order in a congruence claim *is* the correspondence. If the
parts you've actually proven imply a different pairing than the one
written, that's a type error dressed as a typo, and Locus finds the
correspondence that *does* fit (checking all five remaining vertex
orderings) and offers **Reorder to △ABC ≅ △[correct order]** as a single
quick-fix — assuming a correct reordering exists. If none of the six
orderings work, you'll just see the ambiguous/insufficient state instead;
Locus doesn't invent a fix that isn't there.

``undeclared-shared-part``
-------------------------------

::

   BC is shared by both triangles — state it as the reflexive property.

Fires when a segment or angle is asserted congruent to *itself*
(literally: ``BC ≅ BC``) without the justification being marked as the
reflexive property. The numbers were never in question — the paperwork
was missing. One quick-fix: **Insert reflexive-property justification**,
which upgrades the justification in place without touching the proof
text, because there was nothing wrong with the text.

``circular-reasoning``
--------------------------

::

   Circular reasoning: f1 → f2 → f1 depends on itself.

Standard cycle detection over the justification-dependency graph. No
quick-fix — there is no mechanical way to "fix" a proof that assumes its
own conclusion; that's a rewrite, and rewrites are yours to do.

Segments that don't exist
============================

Not one of the six ambient diagnostics — this one is triggered on demand,
by right-clicking a segment in the figure pane, matching
``PHILOSOPHY.md``'s rule that quick-fixes are inherently click-triggered
rather than ambient. If the segment has never actually been *constructed*
(no ``midpoint``, ``onSegment``, or ``connect`` fact — a bare claim like
``DE is congruent to FG`` does not count, on purpose), you get:

- **Remove references for DE** — deletes every line mentioning it.
- **Create auxiliary for DE (connect DE)** — requires a second click to
  confirm, because constructing a new segment might cross an existing line
  and that is exactly the kind of decision Locus refuses to make quietly.

See `dsl.rst <dsl.rst>`_ for the full mechanics.

What every quick-fix has in common
=====================================

Every quick-fix in Locus is one of exactly two kinds, and the UI never
blurs the line between them:

- **Action** — a real graph mutation, one click (two, if it needs
  confirmation) away from applied. Locus computes it; you approve it.
- **Guidance** — text. Locus names the gap and stops. There is no hidden
  third option where guidance quietly becomes an action if you click it
  enough times.

And whenever more than one legitimate option exists, all of them are
shown, never one pre-selected "correct" answer with the rest grayed out.
See ``PHILOSOPHY.md`` section 2 if you'd like the manifesto version of
this paragraph.
