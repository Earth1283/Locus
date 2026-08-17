==============
 Architecture
==============

Two packages, one direction of dependency. The engine has never imported
``react``, and if a PR ever changes that, this document is the hill to die
on.

.. contents::
   :local:
   :depth: 1

The split
===========

.. code-block:: text

   packages/engine   pure TypeScript, zero DOM, zero UI framework
   packages/web       React + Vite + Monaco + hand-rolled SVG, imports
                       the engine, contributes nothing back

``@locus/engine`` is a deep module in the Ousterhout sense: a small
interface — parse a line, apply it to a graph, ask for diagnostics, ask
for quick-fixes — hiding a fair amount of postulate logic, cycle detection,
and slot-filling parsing behind it. Every one of those functions is a pure
function over a ``FactGraph``: given the same graph, they return the same
answer, and none of them reach for ``document`` to do it. That's not a
style preference, it's what makes 55 tests possible without a browser.

The fact graph
=================

``FactGraph`` (``packages/engine/src/graph.ts``) is the one mutable,
stateful class in the engine. Everything else — diagnostics, completions,
quick-fixes, chaining — is a pure function that reads through its public
interface and returns a result. Points, lines, and circles are graph
nodes with real identity; segments, angles, and triangles are *not* —
they're plain values derived from point labels (``segment(p1, p2)``,
canonical regardless of which order you wrote the endpoints), because a
proof never needs to declare "segment AB exists" before reasoning about
it. This one modeling choice is why the DSL can stay lenient: there is
nothing to pre-register.

Facts carry a justification (``given``, ``reflexive``, ``derived``, or
``postulate``) with a ``dependsOn`` list of other fact IDs — which is both
how the reflexive-property check knows the difference between "asserted"
and "justified," and how circular-reasoning detection has an actual graph
to run cycle detection on.

The DSL, twice
=================

Parsing happens in two stages, on purpose:

1. ``dsl/parse.ts`` turns a line of text into a ``ParsedStatement`` — pure
   syntax, no graph involved, fully testable with plain strings in, typed
   objects out.
2. ``statements.ts`` binds a ``ParsedStatement`` into a specific
   ``FactGraph``: auto-creating referenced points, expanding macros
   (perpendicular bisector → two atomic facts), and asserting the
   resulting relation.

Keeping these separate means the parser has no graph to consult and the
binder has no text to parse. Neither one is tempted to reach past its own
job.

Postulates and diagnostics
=============================

``postulates.ts`` classifies a triangle pair by walking the six possible
corresponding side/angle pairs, checking which are already proven
congruent, and running the result through ``isIncludedAngleForSides`` /
``isIncludedSideForAngles`` — geometric adjacency, computed from vertex
indices, not eyeballed. ``diagnostics.ts`` is a thin layer on top: each of
the six checks (see `diagnostics.rst <diagnostics.rst>`_) is its own small function, combined
by one ``runDiagnostics(graph)`` that the web layer calls on every
keystroke.

Quick-fixes (``quickfixes.ts``) are graph→graph functions. Every one of
them takes a ``FactGraph`` and an optional target, and returns a *new*
graph rather than mutating in place — which is what lets the web layer
diff old-graph-vs-new-graph to figure out which editor lines changed,
instead of the engine needing to know editor lines exist at all.

The web layer's one clever trick
====================================

Monaco's diagnostics and code-action APIs want markers and edits, not
graphs. The bridge is ``packages/web/src/engine-bridge/serialize.ts``:
when a quick-fix's ``apply()`` returns a new graph, ``diffQuickFixToLineEdits``
compares it against the old graph fact-by-fact and turns the difference
into one of three things — delete a line, rewrite a line, or append a new
one — using a ``factId → source line`` map built while the graph was
constructed from text in the first place. This is the entire reason a
quick-fix can stay a pure engine function: the web layer, and only the web
layer, knows that "lines" exist.

Monaco itself is wired up in ``monaco/language.ts`` as a genuine custom
language (``locus``) — a Monarch tokenizer for syntax highlighting, a
completion provider, a code-action provider, and a registered command that
routes back into React state through a small mutable bridge object
(``monaco/bridge.ts``), because Monaco's providers are registered once,
globally, outside React's render cycle, and have no other way to reach
current component state.

The figure pane
==================

A hand-rolled SVG renderer, not a charting library, because the figure
*is* the derived fact graph — rendering it with a general-purpose diagram
tool would mean maintaining a second, parallel model of the same
geometry. Points are either draggable (independent) or computed
(``midpoint`` targets, recomputed every render from their two defining
points via simple fixed-point iteration in
``figure/resolvePositions.ts`` — handles chained midpoints for free).
Congruent parts get tick marks and angle arcs via union-find over the
congruence facts (``figure/tickMarks.ts``); segments get one of three
honest visual states — given, constructed, or referenced-but-not-yet-built
— rather than one binary "exists" flag, because those really are three
different situations and pretending otherwise would just move the
confusion from the UI into your head.

One thing worth knowing if you're about to add to this file: SVG has no
z-index. Interactive hit-targets are collected and painted in their own
topmost group, deliberately, after everything decorative. This was not
originally true, and the bug it caused — an angle-arc mark silently
swallowing clicks meant for the segment underneath it — is exactly why it
is true now.

What this is not
====================

No coordinate constraint solver. Dragging a point moves it freely; it does
not re-solve the figure to keep every asserted length and angle exactly
consistent. This is enough to demonstrate genericity (drag a point, watch
what stays true and what was a coincidence of the drawing) but it will not
spontaneously flip an SSA figure into its "other" valid triangle the way a
real solver would — that configuration exists on paper, not yet in the
renderer.

No test suite for the web package. The engine is TDD'd end to end; the web
layer has been verified by hand and by headless-browser smoke testing
during development, not by an automated suite that runs in CI. If you're
about to make this untrue, the maintainers will not object.
