## Wish List

### Layer 3 (implement first)
- `validateIdcSlimViewerHandoffSeed(value: unknown): IdcSlimViewerHandoffSeed` in `src/contracts/tiny-cohort-export.validation.ts`
  Purpose: validate the bounded IDC Slim handoff seed and return only the provider plus study/series UIDs needed to derive the public viewer URL
  Depends on: none
- `validateTinyMutationSelector(value: unknown): TinyMutationSelector` in `src/contracts/tiny-cohort-export.validation.ts`
  Purpose: validate one pinned mutation selector so the exporter can match a specific public MAF row for a recipe case
  Depends on: none
- `validateTinyCaseSelectedFileIds(value: unknown): TinyCaseSelectedFileIds` in `src/contracts/tiny-cohort-export.validation.ts`
  Purpose: validate the four pinned public GDC file identifiers for one tiny-cohort case
  Depends on: none
- `fetchPublicCaseMetadata(caseId: CaseId): Promise<CaseMetadata>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: fetch the public GDC case metadata needed to rebuild the existing `CaseMetadata` block, including the anchored tumor sample id
  Depends on: none
- `fetchPublicSourceFileReference(fileId: string): Promise<SourceFileReference>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: fetch public GDC file metadata for one selected genomic file id and map it into the existing `SourceFileReference` contract
  Depends on: none
- `fetchPublicSlideReferenceBase(fileId: string): Promise<Omit<SlideReference, "viewerHandoff">>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: fetch public GDC slide-file metadata for one pinned slide file id and derive every `SlideReference` field except the IDC viewer handoff
  Depends on: none
- `downloadOpenGdcFileText(fileId: string): Promise<string>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: download the referenced open GDC source file contents for a pinned file id so downstream selectors can derive bounded highlights
  Depends on: none
- `selectMutationHighlights(fileContents: string, selectors: TinyMutationSelector[]): MutationHighlight[]` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: parse the masked somatic mutation source file and return the exact bounded mutation highlights requested by the recipe in recipe order
  Depends on: none
- `selectExpressionHighlights(fileContents: string, genePanel: string[]): ExpressionHighlight[]` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: parse the gene-expression source file and return the bounded expression panel values in the configured panel order
  Depends on: none
- `selectCopyNumberHighlights(fileContents: string, genePanel: string[]): CopyNumberHighlight[]` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: parse the gene-level copy-number source file and return the bounded copy-number panel values in the configured panel order
  Depends on: none
- `buildIdcSlimViewerHandoff(seed: IdcSlimViewerHandoffSeed): PublicViewerHandoff` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: derive the existing public IDC Slim handoff object, including the canonical external URL, from the pinned handoff seed
  Depends on: none
- `deriveCohortManifest(recipe: TinyCohortExportRecipe, caseManifests: CaseManifest[]): CohortManifest` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: derive the existing tiny `CohortManifest` in stable recipe order from the checked-in cohort metadata plus emitted case manifests
  Depends on: none
- `serializeNormalizedManifestJson(manifest: CaseManifest | CohortManifest): string` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: emit deterministic pretty-printed JSON with stable key ordering and trailing newline so regenerated manifests are source-normalized and comparable
  Depends on: none

### Layer 2
- `validateTinyCaseExportRecipe(value: unknown): TinyCaseExportRecipe` in `src/contracts/tiny-cohort-export.validation.ts`
  Purpose: validate one tiny-case export recipe, including its pinned file ids, bounded mutation selectors, and IDC Slim handoff seed
  Depends on: validateTinyCaseSelectedFileIds, validateTinyMutationSelector, validateIdcSlimViewerHandoffSeed
- `deriveGenomicSnapshot(caseRecipe: TinyCaseExportRecipe, expressionGenePanel: string[], copyNumberGenePanel: string[]): Promise<GenomicSnapshot>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: derive the existing bounded `GenomicSnapshot` for one case from selected public file metadata plus parsed mutation, expression, and copy-number highlights
  Depends on: fetchPublicSourceFileReference, downloadOpenGdcFileText, selectMutationHighlights, selectExpressionHighlights, selectCopyNumberHighlights
- `deriveSlideReference(caseRecipe: TinyCaseExportRecipe): Promise<SlideReference>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: derive the existing `SlideReference` for the pinned public slide by combining fetched GDC slide metadata with the IDC Slim handoff seed
  Depends on: fetchPublicSlideReferenceBase, buildIdcSlimViewerHandoff
- `writeManifestJsonFiles(outputDirectory: string, cohortManifest: CohortManifest, caseManifests: CaseManifest[]): Promise<ManifestJsonFile[]>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: write the cohort manifest plus per-case manifests to the export directory using the existing checked-in filenames and stable source-normalized JSON
  Depends on: serializeNormalizedManifestJson

### Layer 1
- `validateTinyCohortExportRecipe(value: unknown): TinyCohortExportRecipe` in `src/contracts/tiny-cohort-export.validation.ts`
  Purpose: validate the full checked-in tiny export recipe, including cohort metadata, shared gene panels, and the stable ordered case list
  Depends on: validateTinyCaseExportRecipe
- `deriveCaseManifest(caseRecipe: TinyCaseExportRecipe, expressionGenePanel: string[], copyNumberGenePanel: string[]): Promise<CaseManifest>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: derive one existing `CaseManifest` from public GDC case metadata, the bounded genomic snapshot, and the pinned public slide reference
  Depends on: fetchPublicCaseMetadata, deriveGenomicSnapshot, deriveSlideReference

### Layer 0 (implement last)
- `exportTinyCohortManifests(paths: TinyCohortExportPaths): Promise<TinyCohortManifestExport>` in `src/app/export-tiny-cohort-manifests.ts`
  Purpose: orchestrate recipe validation, per-case public-data export, stable cohort-manifest derivation, and source-normalized manifest writing for the tiny BRCA cohort
  Depends on: validateTinyCohortExportRecipe, deriveCaseManifest, deriveCohortManifest, writeManifestJsonFiles

## Data Definitions Created/Modified
- `src/contracts/tiny-cohort-export.ts`: added `TinyCohortExportRecipe`, nested recipe types for pinned file ids / mutation selectors / IDC Slim seeds, and `TinyCohortManifestExport`
- `src/contracts/tiny-cohort-export.validation.ts`: added stub validators for the new tiny export recipe contract
- `src/app/export-tiny-cohort-manifests.ts`: added the stubbed exporter entrypoint plus the derived function surfaces for recipe-driven manifest regeneration
- `manifests/tcga-brca/tcga-brca.tiny-export-recipe.json`: added the checked-in three-case export recipe with pinned public GDC file ids, bounded mutation selectors, shared gene panels, and IDC Slim handoff seeds

## Assertion Changes Flagged
None

## Assumptions / Interpretations
- I represented `expressionGenePanel` and `copyNumberGenePanel` once at the cohort-recipe level because the current checked-in tiny cohort uses the same bounded panels for all three cases. Alternative: store these panels per case.
- I represented each mutation selector as `{ geneSymbol, proteinChange, variantClassification }`, assuming mutation impact should be re-derived from the public MAF rather than pinned in the recipe. Alternative: pin `impact` too.
- I treated slide choice as one pinned public GDC slide file id plus one IDC Slim handoff seed per case, assuming the remaining `SlideReference` fields are reproducibly derivable from public GDC file metadata. Alternative: pin more slide metadata in the recipe.
- I included cohort-level `cohortId`, `title`, and `description` in the recipe because those strings are output choices rather than values safely derivable from public APIs alone.
- I placed the exporter CLI in `src/app/export-tiny-cohort-manifests.ts` and defaulted its output directory to `dist/tcga-brca-manifest-export` so regeneration does not overwrite the checked-in manifests by default. Alternative: default directly to `manifests/tcga-brca`.
- I interpreted “source-normalized equivalent” as deterministic JSON emission with stable field ordering and formatting, not necessarily byte-for-byte preservation of the current checked-in whitespace.
- I kept the existing `CaseManifest` and `CohortManifest` contracts unchanged, assuming Iteration 5 adds only a reproducible export path around the current viewer contract rather than a new manifest schema version.

## Notes
- No existing viewer or static-app functions required contract changes; the new export path is additive and keeps the frontend manifest-driven and static.
- `bun test` still passes after adding the new recipe contract, checked-in recipe JSON, and stub exporter surfaces.
- `README.md` was not updated in this stubber pass; the eventual documented command should point at `bun run src/app/export-tiny-cohort-manifests.ts` once the stubs are implemented.
