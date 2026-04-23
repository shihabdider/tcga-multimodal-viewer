import type {
  CohortIndexEntry,
  CohortIndexManifest,
} from "./cohort-index";

export function validateCohortIndexManifest(
  value: unknown,
): CohortIndexManifest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("CohortIndexManifest must be an object");
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.schemaVersion !== "cohort-index/v1") {
    throw new Error(
      'CohortIndexManifest.schemaVersion must be "cohort-index/v1"',
    );
  }

  const requireNonEmptyString = (
    field: "cohortId" | "title" | "description",
  ): string => {
    const fieldValue = candidate[field];

    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      throw new Error(`CohortIndexManifest.${field} must be a non-empty string`);
    }

    return fieldValue;
  };

  if (candidate.projectId !== "TCGA-BRCA") {
    throw new Error('CohortIndexManifest.projectId must be "TCGA-BRCA"');
  }

  const cases = candidate.cases;

  if (!Array.isArray(cases)) {
    throw new Error("CohortIndexManifest.cases must be an array");
  }

  const caseIdPattern = /^TCGA-[A-Z0-9]{2}-[A-Z0-9]{4}$/;
  const validatedCases = cases.map((value, index): CohortIndexEntry => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`CohortIndexManifest.cases[${index}] must be an object`);
    }

    const entry = value as Record<string, unknown>;
    const readEntryString = (
      field:
        | "caseId"
        | "href"
        | "caseManifestPath"
        | "primaryDiagnosis"
        | "diseaseType"
        | "tumorSampleId",
    ): string => {
      const fieldValue = entry[field];

      if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
        throw new Error(
          `CohortIndexManifest.cases[${index}].${field} must be a non-empty string`,
        );
      }

      return fieldValue;
    };

    const caseId = readEntryString("caseId");

    if (!caseIdPattern.test(caseId)) {
      throw new Error(
        `CohortIndexManifest.cases[${index}].caseId must be a TCGA case identifier`,
      );
    }

    const href = readEntryString("href");

    if (!href.startsWith("cases/") || !href.endsWith("/index.html")) {
      throw new Error(
        `CohortIndexManifest.cases[${index}].href must target a static case page`,
      );
    }

    const caseManifestPath = readEntryString("caseManifestPath");

    if (!caseManifestPath.endsWith(".case-manifest.json")) {
      throw new Error(
        `CohortIndexManifest.cases[${index}].caseManifestPath must end with .case-manifest.json`,
      );
    }

    const mutationHighlightGenes = entry.mutationHighlightGenes;

    if (!Array.isArray(mutationHighlightGenes)) {
      throw new Error(
        `CohortIndexManifest.cases[${index}].mutationHighlightGenes must be an array`,
      );
    }

    const validatedMutationHighlightGenes = mutationHighlightGenes.map(
      (geneSymbol, geneIndex) => {
        if (typeof geneSymbol !== "string" || geneSymbol.trim().length === 0) {
          throw new Error(
            `CohortIndexManifest.cases[${index}].mutationHighlightGenes[${geneIndex}] must be a non-empty string`,
          );
        }

        return geneSymbol;
      },
    );

    const slideCount = entry.slideCount;

    if (
      typeof slideCount !== "number" ||
      !Number.isInteger(slideCount) ||
      slideCount < 0
    ) {
      throw new Error(
        `CohortIndexManifest.cases[${index}].slideCount must be a non-negative integer`,
      );
    }

    return {
      caseId: caseId as CohortIndexEntry["caseId"],
      href,
      caseManifestPath,
      primaryDiagnosis: readEntryString("primaryDiagnosis"),
      diseaseType: readEntryString("diseaseType"),
      tumorSampleId: readEntryString("tumorSampleId"),
      mutationHighlightGenes: validatedMutationHighlightGenes,
      slideCount,
    };
  });

  if (new Set(validatedCases.map(({ caseId }) => caseId)).size !== validatedCases.length) {
    throw new Error("CohortIndexManifest.cases must contain unique caseIds");
  }

  return {
    schemaVersion: "cohort-index/v1",
    cohortId: requireNonEmptyString("cohortId"),
    projectId: "TCGA-BRCA",
    title: requireNonEmptyString("title"),
    description: requireNonEmptyString("description"),
    cases: validatedCases,
  };
}
