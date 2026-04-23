## Wish List

### Layer 2 (implement first)
- `deriveCohortIndexManifest(recipe: TinyCohortExportRecipe, cohortManifest: CohortManifest, caseManifests: CaseManifest[]): CohortIndexManifest` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: derive the new `cohort-index/v1` artifact in recipe order, carrying each case’s stable case-page href, case-manifest path, diagnosis/context fields, mutation-highlight gene summary, and slide count.
  Depends on: none
- `loadCohortIndexManifestFromFile(manifestPath: string): Promise<CohortIndexManifest>` in `src/app/build-tiny-cohort-static-app.ts`
  Purpose: read, parse, and validate the linked cohort-index JSON artifact from disk before the cohort landing page is rendered.
  Depends on: none
- `serializeNormalizedManifestJson(manifest: CaseManifest | CohortManifest | CohortIndexManifest): string` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: emit stable normalized JSON for the new cohort-index artifact in addition to the existing case and routing manifests so checked-in/exported source text stays deterministic.
  Depends on: none
- `assertLoadedCasesMatchCohort(cohortManifest: CohortManifest, loadedCases: LoadedCohortCase[]): void` in `src/app/build-tiny-cohort-static-app.ts`
  Purpose: extend the existing case-manifest consistency check so case pages and navigation stay aligned with the routing manifest once the landing page is sourced from the linked cohort index.
  Depends on: none

### Layer 1
- `writeManifestJsonFiles(outputDirectory: string, cohortManifest: CohortManifest, caseManifests: CaseManifest[]): Promise<ManifestJsonFile[]>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: write the routing manifest plus the new linked cohort-index JSON alongside the ordered case manifests with stable filenames.
  Depends on: serializeNormalizedManifestJson
- `exportTinyCohortManifests(paths: TinyCohortExportPaths): Promise<TinyCohortManifestExport>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: thread cohort-index derivation through the export flow so exported files include the linked Phase 2 cohort-browsing artifact without changing per-case manifests.
  Depends on: deriveCohortIndexManifest, writeManifestJsonFiles
- `buildTinyCohortStaticApp(paths: TinyCohortBuildPaths): Promise<TinyCohortStaticBuild>` in `src/app/build-tiny-cohort-static-app.ts`
  Purpose: render `index.html` from the linked cohort-index artifact instead of constructing summary cards from all loaded case manifests, while still building case pages and navigation from per-case manifest data.
  Depends on: loadCohortIndexManifestFromFile, assertLoadedCasesMatchCohort

### Layer 0 (implement last)
- `expectCheckedInManifestExport(outputDirectory: string): Promise<void>` in `tests/export-tiny-cohort-manifests.main.test.ts`
  Purpose: update CLI export assertions to expect the linked cohort-index JSON file in addition to the routing manifest and case manifests.
  Depends on: exportTinyCohortManifests
- `coverTinyBrcaExportToStaticViewerThinSlice(): Promise<void>` in `tests/tiny-cohort.export-build-thin-slice.test.ts`
  Purpose: extend the end-to-end thin-slice test to verify the exporter emits the cohort-index artifact and the static build consumes it while keeping case pages and cohort navigation intact.
  Depends on: exportTinyCohortManifests, buildTinyCohortStaticApp

## Data Definitions Created/Modified
- `src/contracts/cohort-index.ts`: added `CohortIndexEntry` and `CohortIndexManifest` for bounded Phase 2 cohort-summary data.
- `src/contracts/cohort-index.validation.ts`: added `validateCohortIndexManifest(value: unknown): CohortIndexManifest`.
- `src/contracts/cohort-manifest.ts`: added `cohortIndexPath: string` to the routing manifest contract.
- `src/contracts/cohort-manifest.validation.ts`: now validates `cohortIndexPath` as a non-empty `cohort-index.json` reference.
- `src/rendering/case-page.ts`: aligned `CohortIndexPageModel.cases` with the shared `CohortIndexEntry` contract.
- `src/app/export-tiny-cohort-manifests.ts`: added `DEFAULT_COHORT_INDEX_OUTPUT_PATH`, added a stub for `deriveCohortIndexManifest(...)`, widened `serializeNormalizedManifestJson(...)` to include `CohortIndexManifest`, and made `deriveCohortManifest(...)` emit `cohortIndexPath`.
- `src/app/build-tiny-cohort-static-app.ts`: added a stub for `loadCohortIndexManifestFromFile(...)`.
- `manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json`: added `cohortIndexPath`.
- `manifests/tcga-brca/tcga-brca.tiny-cohort-index.json`: added a checked-in `cohort-index/v1` example artifact for the tiny BRCA cohort.

## Assertion Changes Flagged
```text
  + tests/cohort-manifest.contract.test.ts:19:     expect(cohortManifest.cohortIndexPath).toBe(
  + tests/cohort-manifest.validation.test.ts:21:     expect(() =>
  + tests/cohort-manifest.validation.test.ts:26:     ).toThrow(/CohortManifest\.cohortIndexPath must end with cohort-index\.json/);
  - tests/cohort-page.render.test.ts:37:     expect(rendered).toContain("TCGA-BRCA tiny cohort");
  - tests/cohort-page.render.test.ts:38:     expect(rendered).toContain(
  + tests/cohort-page.render.test.ts:23:     expect(rendered).toContain(cohortIndexManifest.title);
  + tests/cohort-page.render.test.ts:24:     expect(rendered).toContain(cohortIndexManifest.description);
  - tests/cohort-page.render.test.ts:43:       expect(rendered).toContain(manifest.case.caseId);
  - tests/cohort-page.render.test.ts:44:       expect(rendered).toContain(manifest.case.primaryDiagnosis);
  - tests/cohort-page.render.test.ts:45:       expect(rendered).toContain(`cases/${manifest.case.caseId.toLowerCase()}/index.html`);
  - tests/cohort-page.render.test.ts:46:       expect(rendered).toContain(
  + tests/cohort-page.render.test.ts:27:       expect(rendered).toContain(entry.caseId);
  + tests/cohort-page.render.test.ts:28:       expect(rendered).toContain(entry.primaryDiagnosis);
  + tests/cohort-page.render.test.ts:29:       expect(rendered).toContain(entry.href);
  + tests/cohort-page.render.test.ts:30:       expect(rendered).toContain(entry.mutationHighlightGenes[0]);

15 assertion change(s) flagged
```

## Assumptions / Interpretations
- I treated the routing-manifest link as an explicit `cohortIndexPath` field on `CohortManifest` rather than inferring a sibling filename by convention, because the requirement explicitly asked for the routing manifest to link to the new artifact.
- I kept the initial cohort-index case summary bounded to the fields already needed for cohort cards and near-term search/filter hooks: `caseId`, `href`, `caseManifestPath`, `primaryDiagnosis`, `diseaseType`, `tumorSampleId`, `mutationHighlightGenes`, and `slideCount`.
- I kept `href` in the cohort-index artifact instead of only storing a slug because the existing renderer already consumes stable per-case hrefs and this keeps the build/render handoff simple.
- I left `CaseManifest` unchanged and did not widen `TinyCohortManifestExport` yet; for now the new artifact is discoverable through `cohortIndexPath` plus the eventual exported file list.
- I added stubs for `deriveCohortIndexManifest(...)` and `loadCohortIndexManifestFromFile(...)` without wiring them into runtime yet so the repository stays green while the remaining implementation work is captured in the wish list.

## Notes
- Verified with `bun test`: 201 passing tests.
- The runtime still builds the cohort landing page by mapping loaded case manifests; the new cohort-index export/build path is modeled but not implemented yet.
- `tests/export-tiny-cohort-manifests.test.ts` and `tests/write-manifest-json-files.test.ts` contain inline file-list assertions rather than named helpers; they will also need synchronized expectation updates when Layer 1 is implemented.
