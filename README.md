# TCGA Multimodal Viewer

A public, open-data TCGA cohort viewer that combines:
- case-level genomics snapshots from **GDC open data**
- public pathology slide viewing via **IDC / TCGA images**
- a later pathology-derived layer such as overlays or slide-level summaries

This repo is intentionally **product / systems / AI-frontend** oriented rather than methods-first.

## Source of truth

- See [`spec.md`](./spec.md)

## Current framing

The default first cohort is **TCGA-BRCA**.

The current MVP order is:
1. multimodal smoke test on a tiny BRCA subset
2. public one-cohort viewer
3. pathology-derived differentiator layer
