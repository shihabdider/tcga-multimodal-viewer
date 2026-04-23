import type { CohortManifest } from "./cohort-manifest";

export function validateCohortManifest(value: unknown): CohortManifest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("CohortManifest must be an object");
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.schemaVersion !== "cohort-manifest/v1") {
    throw new Error('CohortManifest.schemaVersion must be "cohort-manifest/v1"');
  }

  const requireNonEmptyString = (
    field: "cohortId" | "title" | "description",
  ): string => {
    const fieldValue = candidate[field];

    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      throw new Error(`CohortManifest.${field} must be a non-empty string`);
    }

    return fieldValue;
  };

  const cohortId = requireNonEmptyString("cohortId");

  if (candidate.projectId !== "TCGA-BRCA") {
    throw new Error('CohortManifest.projectId must be "TCGA-BRCA"');
  }

  const title = requireNonEmptyString("title");
  const description = requireNonEmptyString("description");
  const cohortIndexPath = candidate.cohortIndexPath;

  if (
    typeof cohortIndexPath !== "string" ||
    cohortIndexPath.trim().length === 0
  ) {
    throw new Error("CohortManifest.cohortIndexPath must be a non-empty string");
  }

  if (!cohortIndexPath.endsWith("cohort-index.json")) {
    throw new Error(
      "CohortManifest.cohortIndexPath must end with cohort-index.json",
    );
  }

  const caseManifestPaths = candidate.caseManifestPaths;

  if (!Array.isArray(caseManifestPaths)) {
    throw new Error("CohortManifest.caseManifestPaths must be an array");
  }

  if (caseManifestPaths.length < 2) {
    throw new Error(
      "CohortManifest.caseManifestPaths must include at least two case manifests",
    );
  }

  const validatedPaths = caseManifestPaths.map((caseManifestPath, index) => {
    if (
      typeof caseManifestPath !== "string" ||
      caseManifestPath.trim().length === 0
    ) {
      throw new Error(
        `CohortManifest.caseManifestPaths[${index}] must be a non-empty string`,
      );
    }

    if (!caseManifestPath.endsWith(".case-manifest.json")) {
      throw new Error(
        `CohortManifest.caseManifestPaths[${index}] must end with .case-manifest.json`,
      );
    }

    return caseManifestPath;
  });

  if (new Set(validatedPaths).size !== validatedPaths.length) {
    throw new Error("CohortManifest.caseManifestPaths must be unique");
  }

  return {
    schemaVersion: "cohort-manifest/v1",
    cohortId,
    projectId: "TCGA-BRCA",
    title,
    description,
    cohortIndexPath,
    caseManifestPaths: validatedPaths,
  };
}
