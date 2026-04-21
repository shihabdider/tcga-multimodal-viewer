# Iteration

anchor: b9df0ad2dcf4ca6bb17548db460f5187cf5fec96
started: 2026-04-21T14:11:20Z
stubber-mode: data-definition-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Problem

Proceed to Phase 1 Iteration 3 by adding a slide list UI and a working remote viewer handoff from the checked-in SlideReference so the local static case page can open the real public TCGA-E9-A5FL slide in the public viewer.

## Data Definition Plan

Keep CaseManifest as the top-level contract and extend SlideReference with a bounded IDC Slim public viewer handoff contract derived from the existing open GDC slide reference. The handoff should target the real public viewer path for the seed slide rather than the GDC file page, and should be structured strongly enough to validate the IDC Slim URL from the study/series identifiers. Then add rendering functions for a slide list / handoff section, thread that section through the single-case page renderer, and keep the static builder manifest-driven. Tests should pin the slide handoff to manifest data rather than hardcoded viewer URLs.
