## Wish List

### Layer 2 (implement first)
- `validateSourceFileReference(value: unknown): SourceFileReference` in `src/contracts/case-manifest.validation.ts`
  Purpose: validate one public GDC source-file descriptor used to trace a genomic modality back to file id, file name, data type, and workflow
  Depends on: none
- `validateCaseMetadata(value: unknown): CaseMetadata` in `src/contracts/case-manifest.validation.ts`
  Purpose: validate the bounded case metadata block for one TCGA case, including stable identifiers, diagnosis context, and the tumor sample id that anchors the genomic snapshot
  Depends on: none
- `validateMutationHighlight(value: unknown): MutationHighlight` in `src/contracts/case-manifest.validation.ts`
  Purpose: validate one compact somatic mutation highlight with gene symbol, protein change, variant classification, and impact
  Depends on: none
- `validateExpressionHighlight(value: unknown): ExpressionHighlight` in `src/contracts/case-manifest.validation.ts`
  Purpose: validate one compact expression highlight with a gene symbol and `tpm_unstranded` value
  Depends on: none
- `validateCopyNumberHighlight(value: unknown): CopyNumberHighlight` in `src/contracts/case-manifest.validation.ts`
  Purpose: validate one compact gene-level copy-number highlight with a gene symbol and absolute copy-number value
  Depends on: none
- `validateSlideReference(value: unknown): SlideReference` in `src/contracts/case-manifest.validation.ts`
  Purpose: validate one open-public pathology slide reference with GDC identifiers, sample context, and public handoff URLs
  Depends on: none

### Layer 1
- `validateGenomicSnapshot(value: unknown): GenomicSnapshot` in `src/contracts/case-manifest.validation.ts`
  Purpose: validate the bounded genomic snapshot, including three source-file references plus mutation, expression, and copy-number highlight collections
  Depends on: validateSourceFileReference, validateMutationHighlight, validateExpressionHighlight, validateCopyNumberHighlight

### Layer 0 (implement last)
- `validateCaseManifest(value: unknown): CaseManifest` in `src/contracts/case-manifest.validation.ts`
  Purpose: validate a parsed JSON document as a full case manifest by checking the case block, genomic snapshot block, and each slide reference
  Depends on: validateCaseMetadata, validateGenomicSnapshot, validateSlideReference

## Data Definitions Created/Modified
- `src/contracts/case-manifest.ts`: added the JSON-first `CaseManifest`, `CaseMetadata`, `GenomicSnapshot`, and `SlideReference` contract, plus minimal helper record types for source files and genomic highlights
- `src/contracts/case-manifest.validation.ts`: added stub validation entry points for the manifest contract and nested records
- `manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json`: added the first checked-in TCGA-BRCA case manifest for `TCGA-E9-A5FL` with bounded case metadata, compact genomic highlights, and one public diagnostic slide reference
- `tests/case-manifest.contract.test.ts`: added manifest contract tests that pin the seed case id, source file ids, bounded highlight counts, and diagnostic slide reference

## Assertion Changes Flagged
- `tests/case-manifest.contract.test.ts:7-58`: new assertion lines were added to pin the manifest contract and seed-case contents; `diff-check` produced no output because this is a new untracked test file, so this was manually flagged

## Assumptions / Interpretations
- `SlideReference` uses GDC public file-page/download URLs rather than an IDC viewer URL because the task explicitly allowed a public-slide-reference-first contract and Iteration 3 is where the viewer handoff gets hardened.
- The checked-in manifest lives in `manifests/tcga-brca/` rather than `data/` because repo-root `.gitignore` ignores `data/`, which would have prevented the artifact from being checked in.
- The compact genomic snapshot was bounded to 3 mutation highlights (`TP53`, `ARID4B`, `PHLDA3`), 4 expression highlights (`ESR1`, `PGR`, `ERBB2`, `KRT5`), and 4 copy-number highlights (`PIK3CA`, `MYC`, `CDKN2A`, `ERBB2`) to keep the first contract small while still representing multiple open genomic modalities.
- `CaseMetadata` includes `tumorSampleId` but not a fuller clinical or biospecimen block, because Iteration 1 calls for bounded metadata and this field is enough to anchor the genomic snapshot to a real tumor sample.
- The `ABSOLUTE LiftOver` gene-level copy-number file was used for the checked-in copy-number highlights even though other open gene-level copy-number files exist for this case, because one stable source was sufficient for the first manifest contract.
- The single slide reference uses the verified diagnostic slide `e5806a73-54c4-43d1-a44b-db5f43c8e832` instead of the alternate verified tissue slide, because the diagnostic slide is the more natural first pathology reference for a case-level smoke test.

## Notes
- `bun test` passes with 3 tests in `tests/case-manifest.contract.test.ts`.
- The reusable runtime validators in `src/contracts/case-manifest.validation.ts` are still stubs; the current tests validate the checked-in artifact directly rather than exercising those stubs.
