import type { CaseId } from "./case-manifest";

export interface CohortIndexEntry {
  caseId: CaseId;
  href: string;
  caseManifestPath: string;
  primaryDiagnosis: string;
  diseaseType: string;
  tumorSampleId: string;
  mutationHighlightGenes: string[];
  slideCount: number;
}

export interface CohortIndexManifest {
  schemaVersion: "cohort-index/v1";
  cohortId: string;
  projectId: "TCGA-BRCA";
  title: string;
  description: string;
  cases: CohortIndexEntry[];
}
