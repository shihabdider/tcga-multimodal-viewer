# Phase 1 Iterations

This file breaks the Phase 1 smoke-test milestone from `spec.md` into small HtDP-style iterations.

## Goal

Prove the open-data `case -> genomics snapshot -> public slide viewer` path locally for a tiny `TCGA-BRCA` subset.

## Iteration 1 — Minimal real case manifest

Requirement:
- define a checked-in manifest for one real `TCGA-BRCA` case with:
  - case metadata
  - a bounded genomic snapshot
  - one linked public slide reference

Likely data definitions:
- `CaseId`
- `GenomicSnapshot`
- `SlideReference`
- `CaseManifest`

Done when:
- one manifest file validates and represents a real public case/slide pair

Out of scope:
- UI
- routing
- multiple cases
- automated data ingestion

## Iteration 2 — Single-case static renderer

Requirement:
- build a local static app that reads `CaseManifest` and renders one usable case page

Done when:
- the page shows metadata and genomic snapshot from the manifest
- the page is driven by manifest data rather than hardcoded case text

Out of scope:
- slide opening
- cohort index
- search

## Iteration 3 — Working slide handoff

Requirement:
- add slide list UI and a working remote viewer path from `SlideReference`

Done when:
- clicking the slide opens the real public slide path locally

Out of scope:
- embedded deep zoom if an external/public handoff is the fastest reliable first path

## Iteration 4 — Tiny cohort generalization

Requirement:
- extend from one case to 2–3 real BRCA cases

Likely data definition:
- `CohortManifest`

Done when:
- there is a tiny cohort index and case-to-case navigation

Out of scope:
- rich filtering
- full cohort ingestion

## Iteration 5 — Reproducible tiny-manifest export

Requirement:
- add a small builder/export path that regenerates the tiny checked-in manifest from public inputs

Done when:
- one documented command reproduces the tiny artifact or its source-normalized equivalent

Out of scope:
- full-scale ETL
- full BRCA build

## Iteration 6 — Smoke-test hardening

Requirement:
- add minimal validation/tests and local run docs for the full thin slice

Done when:
- a fresh local setup can run the tiny viewer
- known risks and gaps are documented

Out of scope:
- pathology-derived layer
- full design polish
- production infrastructure
