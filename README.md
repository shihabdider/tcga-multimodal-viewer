# TCGA Multimodal Viewer

A public, open-data TCGA cohort viewer that combines:
- case-level genomics snapshots from **GDC open data**
- public pathology slide viewing via **IDC / TCGA images**
- a later pathology-derived layer such as overlays or slide-level summaries

This repo is intentionally **product / systems / AI-frontend** oriented rather than methods-first.

## Source of truth

- [`spec.md`](./spec.md)
- [`docs/phase1-iterations.md`](./docs/phase1-iterations.md)

## Current framing

The default first cohort is **TCGA-BRCA**.

The current MVP order is:
1. multimodal smoke test on a tiny BRCA subset
2. public one-cohort viewer
3. pathology-derived differentiator layer

## Phase 1 local smoke-test runbook

This is the bounded Iteration 6 runbook for the current thin slice:
`case -> genomics snapshot -> public slide viewer` on a tiny public `TCGA-BRCA` subset.

### Prerequisites

- **Bun** for tests and TypeScript entrypoints.
- **Python 3** for a simple local static-file preview server.
- **Node.js + Playwright** available either locally or via `NODE_PATH` for `scripts/verify-playwright-ux.cjs`.
- Internet access to **`api.gdc.cancer.gov`** for the exported-manifest path.
- Internet access to **IDC Slim viewer** if you want to follow the external slide handoff in a browser. This repo does **not** host slides locally.

### Common validation

Run the repo test suite first:

```sh
bun test
```

What this verifies now:
- manifest and recipe contract validation
- bounded rendering for cohort/case pages
- static build helpers
- tiny-manifest export logic and checked-in artifact reproduction under test

What it does **not** verify by itself:
- live GDC availability
- live IDC availability
- full-cohort behavior beyond the tiny checked-in slice

### Checked-in tiny cohort path

Use this path for the fastest local smoke test from repo contents alone.

1. Build the Iteration 4 tiny-cohort static app from the checked-in manifest:

```sh
bun run src/app/build-tiny-cohort-static-app.ts
```

This writes the default artifact to `dist/tcga-brca-tiny-cohort/`.

2. Preview the checked-in build locally:

```sh
python3 -m http.server 8000 --directory dist/tcga-brca-tiny-cohort
```

Then open <http://localhost:8000>.

3. Run the current automated UX smoke test for the checked-in build:

```sh
bun run src/app/build-tiny-cohort-static-app.ts >/dev/null
NODE_PATH="$(npm root -g)" node scripts/verify-playwright-ux.cjs
```

What this verifies now:
- the cohort index loads from the built static files
- case-to-case navigation works for the checked-in three-case slice
- the case page exposes the expected external IDC Slim handoff URL
- clicking the handoff opens the expected external URL in isolated Chromium

What remains outside this check:
- IDC uptime, quota, and viewer health
- embedded slide viewing inside this app
- any pathology-derived overlay or summary layer

### Exported tiny cohort path

Use this path for the Iteration 5 reproducible tiny-manifest export from public inputs.

1. Regenerate the source-normalized tiny cohort manifests:

```sh
bun run src/app/export-tiny-cohort-manifests.ts
```

By default this reads `manifests/tcga-brca/tcga-brca.tiny-export-recipe.json` and writes the exported manifest set to `dist/tcga-brca-manifest-export/`.

2. Validate the exported manifests against the checked-in tiny cohort artifacts:

```sh
for file in \
  tcga-brca.tiny-cohort-manifest.json \
  tcga-e9-a5fl.case-manifest.json \
  tcga-4h-aaak.case-manifest.json \
  tcga-3c-aalk.case-manifest.json
 do
  cmp -s "manifests/tcga-brca/$file" "dist/tcga-brca-manifest-export/$file" || {
    echo "Mismatch: $file"
    exit 1
  }
  echo "OK $file"
 done
```

3. Rebuild the tiny cohort static app from that exported cohort manifest with the existing static builder:

```sh
bun run src/app/build-tiny-cohort-static-app.ts \
  dist/tcga-brca-manifest-export/tcga-brca.tiny-cohort-manifest.json \
  dist/tcga-brca-tiny-cohort-from-export
```

4. Preview the exported build locally:

```sh
python3 -m http.server 8000 --directory dist/tcga-brca-tiny-cohort-from-export
```

Then open <http://localhost:8000>.

What this verifies now:
- the checked-in recipe still reproduces the tiny cohort manifest set from public inputs
- the exported manifest set can be consumed by the same static builder as the checked-in path

What remains outside this check:
- a dedicated Playwright UX script pointed at `dist/tcga-brca-tiny-cohort-from-export`
- protection against live GDC API outages, schema drift, or source-data changes

### Earlier single-case smoke-test builder

The earlier single-case smoke-test builder is still available:

```sh
bun run src/app/build-single-case-static-app.ts
```

This writes the seed case page to `dist/tcga-e9-a5fl/`.
Use it only as the earlier seed-case path; the main Phase 1 runbook above is the three-case tiny cohort flow.

## Current thin-slice risks and gaps

- **Live GDC dependency for reproducible export.** The checked-in tiny cohort path is locally runnable from repo artifacts, but the export path still depends on live public GDC endpoints and pinned public file availability.
- **External IDC handoff dependency.** The app currently hands users off to the public **IDC Slim viewer**. That proves a bounded public slide-opening path, but it does not guarantee IDC uptime, quota, or a first-party in-app slide experience.
- **Tiny-scope limitations.** This is still a three-case `TCGA-BRCA` smoke test with a bounded genomic snapshot and simple cohort/case navigation, not a full cohort browser with search, filtering, or broad modality coverage.
- **No pathology-derived layer yet.** There are no overlays, slide-level summaries, or offline pathology-derived artifacts in the current Phase 1 slice. That differentiator remains Phase 3 work by design.
