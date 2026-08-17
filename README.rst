=====
Locus
=====

A proof assistant for congruent triangles that is contractually obligated to
never tell you the answer.

Locus is a small, opinionated geometry tool: you write a proof in a lenient
plain-English-ish DSL, and it tells you what's wrong with it, what's still
missing, and — only when you ask — what you could combine next. It will not
propose your next line for you. It will not congratulate you for existing.
It will, however, cheerfully explain exactly why SSA doesn't guarantee
congruence, which is more than can be said for most geometry textbooks.

If you are looking for an AI tutor that solves the proof for you: this is
not that, on purpose. See ``PHILOSOPHY.md`` for the manifesto, which is
"binding" in the sense that changing it requires actually thinking about it
first, not just shipping a feature that quietly disagrees with it.

Currently supported: congruent triangles. That's it. That's the whole
curriculum. See ``FEATURES.md`` for why that's a feature and not a
limitation, and ``docs/theorems.rst`` for exactly which five postulates get
you there (and the two famous ones that don't).

What's actually in here
========================

- **A fact-graph engine** (``packages/engine``) that parses proof statements,
  classifies them against SSS/SAS/ASA/AAS/HL, and catches the mistakes that
  make geometry teachers sigh: SSA, wrong correspondence order, undeclared
  reflexive properties, circular reasoning, and AAA masquerading as a
  congruence proof. Zero DOM dependencies, 55 tests, runs anywhere Node
  runs.
- **A web app** (``packages/web``) built on a Monaco editor (yes, the one
  from VS Code) pointed at geometry instead of TypeScript, plus a
  hand-rolled SVG figure pane where every point is draggable and the
  triangle redraws itself in real time, because a proof that only works for
  one specific drawing was never actually proven.

See ``docs/architecture.rst`` if you want the tour with the boring parts
included.

Live demo
==========

Every push to ``main`` builds and deploys automatically via
``.github/workflows/deploy.yml`` — no server-side component, so "deploy" is
just "publish the static files somewhere." Once GitHub Pages is switched on
for this repository (Settings → Pages → Source → **GitHub Actions**, a
one-time click nobody has automated yet), it lives at:

   https://earth1283.github.io/Locus/

Note the capital L — GitHub Pages URLs are case-sensitive in the repository
segment, so ``/locus/`` (lowercase) will 404 until and unless this repo is
renamed to match. Everything downstream of that is already handled: the
build's base path, the PWA manifest's ``start_url``/``scope``, and the
service worker's precache list all resolve correctly under a subpath, and
requesting the URL without a trailing slash redirects to the one with it,
same as any static host.

Quick start
===========

.. code-block:: bash

   npm install
   npm run dev            # starts the web app (packages/web)
   npm run test            # runs the engine test suite
   npm run typecheck       # both packages, no excuses

The dev server prints a local URL. Open it, type ``△ABC ≅ △XYZ`` into the
goal box, and start asserting things about sides and angles. The figure
pane will judge your triangle silently until you give it a reason not to.

Project layout
===============

.. code-block:: text

   packages/
     engine/     pure TypeScript: fact graph, DSL parser, postulate
                 classification, diagnostics, quick-fixes, chaining
     web/        React + Vite + Monaco + SVG, talks to the engine and
                 nothing else — no analytics, no accounts, no telemetry
   docs/         the documents you are currently one click away from
   FEATURES.md   the v1 build spec
   PHILOSOPHY.md the document that overrules FEATURES.md when they disagree

Documentation
==============

- `docs/theorems.rst <docs/theorems.rst>`_ — every postulate the engine
  knows, and the two it knows *not* to trust
- `docs/dsl.rst <docs/dsl.rst>`_ — how to phrase a proof statement without
  Locus staring blankly back at you
- `docs/diagnostics.rst <docs/diagnostics.rst>`_ — the six ways your proof
  can be wrong, and what Locus offers to do about each one (never the whole
  fix, always your choice)
- `docs/architecture.rst <docs/architecture.rst>`_ — the module boundaries,
  and why the engine has never once imported ``react``

Design constraints, briefly
=============================

- No accounts, no login, no server. Proof state lives in your browser and
  nowhere else. If you close the tab, it's gone, same as a piece of paper.
- No streaks, no confetti, no mascot. A finished proof is its own reward;
  the UI's job is to settle down, not throw a parade.
- Every quick-fix menu shows *every* valid option, never one pre-selected
  "correct" answer with the others grayed out, because there usually isn't
  one correct order to write a proof in, and pretending otherwise is a
  disservice.

License
========

AGPLv3, from the first commit. Fork it, sell it, rename it — just ship your
changes back if you run it as a service. See ``LICENSE`` for the parts
lawyers care about and ``PHILOSOPHY.md`` section 9 for the parts that
explain why.
