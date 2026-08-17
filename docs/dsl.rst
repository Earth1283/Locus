========
The DSL
========

Locus's proof language is deliberately not a programming language. It is a
lenient, order-independent, trigger-word-and-slot-filling parser: find a
keyword, grab the nearby capitalized tokens that fit the expected shape,
done. There is no grammar to memorize, which also means there is no
grammar to lean on when you're guessing — read this page once and you'll
have seen all of it.

.. contents::
   :local:
   :depth: 1

The core idea
================

A statement is one line. The parser looks for a trigger word (``midpoint``,
``congruent``, and so on), then fills its slots from whatever capitalized
tokens are nearby, classified purely by shape:

- One capital letter (``D``) is a **point**.
- Two capital letters (``BC``) are a **segment**.
- Three capital letters (``ABC``) are a **triangle** or an **angle**,
  disambiguated by an explicit ``triangle``/``△`` or ``angle``/``∠``
  keyword — Locus will not guess on a genuinely ambiguous triple, it will
  ask.

Word order does not matter. These three lines produce the identical fact:

.. code-block:: text

   midpoint of BC is D
   D is the midpoint of BC
   midpoint BC D

Filler words (``of``, ``is``, ``the``, ``a``, ``an``, ``to``, ``with``,
``and``) are stripped before matching, which is what makes the leniency
possible — and also why a statement with genuinely no recognizable trigger
word just gets a plain "no recognized relation keyword" error instead of a
guess. Locus would rather say "I don't understand" than "I understood
something, probably."

The vocabulary
=================

.. list-table::
   :header-rows: 1
   :widths: 20 30 50

   * - Trigger
     - Example
     - Produces
   * - ``midpoint``
     - ``midpoint of BC is D``
     - ``midpoint(D, BC)``
   * - ``perpendicular`` / ``⊥``
     - ``AB perpendicular to CD``
     - ``perpendicular(AB, CD)`` — either side may be a segment or an
       auxiliary line (``line L``)
   * - ``parallel`` / ``∥``
     - ``AB parallel to CD``
     - ``parallel(AB, CD)``
   * - ``congruent`` / ``≅``
     - ``AB is congruent to CD``
     - ``congruentSegments(AB, CD)`` — or ``congruentAngles`` /
       ``congruentTriangles`` depending on operand shape (see below)
   * - ``similar`` / ``~``
     - ``△ABC ~ △XYZ``
     - ``similarTriangles(ABC, XYZ)``
   * - ``on``
     - ``D is on segment BC``
     - ``onSegment(D, BC)``
   * - ``connect``
     - ``connect AB``
     - ``segmentExists(AB)`` — the auxiliary-construction statement; see
       "Segments that don't exist yet" below
   * - ``perpendicular bisector``
     - ``perpendicular bisector of AB is line L``
     - Macro — expands to ``perpendicular(L, AB)`` + ``midpoint(M, AB)``
       for a freshly named point ``M``

Congruent segments, angles, or triangles?
============================================

``congruent``/``≅`` is one trigger word covering three different relations,
disambiguated by the *shape* of what's on either side:

- Two segment-shaped tokens (``AB``, ``CD``) → ``congruentSegments``.
- Two triple-letter tokens with an explicit ``angle``/``∠`` keyword nearby
  (``angle ABC``) → ``congruentAngles``. The middle letter is the vertex:
  ``angle ABC`` means the angle *at* B, formed by rays BA and BC.
- Two triple-letter tokens with an explicit ``triangle``/``△`` keyword
  (``triangle ABC``, ``△ABC``) → ``congruentTriangles``, with the vertex
  order encoding the claimed correspondence (A↔X, B↔Y, C↔Z by position, not
  by resemblance).

Write a bare triple with neither keyword — ``ABC ≅ XYZ`` — and Locus
refuses to guess whether you meant a triangle or an angle. You'll get an
*ambiguous* result with both phrasings offered back to you, because a 50/50
guess dressed up as an answer is worse than an honest "which did you mean."

Segments that don't exist yet
================================

Referencing a segment in a claim (``DE is congruent to FG``) does not
*construct* DE — it only asserts something about it. If DE has never been
built (no ``midpoint``, ``onSegment``, or ``connect`` fact establishes it,
and it isn't one of the goal triangles' own sides), the figure pane draws
it as a dotted amber "ghost" and right-clicking it in the figure pane
offers:

- **Remove references for DE** — deletes every line that mentions it.
- **Create auxiliary for DE (connect DE)** — writes a ``connect DE`` line,
  after a confirmation step, because constructing a new segment might cross
  an existing one and Locus isn't going to silently decide that's fine.

You can also just type ``connect DE`` yourself and skip the menu entirely.

What the parser will not do for you
========================================

- It will not infer a missing operand. ``midpoint of BC and DE is F``
  has two segments where the ``midpoint`` relation wants exactly one —
  that's an arity error, not a "pick the first one" guess.
- It will not silently pick a relation type on a genuine ambiguity (see
  above). It offers a confirm-chip with the specific alternatives instead.
- It will not finalize a conclusion you haven't earned. Tab-complete only
  proposes ``△ABC ≅ △XYZ by SAS`` once all three SAS parts are already
  matched in the graph — see `diagnostics.rst <diagnostics.rst>`_ and
  ``PHILOSOPHY.md`` section 1 for why that line is drawn exactly there.

Completions
=============

Two flavors, both wired into Monaco:

- **Structural.** Type a prefix of a trigger word (``mid``) and get the
  full statement template back (``midpoint of ___ is ___``). Ordinary
  keyword completion, nothing clever.
- **Context-aware.** Once a slot is open, Locus infers the expected shape
  from the trigger word already on the line and offers only objects of
  that shape that already exist in the fact graph — segments after
  ``midpoint of``, angles after ``congruent`` + ``angle``, and so on. It
  will not suggest an object you haven't named, because inventing names is
  not what autocomplete is for.
