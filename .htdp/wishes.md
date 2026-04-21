## Wish List

### Layer 1 (implement first)
- `validateCohortManifest(value: unknown): CohortManifest` in `src/contracts/cohort-manifest.validation.ts`
  Purpose: validate a bounded tiny-cohort contract that points at checked-in case manifests for the static BRCA cohort smoke test
  Depends on: none

- `renderCohortIndexPage(model: CohortIndexPageModel): string` in `src/rendering/case-page.ts`
  Purpose: render a tiny cohort landing page with manifest-driven case summaries and links into each case page
  Depends on: none

### Layer 0 (implement last)
- `buildTinyCohortStaticApp(paths: TinyCohortBuildPaths): Promise<TinyCohortStaticBuild>` in `src/app/build-tiny-cohort-static-app.ts`
  Purpose: load the checked-in tiny cohort manifest, render the cohort index plus per-case navigation, and write the static artifact
  Depends on: validateCohortManifest, renderCohortIndexPage

## Data Definitions Created/Modified
- `src/contracts/cohort-manifest.ts`: added `CohortManifest` for the tiny checked-in BRCA cohort
- `manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json`: added the tiny cohort entrypoint pointing at three checked-in real BRCA case manifests
- `manifests/tcga-brca/tcga-3c-aalk.case-manifest.json`: added a real public BRCA ductal case with open GDC genomic files and IDC Slim slide handoff
- `manifests/tcga-brca/tcga-4h-aaak.case-manifest.json`: added a real public BRCA lobular case with open GDC genomic files and IDC Slim slide handoff
- `src/rendering/case-page.ts`: extended rendering with cohort index and case-to-case navigation while keeping single-case rendering backward compatible

## Assumptions / Interpretations
- I treated the tiny cohort contract as an ordered list of relative case-manifest paths so the checked-in case manifests remain the source of truth and the cohort index can stay static-first.
- I implemented case-to-case navigation as a small cohort nav block on every case page plus a back-to-index link, rather than adding richer routing, filtering, or a client-side router.
- I kept one public slide per additional case to stay within the smallest useful public artifact for Iteration 4.
