==========
 Theorems
==========

Locus implements exactly one module's worth of geometry: proving two
triangles congruent (or catching you trying to). This page lists every
postulate, theorem, and named trap the engine knows about, in
``packages/engine/src/postulates.ts`` and ``diagnostics.ts``.

.. contents::
   :local:
   :depth: 1

The five ways to prove congruence
====================================

Given a claimed correspondence — writing ``△ABC ≅ △XYZ`` asserts vertex A
corresponds to X, B to Y, C to Z, by position, not by alphabetical
optimism — the engine walks the fact graph looking for exactly which sides
and angles have been proven congruent between the two triangles, then
checks the result against these five shapes:

.. list-table::
   :header-rows: 1
   :widths: 12 30 40

   * - Postulate
     - Matched parts
     - Requirement
   * - **SSS**
     - All 3 sides
     - No angle needed. The oldest trick in the book.
   * - **SAS**
     - 2 sides + 1 angle
     - The angle must be *included* — the one actually formed by the two
       matched sides, not just any angle you happened to prove.
   * - **ASA**
     - 2 angles + 1 side
     - The side must be *included* between the two matched angles.
   * - **AAS**
     - 2 angles + 1 side
     - The side is *not* included — it's opposite one of the two matched
       angles instead. Mathematically fine; commonly confused with ASA by
       people who haven't drawn a picture.
   * - **HL** (Hypotenuse-Leg)
     - Hypotenuse + 1 leg
     - Right triangles only. The right angle isn't asserted directly — it's
       inferred from a ``perpendicular`` fact between the two legs at that
       vertex, in both triangles. If you haven't told Locus the triangle is
       right, HL will not appear from nowhere to save you.

"Included" is not a vibe — it's computed. A triangle has three sides and
three vertices; a side and an angle are adjacent exactly when the angle's
vertex is *not* the one the side is opposite. Three points, three
possibilities, no ambiguity. See ``isIncludedAngleForSides`` /
``isIncludedSideForAngles`` in ``geometry.ts`` if you enjoy reading the
part of the code that would otherwise be a diagram.

The two that don't work (on purpose)
=======================================

SSA — "the donkey theorem"
----------------------------

Two sides and a *non-included* angle. It looks like it should be enough —
you've got two lengths and an angle, what more do you want — and it isn't,
because the triangle can swing on that non-included angle into a second,
genuinely different, equally valid configuration. Locus flags this as
**ambiguous**, not wrong: the data doesn't determine a unique triangle, so
neither does the proof.

The nickname is not Locus's invention, but the tool leans into it anyway —
see the ``ssa`` diagnostic in `diagnostics.rst`_ for the exact warning text,
and drag a vertex in the figure pane to watch the ambiguity happen instead
of taking the tool's word for it.

AAA — proves similarity, not congruence
------------------------------------------

Three matched angles. The triangles are the same *shape*. They are not
necessarily the same *size*, and congruence cares about size. Locus flags
this as ``aaa-similarity-only`` and offers exactly two ways out, neither of
which it will pick for you:

1. Downgrade the conclusion to ``△ABC ~ △XYZ`` (similarity — which is what
   you actually proved).
2. Keep the congruence claim, but go prove one side length matches too —
   which, once you have it, is just AAS wearing a trench coat. Locus will
   notice this and tell you the third angle was redundant. See
   `diagnostics.rst`_ for that exact conversation.

Supporting theorems (used, not asserted)
===========================================

**Reflexive Property of Congruence.** A side or angle shared by both
triangles (``BC ≅ BC``, literally the same segment on both sides of the
statement) is real justification, but it has to be *named* as the
reflexive property, not written as if it were a coincidence someone
measured. Locus checks the justification kind, not just the numbers — see
the ``undeclared-shared-part`` diagnostic.

**Triangle Angle-Sum Theorem** (implicit). Never asserted directly, but it
is the reason the redundant-hypothesis check works at all: once two angles
of a triangle are fixed, the third one is not new information, it's
arithmetic. Prove all three anyway and Locus will point out which one you
didn't need.

Construction, not a postulate
================================

**Perpendicular bisector.** Writing ``perpendicular bisector of AB is line
L`` expands into two atomic facts — ``perpendicular(L, AB)`` and
``midpoint(M, AB)`` for a synthesized point ``M`` — rather than being
modeled as its own opaque relation. This is a deliberate design choice: it
means anything that follows from "perpendicular" and "midpoint" being true
falls out as an ordinary graph query, with no special-casing required.

Full disclosure, for anyone tempted to assume more than is there: the
classic *consequence* of this construction — "every point on a
perpendicular bisector is equidistant from the segment's endpoints" — is
not separately derived in v1. There is no "point lies on a line" relation
in the DSL yet, so the engine has nowhere to hang that theorem. It is
architecturally *possible* per the macro-expansion design; it is simply not
built. This document would rather admit that than let you find out the
hard way.

Proof-integrity checks that aren't theorems
===============================================

Two more checks round out the diagnostic set. Neither is a geometry
theorem — they're checks that the *proof itself* is honest:

- **Correspondence order.** ``△ABC ≅ △XYZ`` is a claim about which vertex
  maps to which. If the parts you actually proved imply a different
  pairing, that's a type error, not a postulate failure, and Locus treats
  it as one.
- **Circular reasoning.** A fact whose justification depends — directly or
  through a chain of other facts — on itself. Standard graph cycle
  detection, applied to the one place a proof is genuinely not allowed to
  go in circles.

See `diagnostics.rst`_ for exactly what each of these says
to you, and what it will (and pointedly will not) offer to fix on your
behalf.

.. _diagnostics.rst: diagnostics.rst
