# Iteration

anchor: 064d6afcdda85eef5a8a982cc2fb6d8385fc87c8
started: 2026-04-20T19:53:02Z
stubber-mode: data-definition-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Problem

Create the first real contract artifact for this repo: one checked-in manifest for a real TCGA-BRCA case, with bounded case metadata, a compact genomic snapshot, and one public pathology slide reference.

## Data Definition Plan

Introduce a small JSON-first manifest contract backed by minimal TypeScript data definitions and validation/tests, centered on:
- CaseManifest
- CaseMetadata
- GenomicSnapshot
- SlideReference

Use a real seed case from open data (currently TCGA-E9-A5FL) and keep the slide reference public-slide-reference-first so the exact IDC viewer handoff can be hardened in a later loop.
