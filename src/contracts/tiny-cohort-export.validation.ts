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
  throw new Error("not implemented: validateTinyMutationSelector");
}

export function validateTinyCaseSelectedFileIds(
  value: unknown,
): TinyCaseSelectedFileIds {
  throw new Error("not implemented: validateTinyCaseSelectedFileIds");
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
