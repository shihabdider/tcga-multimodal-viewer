import type {
  IdcSlimViewerHandoffSeed,
  TinyCaseExportRecipe,
  TinyCaseSelectedFileIds,
  TinyCohortExportRecipe,
  TinyMutationSelector,
} from "./tiny-cohort-export";

export function validateIdcSlimViewerHandoffSeed(
  value: unknown,
): IdcSlimViewerHandoffSeed {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("IdcSlimViewerHandoffSeed must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const dicomUidPattern = /^\d+(?:\.\d+)*$/;

  if (candidate.provider !== "idc-slim") {
    throw new Error('IdcSlimViewerHandoffSeed.provider must be "idc-slim"');
  }

  if (
    typeof candidate.studyInstanceUid !== "string" ||
    !dicomUidPattern.test(candidate.studyInstanceUid)
  ) {
    throw new Error(
      "IdcSlimViewerHandoffSeed.studyInstanceUid must be a DICOM UID string",
    );
  }

  if (
    typeof candidate.seriesInstanceUid !== "string" ||
    !dicomUidPattern.test(candidate.seriesInstanceUid)
  ) {
    throw new Error(
      "IdcSlimViewerHandoffSeed.seriesInstanceUid must be a DICOM UID string",
    );
  }

  return {
    provider: "idc-slim",
    studyInstanceUid: candidate.studyInstanceUid,
    seriesInstanceUid: candidate.seriesInstanceUid,
  };
}

export function validateTinyMutationSelector(
  value: unknown,
): TinyMutationSelector {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("TinyMutationSelector must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const { geneSymbol, proteinChange, variantClassification } = candidate;

  if (typeof geneSymbol !== "string" || geneSymbol.trim() === "") {
    throw new Error("TinyMutationSelector.geneSymbol must be a non-empty string");
  }

  if (typeof proteinChange !== "string" || proteinChange.trim() === "") {
    throw new Error(
      "TinyMutationSelector.proteinChange must be a non-empty string",
    );
  }

  if (
    typeof variantClassification !== "string" ||
    variantClassification.trim() === ""
  ) {
    throw new Error(
      "TinyMutationSelector.variantClassification must be a non-empty string",
    );
  }

  return {
    geneSymbol,
    proteinChange,
    variantClassification,
  };
}

export function validateTinyCaseSelectedFileIds(
  value: unknown,
): TinyCaseSelectedFileIds {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("TinyCaseSelectedFileIds must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const requireUuidString = (
    field:
      | "maskedSomaticMutation"
      | "geneExpression"
      | "geneLevelCopyNumber"
      | "slide",
  ): string => {
    const fieldValue = candidate[field];

    if (typeof fieldValue !== "string" || !uuidPattern.test(fieldValue)) {
      throw new Error(`TinyCaseSelectedFileIds.${field} must be a UUID string`);
    }

    return fieldValue;
  };

  return {
    maskedSomaticMutation: requireUuidString("maskedSomaticMutation"),
    geneExpression: requireUuidString("geneExpression"),
    geneLevelCopyNumber: requireUuidString("geneLevelCopyNumber"),
    slide: requireUuidString("slide"),
  };
}

export function validateTinyCaseExportRecipe(
  value: unknown,
): TinyCaseExportRecipe {
  throw new Error("not implemented: validateTinyCaseExportRecipe");
}

export function validateTinyCohortExportRecipe(
  value: unknown,
): TinyCohortExportRecipe {
  throw new Error("not implemented: validateTinyCohortExportRecipe");
}
