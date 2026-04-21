# Status

phase: 2
layer: 3
updated: 2026-04-21T16:48:01.314Z

## Wishes

| wish | file | layer | status | time |
|------|------|-------|--------|------|
| validateIdcSlimViewerHandoffSeed | src/contracts/tiny-cohort-export.validation.ts | 3 | pass | 166.6s |
| validateTinyMutationSelector | src/contracts/tiny-cohort-export.validation.ts | 3 | pass | 148.8s |
| validateTinyCaseSelectedFileIds | src/contracts/tiny-cohort-export.validation.ts | 3 | pass | 170.8s |
| fetchPublicCaseMetadata | src/app/export-tiny-cohort-manifests.ts | 3 | pending | - |
| fetchPublicSourceFileReference | src/app/export-tiny-cohort-manifests.ts | 3 | pending | - |
| fetchPublicSlideReferenceBase | src/app/export-tiny-cohort-manifests.ts | 3 | pending | - |
| downloadOpenGdcFileText | src/app/export-tiny-cohort-manifests.ts | 3 | pending | - |
| selectMutationHighlights | src/app/export-tiny-cohort-manifests.ts | 3 | pending | - |
| selectExpressionHighlights | src/app/export-tiny-cohort-manifests.ts | 3 | pending | - |
| selectCopyNumberHighlights | src/app/export-tiny-cohort-manifests.ts | 3 | pending | - |
| buildIdcSlimViewerHandoff | src/app/export-tiny-cohort-manifests.ts | 3 | pass | 162.0s |
| deriveCohortManifest | src/app/export-tiny-cohort-manifests.ts | 3 | pending | - |
| serializeNormalizedManifestJson | src/app/export-tiny-cohort-manifests.ts | 3 | pass | 253.6s |
| validateTinyCaseExportRecipe | src/contracts/tiny-cohort-export.validation.ts | 2 | pending | - |
| deriveGenomicSnapshot | src/app/export-tiny-cohort-manifests.ts | 2 | pending | - |
| deriveSlideReference | src/app/export-tiny-cohort-manifests.ts | 2 | pending | - |
| writeManifestJsonFiles | src/app/export-tiny-cohort-manifests.ts | 2 | pending | - |
| validateTinyCohortExportRecipe | src/contracts/tiny-cohort-export.validation.ts | 1 | pending | - |
| deriveCaseManifest | src/app/export-tiny-cohort-manifests.ts | 1 | pending | - |
| exportTinyCohortManifests | src/app/export-tiny-cohort-manifests.ts | 0 | pending | - |

## Log

- 12:31:34 stubber complete, 20 wishes, 4 layers
- 12:31:34 stubber_post verification: pass
- 12:32:08 validateIdcSlimViewerHandoffSeed: running
- 12:34:54 validateIdcSlimViewerHandoffSeed: pass (166.6s, $0.3063)
- 12:34:55 implementer_post verification for validateIdcSlimViewerHandoffSeed: pass
- 12:34:59 validateTinyMutationSelector: running
- 12:37:28 validateTinyMutationSelector: pass (148.8s, $0.3468)
- 12:37:28 implementer_post verification for validateTinyMutationSelector: pass
- 12:37:33 validateTinyCaseSelectedFileIds: running
- 12:40:23 validateTinyCaseSelectedFileIds: pass (170.8s, $0.3750)
- 12:40:24 implementer_post verification for validateTinyCaseSelectedFileIds: pass
- 12:40:57 buildIdcSlimViewerHandoff: running
- 12:43:39 buildIdcSlimViewerHandoff: pass (162.0s, $0.3404)
- 12:43:40 implementer_post verification for buildIdcSlimViewerHandoff: pass
- 12:43:47 serializeNormalizedManifestJson: running
- 12:48:00 serializeNormalizedManifestJson: pass (253.6s, $0.3629)
- 12:48:01 implementer_post verification for serializeNormalizedManifestJson: pass
