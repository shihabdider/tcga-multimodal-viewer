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

## Local build and preview

Build the Iteration 4 tiny-cohort static app:

```sh
bun run src/app/build-tiny-cohort-static-app.ts
```

This writes the default artifact to `dist/tcga-brca-tiny-cohort/`.

Preview it locally with a simple static file server:

```sh
python3 -m http.server 8000 --directory dist/tcga-brca-tiny-cohort
```

Then open <http://localhost:8000>.

The earlier single-case smoke-test builder is still available:

```sh
bun run src/app/build-single-case-static-app.ts
```

This writes the seed case page to `dist/tcga-e9-a5fl/`.
