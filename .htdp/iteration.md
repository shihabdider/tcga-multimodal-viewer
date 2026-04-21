# Iteration

anchor: 897decce9405970bbe52181639cda44c80e84d87
started: 2026-04-21T16:01:08Z
stubber-mode: data-definition-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Problem

Proceed to Phase 1 Iteration 4 by generalizing the checked-in single-case smoke test into a tiny TCGA-BRCA cohort artifact with 2–3 real public cases, a cohort index, and case-to-case navigation while keeping the case pages manifest-driven and static.

## Data Definition Plan

Keep `CaseManifest` as the per-case source of truth and add a bounded `CohortManifest` that points at checked-in case manifests for the tiny BRCA cohort. Build a static cohort index from those case manifests, render case-to-case navigation from cohort context rather than hardcoded routes, and keep the slide handoff / genomic snapshot UI driven by each case manifest. Seed the cohort with the existing `TCGA-E9-A5FL` case plus two additional real BRCA cases with open GDC genomic files and public IDC Slim viewer handoffs.
