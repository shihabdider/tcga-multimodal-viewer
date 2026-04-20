# Status

phase: 2
layer: 3
updated: 2026-04-20T20:58:11.457Z

## Wishes

| wish | file | layer | status | time |
|------|------|-------|--------|------|
| renderCaseMetadataSection | src/rendering/case-page.ts | 3 | running | - |
| renderMutationHighlightsSection | src/rendering/case-page.ts | 3 | pass | 241.8s |
| renderExpressionHighlightsSection | src/rendering/case-page.ts | 3 | fail | 200.9s |
| renderCopyNumberHighlightsSection | src/rendering/case-page.ts | 3 | fail | 204.7s |
| renderSingleCaseStylesheet | src/rendering/case-page.ts | 3 | pass | 167.1s |
| loadCaseManifestFromFile | src/app/build-single-case-static-app.ts | 3 | running | - |
| writeStaticAssets | src/app/build-single-case-static-app.ts | 3 | pass | 184.7s |
| renderGenomicSnapshotSection | src/rendering/case-page.ts | 2 | pending | - |
| renderCasePage | src/rendering/case-page.ts | 1 | pending | - |
| buildSingleCaseStaticApp | src/app/build-single-case-static-app.ts | 1 | pending | - |
| main | src/app/build-single-case-static-app.ts | 0 | pending | - |

## Log

- 16:53:29 stubber complete, 11 wishes, 4 layers
- 16:53:29 stubber_post verification: pass
- 16:54:09 renderCaseMetadataSection: running
- 16:54:09 renderMutationHighlightsSection: running
- 16:54:09 renderExpressionHighlightsSection: running
- 16:54:09 renderCopyNumberHighlightsSection: running
- 16:54:09 renderSingleCaseStylesheet: running
- 16:54:10 loadCaseManifestFromFile: running
- 16:54:10 writeStaticAssets: running
- 16:56:57 renderSingleCaseStylesheet: pass (167.1s, $0.3210)
- 16:56:57 implementer_post verification for renderSingleCaseStylesheet: pass
- 16:57:15 writeStaticAssets: pass (184.7s, $0.3302)
- 16:57:15 implementer_post verification for writeStaticAssets: pass
- 16:57:30 renderExpressionHighlightsSection: pass (200.9s, $0.3595)
- 16:57:30 implementer_post verification for renderExpressionHighlightsSection: fail
- 16:57:34 renderCopyNumberHighlightsSection: pass (204.7s, $0.4038)
- 16:57:34 implementer_post verification for renderCopyNumberHighlightsSection: fail
- 16:58:11 renderMutationHighlightsSection: pass (241.8s, $0.4734)
- 16:58:11 implementer_post verification for renderMutationHighlightsSection: pass
