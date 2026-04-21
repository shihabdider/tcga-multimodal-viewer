import type { CaseId, CaseManifest } from "./case-manifest";
import type { CohortManifest } from "./cohort-manifest";

export interface IdcSlimViewerHandoffSeed {
  provider: "idc-slim";
  studyInstanceUid: string;
  seriesInstanceUid: string;
}

export interface TinyMutationSelector {
  geneSymbol: string;
  proteinChange: string;
  variantClassification: string;
}

export interface TinyCaseSelectedFileIds {
  maskedSomaticMutation: string;
  geneExpression: string;
  geneLevelCopyNumber: string;
  slide: string;
}

export interface TinyCaseExportRecipe {
  caseId: CaseId;
  selectedFileIds: TinyCaseSelectedFileIds;
  mutationSelectors: TinyMutationSelector[];
  viewerHandoffSeed: IdcSlimViewerHandoffSeed;
}

export interface TinyCohortExportRecipe {
  schemaVersion: "tiny-cohort-export-recipe/v1";
  cohortId: string;
  projectId: "TCGA-BRCA";
  title: string;
  description: string;
  expressionGenePanel: string[];
  copyNumberGenePanel: string[];
  cases: TinyCaseExportRecipe[];
}

export interface ManifestJsonFile {
  outputPath: string;
  content: string;
}

export interface TinyCohortManifestExport {
  outputDirectory: string;
  cohortManifest: CohortManifest;
  caseManifests: CaseManifest[];
  files: ManifestJsonFile[];
}
