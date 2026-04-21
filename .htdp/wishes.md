## Wish List

### Layer 1 (implement first)
- `renderSlideViewerHandoff(handoff: PublicViewerHandoff): string` in `src/rendering/case-page.ts`
  Purpose: render the manifest-provided IDC Slim external viewer handoff as a clickable link for one slide
  Depends on: none

### Layer 0 (implement last)
- `renderSlideListSection(slides: SlideReference[]): string` in `src/rendering/case-page.ts`
  Purpose: render the case slide list section, including checked-in slide metadata, the IDC Slim handoff for each slide, and a readable empty state when no slides are present
  Depends on: renderSlideViewerHandoff

## Data Definitions Created/Modified
- `src/contracts/case-manifest.ts`: replaced `PublicViewerHandoff` with an IDC Slim contract (`provider: "idc-slim"`, `studyInstanceUid`, `seriesInstanceUid`, `url`)
- `manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json`: corrected `slides[0].viewerHandoff` to the verified IDC Slim study/series mapping for the seed slide
- `src/contracts/case-manifest.validation.ts`: updated `validatePublicViewerHandoff(value: unknown): PublicViewerHandoff` to require `provider: "idc-slim"`, validate DICOM-style study/series identifiers, and derive the expected Slim URL from those identifiers inside `validateSlideReference`

## Assertion Changes Flagged
```text
  + tests/case-manifest.contract.test.ts:34:     expect(viewerHandoff.url).toBe(
  - tests/case-manifest.slide-reference.validation.test.ts:34:     expect(validateSlideReference(validSlideReference)).toMatchObject({
  + tests/case-manifest.slide-reference.validation.test.ts:45:     expect(validatedSlideReference).toMatchObject({
  + tests/case-manifest.slide-reference.validation.test.ts:48:     expect(validatedSlideReference.viewerHandoff.url).toBe(
  - tests/case-manifest.slide-reference.validation.test.ts:60:     ).toThrow(/PublicViewerHandoff\.provider must be "gdc"/);
  + tests/case-manifest.slide-reference.validation.test.ts:74:     ).toThrow(/PublicViewerHandoff\.provider must be "idc-slim"/);
  + tests/case-manifest.slide-reference.validation.test.ts:76:     expect(() =>
  + tests/case-manifest.slide-reference.validation.test.ts:85:     ).toThrow(/PublicViewerHandoff\.studyInstanceUid must be a DICOM UID string/);
  + tests/case-manifest.slide-reference.validation.test.ts:87:     expect(() =>
  + tests/case-manifest.slide-reference.validation.test.ts:96:     ).toThrow(/PublicViewerHandoff\.seriesInstanceUid must be a DICOM UID string/);

10 assertion change(s) flagged
```

## Assumptions / Interpretations
- I used `provider: "idc-slim"` instead of a broader `"idc"` tag because the requirement names the Slim viewer path specifically and the contract is meant to be bounded to that public handoff.
- I kept `publicPageUrl` and `publicDownloadUrl` on `SlideReference` as the original open GDC references and modeled IDC Slim as an additional `viewerHandoff`, because the requirement says the handoff is derived from the existing GDC slide reference rather than replacing it.
- I treated “structured strongly enough to validate the IDC Slim URL from the study/series identifiers” as requiring digits-and-dots DICOM-style UID validation plus exact URL derivation from those two identifiers, not fuller DICOM metadata validation.
- I kept the render wish graph unchanged: the remaining implementation frontier is still the leaf handoff renderer plus the enclosing slide-list section, because `renderCasePage` is already threaded through to call `renderSlideListSection`.

## Notes
- Verification used the `test` verifier from `htdp.json` (`bun test`); there is no compile verifier configured for this repo.
- `bun test` now reports `85 pass / 4 fail`. The only remaining failures are the expected render-stub frontier in `tests/slide-list-section.render.test.ts` (3) and `tests/case-page.render.test.ts` (1).
- The static builder path remained manifest-driven without code changes: `buildSingleCaseStaticApp` already loads `CaseManifest` from disk and passes it through `renderCasePage`.
