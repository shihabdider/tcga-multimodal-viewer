# Iteration

anchor: 4c0f8462ed13957043a75b7fcc9e9b6b132a4f6c
started: 2026-04-21T16:20:08Z
stubber-mode: data-definition-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Problem

Proceed to Phase 1 Iteration 5 by adding a small reproducible export path that regenerates the checked-in tiny TCGA-BRCA cohort manifests from public inputs, while keeping the viewer manifest-driven and static.

## Data Definition Plan

Add a bounded checked-in export recipe for the three tiny-cohort BRCA cases that records only the pinned choices the exporter cannot derive safely from public APIs alone: the selected public GDC file IDs, bounded mutation selectors, bounded expression and copy-number gene panels, and the IDC Slim viewer handoff seed. Build an exporter around that recipe which fetches public GDC case and file metadata plus the referenced open source files, derives the existing `CaseManifest` and `CohortManifest` outputs in a stable order, and writes a source-normalized equivalent of the checked-in tiny cohort manifests.
