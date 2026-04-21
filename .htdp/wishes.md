## Wish List

### Layer 1 (implement first)
- `renderSlideViewerHandoff(handoff: PublicViewerHandoff): string` in `src/rendering/case-page.ts`
  Purpose: render the manifest-provided external public slide handoff as a clickable link target for one slide
  Depends on: none

### Layer 0 (implement last)
- `renderSlideListSection(slides: SlideReference[]): string` in `src/rendering/case-page.ts`
  Purpose: render the case slide list section, including checked-in slide metadata, the external handoff for each slide, and a readable empty state when no slides are present
  Depends on: renderSlideViewerHandoff

## Data Definitions Created/Modified
- `src/contracts/case-manifest.ts`: added `PublicViewerHandoff` and `viewerHandoff: PublicViewerHandoff` to `SlideReference`
- `manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json`: added `slides[0].viewerHandoff` bound to the checked-in GDC public file page
- `src/contracts/case-manifest.validation.ts`: added `validatePublicViewerHandoff(value: unknown, publicPageUrl: string): PublicViewerHandoff` and threaded it through `validateSlideReference`
- `src/rendering/case-page.ts`: added `renderSlideListSection` / `renderSlideViewerHandoff` stubs and threaded the slide section through `renderCasePage`

## Assertion Changes Flagged
```text
  + tests/case-manifest.slide-reference.validation.test.ts:34:     expect(validateSlideReference(validSlideReference)).toMatchObject({
  + tests/case-manifest.slide-reference.validation.test.ts:40:     expect(() =>
  + tests/case-manifest.slide-reference.validation.test.ts:49:     ).toThrow(/PublicViewerHandoff\.kind must be "external"/);
  + tests/case-manifest.slide-reference.validation.test.ts:51:     expect(() =>
  + tests/case-manifest.slide-reference.validation.test.ts:60:     ).toThrow(/PublicViewerHandoff\.provider must be "gdc"/);
  + tests/case-manifest.slide-reference.validation.test.ts:62:     expect(() =>
  + tests/case-manifest.slide-reference.validation.test.ts:71:     ).toThrow(
  + tests/case-page.render.test.ts:55:     expect(rendered).toContain(manifest.slides[0].slideSubmitterId);
  + tests/case-page.render.test.ts:56:     expect(rendered).toContain(manifest.slides[0].viewerHandoff.url);

9 assertion change(s) flagged
```
- Manually noted because `diff-check` does not report untracked files: `tests/slide-list-section.render.test.ts:13-14`, `22-26`, and `32-33` add new assertions for manifest-driven handoff and slide-list rendering.

## Assumptions / Interpretations
- I modeled the new handoff as `PublicViewerHandoff = { kind: "external"; provider: "gdc"; url: string }` and bound `url` to `SlideReference.publicPageUrl`. Alternative: collapse this into `publicPageUrl` directly or point the handoff at the download URL instead.
- I kept `publicPageUrl` and `publicDownloadUrl` on `SlideReference` and extended the type with `viewerHandoff` rather than replacing the existing fields, because the task said to extend the current open GDC slide reference.
- I kept per-slide rendering inside `renderSlideListSection` plus a separate `renderSlideViewerHandoff` helper instead of introducing a third `renderSlideListItem` function, to keep the initial wish graph minimal.

## Notes
- `bun test` now reports `85 pass / 4 fail`. The failing tests are `tests/slide-list-section.render.test.ts` (3) and `tests/case-page.render.test.ts` (1), which is the expected stub frontier for the new slide UI/handoff behavior.
- The structural contract work is in place: the checked-in manifest, `validateSlideReference`, and `validateCaseManifest` all now accept and preserve the bounded `viewerHandoff` block.
- The working tree already had unrelated changes outside this task (`.htdp/*`, `AGENTS.md`, and `tests/single-case-static-app.render.test.ts`).
