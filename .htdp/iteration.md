# Iteration

anchor: b78dd6c8670c0615a322999661875747387b3fc8
started: 2026-04-23T17:35:29Z
stubber-mode: data-definition-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Problem

Proceed into Phase 2 by introducing a dedicated `TCGA-BRCA` cohort index artifact for the cohort landing page so the viewer no longer depends on loading every case manifest just to render cohort-level browsing. This slice should support bounded searchable/filterable case-summary data at the cohort-index level while keeping per-case manifests and case pages intact.

## Data Definition Plan

Add a new cohort-index contract and export/build path that contains the bounded per-case summary fields needed for Phase 2 cohort browsing, such as stable case/path references, diagnosis/context fields, mutation-summary fields, and slide counts. Keep `CaseManifest` unchanged as the case-detail contract, keep the existing cohort routing manifest stable or limited to routing concerns except for explicitly linking to the new cohort-index artifact, and update the cohort static build/render path to read the new cohort index artifact instead of deriving index content by loading all case manifests. Full-cohort ingestion, rich search UI, deployment, and pathology-derived layers remain out of scope for this iteration.

## Polya Ledger

### Knowns
- `spec.md` and `AGENTS.md` keep this slice bounded to one open-data, static-first `TCGA-BRCA` artifact.
- `CohortManifest` currently contains cohort metadata plus `caseManifestPaths` only.
- `buildTinyCohortStaticApp()` currently loads every case manifest to build cohort index content.
- `renderCohortIndexPage()` already consumes bounded summary entries rather than full `CaseManifest` values.
- `CaseManifest` is the current case-detail contract and should remain intact for this iteration.

### Constraints
- Keep the project open-data only and public-hostable.
- Prefer static or static-first architecture.
- Do not widen scope beyond one cohort.
- Do not let the pathology layer delay this viewer contract change.
- Keep per-case manifests and case pages intact.

### Unknowns That Matter
- [resolved] Whether the new cohort-index artifact should be discovered explicitly or implicitly. User confirmed explicit linking from the routing manifest.

### Out of Scope
- Full `TCGA-BRCA` ingestion or ETL expansion.
- Rich search/filter UI beyond exposing bounded summary fields for future browsing.
- Pathology-derived overlays or summaries.
- Case-page redesign.
- Changes to `CaseManifest` payload structure.

### Assumptions
- “Searchable/filterable” in this slice means exporting bounded cohort-summary fields, not implementing the full UX.
- The initial summary field set should match the current cohort card needs: case/path reference, diagnosis/context, mutation highlight genes, and slide count.
- The explicit routing-manifest link is currently represented as `CohortManifest.cohortIndexPath` while keeping `CohortManifest` otherwise routing-oriented.
- The cohort-index entries currently carry `caseId`, `href`, `caseManifestPath`, `primaryDiagnosis`, `diseaseType`, `tumorSampleId`, `mutationHighlightGenes`, and `slideCount`.

### Alternatives Considered
- Explicitly linked cohort-index artifact from `CohortManifest` — self-describing and stable for builders/renderers. Chosen.
- Convention-based sibling artifact — avoids changing `CohortManifest`, but makes artifact discovery implicit and weaker. Not chosen.

### Decision Log
- 2026-04-23T17:35:29Z — Iteration framed around introducing a dedicated cohort-index artifact for Phase 2 cohort browsing.
- 2026-04-23T18:02:34Z — User confirmed the existing iteration framing was current and that only stale execution files should be refreshed.
- 2026-04-23T18:02:34Z — User confirmed the cohort-index artifact should be explicitly linked from the routing manifest.
- 2026-04-23T18:03:56Z — Stubber modeled the explicit link as `CohortManifest.cohortIndexPath` and introduced a `cohort-index/v1` contract plus validator.

### Look Back
- 
