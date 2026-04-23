export interface CohortManifest {
  schemaVersion: "cohort-manifest/v1";
  cohortId: string;
  projectId: "TCGA-BRCA";
  title: string;
  description: string;
  cohortIndexPath: string;
  caseManifestPaths: string[];
}
