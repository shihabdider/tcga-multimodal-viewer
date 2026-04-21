## Wish List

### Layer 0 (implement first — only layer)
- `coverExportTinyCohortManifestsMain(argv: string[]): Promise<void>` in `tests/export-tiny-cohort-manifests.main.test.ts`
  Purpose: exercise the documented `bun run src/app/export-tiny-cohort-manifests.ts` entrypoint with explicit recipe/output arguments plus cwd-based default fallbacks, while mocking public GDC fetches to the checked-in tiny BRCA recipe/manifests so a fresh local-style test run stays deterministic.
  Depends on: none
- `coverBuildTinyCohortStaticAppMain(argv: string[]): Promise<void>` in `tests/build-tiny-cohort-static-app.main.test.ts`
  Purpose: exercise the documented `bun run src/app/build-tiny-cohort-static-app.ts` entrypoint with explicit manifest/output arguments and default fallbacks, and verify it writes the cohort index plus case pages expected from the tiny checked-in/exported cohort manifest.
  Depends on: none
- `coverTinyBrcaExportToStaticViewerThinSlice(): Promise<void>` in `tests/tiny-cohort.export-build-thin-slice.test.ts`
  Purpose: run the checked-in tiny export recipe through manifest export and cohort static build in one test, then assert the resulting artifact still renders the cohort index, case navigation, and IDC Slim handoff links that define the Phase 1 thin slice.
  Depends on: none
- `documentTinyBrcaSmokeTestLocalRunbook(): void` in `README.md`
  Purpose: add a bounded Phase 1 runbook with prerequisites, validation/run commands for the checked-in and exported tiny cohort paths, and the current thin-slice risks/gaps (live GDC dependency, external IDC handoff dependency, tiny-scope limitations, and no pathology-derived layer yet).
  Depends on: none

## Data Definitions Created/Modified
None — runtime contracts unchanged (`CaseManifest`, `CohortManifest`, and `TinyCohortExportRecipe` remain the source of truth).

## Assertion Changes Flagged
None

## Assumptions / Interpretations
- "Documented CLI entrypoints" interpreted as the README-facing Bun commands for `src/app/export-tiny-cohort-manifests.ts` and `src/app/build-tiny-cohort-static-app.ts`. `build-single-case-static-app.ts` already has main-entrypoint coverage, so I left it out of the new wish list.
- "Fresh local setup can validate and run" interpreted as adding deterministic local tests plus README run instructions, not as adding new package scripts or installer/bootstrap automation, because the repo currently uses direct Bun/TypeScript entrypoints and has no `package.json`.
- The export CLI coverage should stay hermetic by mocking GDC fetches in-process rather than spawning the export script against live network dependencies, because the exporter hardcodes public GDC endpoints and the requirement called for hardening smoke tests, not adding live-network CI reliance.
- The bounded documentation should extend `README.md` rather than introducing a separate runbook file, because README already owns the local build/preview commands.
- The current Phase 1 risks/gaps section should focus on thin-slice realities that affect local use now: live public GDC availability for export, IDC Slim quota/availability for slide handoffs, the external-handoff-only viewer model, and the intentionally tiny three-case/no-pathology-derived scope.

## Notes
- Baseline verification is clean: `bun test` passed with 192 tests across 44 files before adding this iteration's wishes.
- No runtime contract or production-logic changes are needed for Iteration 6; the gap is missing CLI/thin-slice coverage plus missing bounded local-run/risk documentation.
- Existing coverage already exercises `buildSingleCaseStaticApp.main` and the lower-level export/build functions; the missing pieces are export-main coverage, tiny-cohort build-main coverage, and one composed `export -> build` smoke test.
- The working tree already contains unrelated in-progress changes in `README.md` and `.htdp/*`; the implementer should merge the Iteration 6 documentation work carefully with those existing edits.
