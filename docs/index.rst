====================
Locus documentation
====================

You have found the documentation. Congratulations — this is the part of
the project most people skip, which is exactly why the interesting caveats
live here instead of in the README.

.. contents:: On this page
   :local:
   :depth: 1

What to read, in order of how confused you are
=================================================

- **Just want to write a proof?** Start with `dsl.rst`_.
- **Proof isn't working and Locus is complaining?** `diagnostics.rst`_ has
  every warning the engine can raise, in plain language, plus what the
  quick-fix menu will and won't do for you.
- **Want to know which postulates are actually implemented, and which two
  famous ones are implemented specifically to be rejected?** `theorems.rst`_.
- **Want to know why the code is shaped the way it is, or where to add the
  next module without upsetting the architecture?** `architecture.rst`_.

Contents
==========

- `theorems.rst`_
- `dsl.rst`_
- `diagnostics.rst`_
- `architecture.rst`_

.. _theorems.rst: theorems.rst
.. _dsl.rst: dsl.rst
.. _diagnostics.rst: diagnostics.rst
.. _architecture.rst: architecture.rst

A word on scope
=================

Locus proves congruent triangles. It does not prove similar triangles
beyond detecting when you've accidentally proven similarity instead of
congruence (AAA, we see you). It does not do circles, or perpendicular
bisector *consequences* beyond the construction itself, or trigonometry, or
your taxes. See ``FEATURES.md`` at the repository root for the full v1
scope, and ``PHILOSOPHY.md`` for why the scope stays small on purpose
rather than by budget constraint.
