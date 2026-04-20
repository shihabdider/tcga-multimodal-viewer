## Wish List

### Layer 3 (implement first)
- `renderCaseMetadataSection(caseMetadata: CaseMetadata): string` in `src/rendering/case-page.ts`
  Purpose: render the case summary block from `CaseMetadata`, including TCGA identifiers and diagnosis context for the single-case page
  Depends on: none
- `renderMutationHighlightsSection(highlights: MutationHighlight[]): string` in `src/rendering/case-page.ts`
  Purpose: render the bounded somatic-mutation highlight collection, including a readable empty state when no mutations are present
  Depends on: none
- `renderExpressionHighlightsSection(metric: GenomicSnapshot["expressionMetric"], highlights: ExpressionHighlight[]): string` in `src/rendering/case-page.ts`
  Purpose: render the bounded expression highlight collection with the manifest's expression metric label and values, including an empty state
  Depends on: none
- `renderCopyNumberHighlightsSection(highlights: CopyNumberHighlight[]): string` in `src/rendering/case-page.ts`
  Purpose: render the bounded gene-level copy-number highlight collection, including an empty state when the collection is empty
  Depends on: none
- `renderSingleCaseStylesheet(): string` in `src/rendering/case-page.ts`
  Purpose: return the minimal CSS needed to keep the emitted single-case page readable as a local static artifact
  Depends on: none
- `loadCaseManifestFromFile(manifestPath: string): Promise<CaseManifest>` in `src/app/build-single-case-static-app.ts`
  Purpose: read the checked-in manifest JSON from disk and turn it into a validated `CaseManifest` for the renderer pipeline
  Depends on: none
- `writeStaticAssets(outputDirectory: string, assets: StaticAsset[]): Promise<void>` in `src/app/build-single-case-static-app.ts`
  Purpose: persist the generated HTML and companion assets into the requested local output directory
  Depends on: none

### Layer 2
- `renderGenomicSnapshotSection(snapshot: GenomicSnapshot): string` in `src/rendering/case-page.ts`
  Purpose: compose the genomic snapshot block from the bounded mutation, expression, and copy-number collections in the manifest
  Depends on: renderMutationHighlightsSection, renderExpressionHighlightsSection, renderCopyNumberHighlightsSection

### Layer 1
- `renderCasePage(manifest: CaseManifest): string` in `src/rendering/case-page.ts`
  Purpose: assemble the full HTML document for one manifest-driven case page using case metadata and the genomic snapshot section
  Depends on: renderCaseMetadataSection, renderGenomicSnapshotSection
- `buildSingleCaseStaticApp(paths: SingleCaseBuildPaths): Promise<SingleCaseStaticBuild>` in `src/app/build-single-case-static-app.ts`
  Purpose: load the checked-in manifest, render the single-case page and minimal companion assets, and emit the local static build output
  Depends on: loadCaseManifestFromFile, renderCasePage, renderSingleCaseStylesheet, writeStaticAssets

### Layer 0 (implement last)
- `main(argv: string[] = process.argv.slice(2)): Promise<void>` in `src/app/build-single-case-static-app.ts`
  Purpose: provide the tiny local build entry path that applies defaults and invokes the single-case static app build
  Depends on: buildSingleCaseStaticApp

## Data Definitions Created/Modified
- `src/contracts/case-manifest.ts`: kept the existing `CaseManifest` contract unchanged as the source input for the new renderer/build pipeline
- `src/app/build-single-case-static-app.ts`: added `StaticAsset`, `SingleCaseBuildPaths`, `SingleCaseStaticBuild`, `DEFAULT_SEED_MANIFEST_PATH`, and `DEFAULT_OUTPUT_DIRECTORY` to model the emitted local artifact and its entry defaults

## Assertion Changes Flagged
- `tests/single-case-static-app.render.test.ts:18-29`: new skipped `expect(...).toContain(...)` assertions pin `renderCasePage(...)` to manifest-driven case metadata and genomic highlight values
- `tests/single-case-static-app.render.test.ts:35-44`: new skipped `expect(...).toContain(...)` assertions pin `renderGenomicSnapshotSection(...)` to manifest-driven expression, mutation, and copy-number values
- `tests/single-case-static-app.render.test.ts:55-66`: new skipped `expect(...).toBe(...)`, `toEqual(...)`, and `toContain(...)` assertions pin `buildSingleCaseStaticApp(...)` to the checked-in manifest and `index.html`/`styles.css` outputs

## Assumptions / Interpretations
- I modeled the emitted artifact as `StaticAsset[]` inside `SingleCaseStaticBuild` because the requirement called for a static local artifact plus minimal companion assets, and this keeps the build output explicit without changing `CaseManifest`.
- I interpreted “minimal companion assets” as a single external stylesheet (`styles.css`) alongside `index.html`, rather than inline-only styles or multiple assets.
- I interpreted the “tiny build/entry path” as a Bun-friendly module with `main(argv)` plus default constants for the checked-in manifest path and output directory.
- I treated slide rendering as out of scope for this iteration, so there is no slide-list renderer wish even though `CaseManifest` still carries `slides`.
- I added skipped tests with concrete assertions to pin the desired manifest-driven behavior while keeping the test verifier green during the stubber phase.

## Notes
- Verification: `bun test` passes with `53 pass` and `3 skip`; `htdp.json` does not define a compile verifier for this target, so testing was the only available symbolic check.
- New stub modules: `src/rendering/case-page.ts` and `src/app/build-single-case-static-app.ts`.
- Added `tests/single-case-static-app.render.test.ts` as a rendering/build contract scaffold; `diff-check` returned exit 0 because the file is newly added, so the new assertion lines were flagged manually above.
