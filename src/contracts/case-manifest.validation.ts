import type {
  CaseManifest,
  CaseMetadata,
  CopyNumberHighlight,
  ExpressionHighlight,
  GenomicSnapshot,
  MutationHighlight,
  PublicViewerHandoff,
  SlideReference,
  SourceFileReference,
} from "./case-manifest";

export function validateSourceFileReference(value: unknown): SourceFileReference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("SourceFileReference must be an object");
  }

  const { fileId, fileName, dataType, workflow } = value as {
    fileId?: unknown;
    fileName?: unknown;
    dataType?: unknown;
    workflow?: unknown;
  };

  if (typeof fileId !== "string" || fileId.trim().length === 0) {
    throw new Error("SourceFileReference.fileId must be a non-empty string");
  }

  if (typeof fileName !== "string" || fileName.trim().length === 0) {
    throw new Error("SourceFileReference.fileName must be a non-empty string");
  }

  if (typeof dataType !== "string" || dataType.trim().length === 0) {
    throw new Error("SourceFileReference.dataType must be a non-empty string");
  }

  if (typeof workflow !== "string" || workflow.trim().length === 0) {
    throw new Error("SourceFileReference.workflow must be a non-empty string");
  }

  return {
    fileId,
    fileName,
    dataType,
    workflow,
  };
}

export function validateCaseMetadata(value: unknown): CaseMetadata {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("CaseMetadata must be an object");
  }

  const record = value as Record<string, unknown>;
  const readRequiredString = (fieldName: keyof CaseMetadata): string => {
    const fieldValue = record[fieldName];

    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      throw new TypeError(`CaseMetadata.${fieldName} must be a non-empty string`);
    }

    return fieldValue;
  };

  const caseId = readRequiredString("caseId");
  if (!/^TCGA-[A-Z0-9]{2}-[A-Z0-9]{4}$/.test(caseId)) {
    throw new TypeError("CaseMetadata.caseId must be a TCGA case identifier");
  }

  const gdcCaseId = readRequiredString("gdcCaseId");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      gdcCaseId,
    )
  ) {
    throw new TypeError("CaseMetadata.gdcCaseId must be a UUID");
  }

  const projectId = readRequiredString("projectId");
  if (projectId !== "TCGA-BRCA") {
    throw new TypeError("CaseMetadata.projectId must be TCGA-BRCA");
  }

  const primarySite = readRequiredString("primarySite");
  const diseaseType = readRequiredString("diseaseType");
  const primaryDiagnosis = readRequiredString("primaryDiagnosis");
  const gender = readRequiredString("gender");
  const tumorSampleId = readRequiredString("tumorSampleId");

  if (!tumorSampleId.startsWith(`${caseId}-`)) {
    throw new TypeError(
      "CaseMetadata.tumorSampleId must anchor back to CaseMetadata.caseId",
    );
  }

  return {
    caseId: caseId as CaseMetadata["caseId"],
    gdcCaseId,
    projectId: "TCGA-BRCA",
    primarySite,
    diseaseType,
    primaryDiagnosis,
    gender,
    tumorSampleId,
  };
}

export function validateMutationHighlight(value: unknown): MutationHighlight {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("MutationHighlight must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const { geneSymbol, proteinChange, variantClassification, impact } = candidate;

  if (typeof geneSymbol !== "string" || geneSymbol.trim() === "") {
    throw new Error("MutationHighlight.geneSymbol must be a non-empty string");
  }

  if (typeof proteinChange !== "string" || proteinChange.trim() === "") {
    throw new Error("MutationHighlight.proteinChange must be a non-empty string");
  }

  if (
    typeof variantClassification !== "string" ||
    variantClassification.trim() === ""
  ) {
    throw new Error(
      "MutationHighlight.variantClassification must be a non-empty string",
    );
  }

  if (
    impact !== "HIGH" &&
    impact !== "MODERATE" &&
    impact !== "LOW" &&
    impact !== "MODIFIER"
  ) {
    throw new Error(
      "MutationHighlight.impact must be one of HIGH, MODERATE, LOW, or MODIFIER",
    );
  }

  return {
    geneSymbol,
    proteinChange,
    variantClassification,
    impact,
  };
}

export function validateExpressionHighlight(value: unknown): ExpressionHighlight {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("ExpressionHighlight must be an object");
  }

  const { geneSymbol, tpmUnstranded } = value as {
    geneSymbol?: unknown;
    tpmUnstranded?: unknown;
  };

  if (typeof geneSymbol !== "string" || geneSymbol.trim().length === 0) {
    throw new Error("ExpressionHighlight.geneSymbol must be a non-empty string");
  }

  if (
    typeof tpmUnstranded !== "number" ||
    !Number.isFinite(tpmUnstranded) ||
    tpmUnstranded < 0
  ) {
    throw new Error(
      "ExpressionHighlight.tpmUnstranded must be a finite non-negative number",
    );
  }

  return {
    geneSymbol,
    tpmUnstranded,
  };
}

export function validateCopyNumberHighlight(value: unknown): CopyNumberHighlight {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("CopyNumberHighlight must be an object");
  }

  const { geneSymbol, copyNumber } = value as {
    geneSymbol?: unknown;
    copyNumber?: unknown;
  };

  if (typeof geneSymbol !== "string" || geneSymbol.trim().length === 0) {
    throw new Error("CopyNumberHighlight.geneSymbol must be a non-empty string");
  }

  if (
    typeof copyNumber !== "number" ||
    !Number.isFinite(copyNumber) ||
    copyNumber < 0
  ) {
    throw new Error(
      "CopyNumberHighlight.copyNumber must be a finite non-negative number",
    );
  }

  return {
    geneSymbol,
    copyNumber,
  };
}

export function validateGenomicSnapshot(value: unknown): GenomicSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("GenomicSnapshot must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const sourceFiles = candidate.sourceFiles;

  if (
    typeof sourceFiles !== "object" ||
    sourceFiles === null ||
    Array.isArray(sourceFiles)
  ) {
    throw new Error("GenomicSnapshot.sourceFiles must be an object");
  }

  const mutationHighlights = candidate.mutationHighlights;
  if (!Array.isArray(mutationHighlights)) {
    throw new Error("GenomicSnapshot.mutationHighlights must be an array");
  }

  const expressionMetric = candidate.expressionMetric;
  if (expressionMetric !== "tpm_unstranded") {
    throw new Error(
      'GenomicSnapshot.expressionMetric must be "tpm_unstranded"',
    );
  }

  const expressionHighlights = candidate.expressionHighlights;
  if (!Array.isArray(expressionHighlights)) {
    throw new Error("GenomicSnapshot.expressionHighlights must be an array");
  }

  const copyNumberHighlights = candidate.copyNumberHighlights;
  if (!Array.isArray(copyNumberHighlights)) {
    throw new Error("GenomicSnapshot.copyNumberHighlights must be an array");
  }

  const sourceFileRecord = sourceFiles as Record<string, unknown>;

  return {
    sourceFiles: {
      maskedSomaticMutation: validateSourceFileReference(
        sourceFileRecord.maskedSomaticMutation,
      ),
      geneExpression: validateSourceFileReference(sourceFileRecord.geneExpression),
      geneLevelCopyNumber: validateSourceFileReference(
        sourceFileRecord.geneLevelCopyNumber,
      ),
    },
    mutationHighlights: mutationHighlights.map((highlight) =>
      validateMutationHighlight(highlight),
    ),
    expressionMetric,
    expressionHighlights: expressionHighlights.map((highlight) =>
      validateExpressionHighlight(highlight),
    ),
    copyNumberHighlights: copyNumberHighlights.map((highlight) =>
      validateCopyNumberHighlight(highlight),
    ),
  };
}

export function validatePublicViewerHandoff(
  value: unknown,
  publicPageUrl: string,
): PublicViewerHandoff {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("PublicViewerHandoff must be an object");
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.kind !== "external") {
    throw new Error('PublicViewerHandoff.kind must be "external"');
  }

  if (candidate.provider !== "gdc") {
    throw new Error('PublicViewerHandoff.provider must be "gdc"');
  }

  if (typeof candidate.url !== "string" || candidate.url.trim().length === 0) {
    throw new Error("PublicViewerHandoff.url must be a non-empty string");
  }

  if (candidate.url !== publicPageUrl) {
    throw new Error(
      "PublicViewerHandoff.url must match SlideReference.publicPageUrl",
    );
  }

  return {
    kind: "external",
    provider: "gdc",
    url: candidate.url,
  };
}

export function validateSlideReference(value: unknown): SlideReference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("SlideReference must be an object");
  }

  const candidate = value as Record<string, unknown>;
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const requireNonEmptyString = (
    field:
      | "fileName"
      | "slideSubmitterId"
      | "sampleType"
      | "publicPageUrl"
      | "publicDownloadUrl",
  ): string => {
    const fieldValue = candidate[field];

    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      throw new Error(`SlideReference.${field} must be a non-empty string`);
    }

    return fieldValue;
  };

  const requireUuidString = (field: "fileId" | "slideId"): string => {
    const fieldValue = candidate[field];

    if (typeof fieldValue !== "string" || !uuidPattern.test(fieldValue)) {
      throw new Error(`SlideReference.${field} must be a UUID string`);
    }

    return fieldValue;
  };

  const source = candidate.source;
  if (source !== "gdc") {
    throw new Error('SlideReference.source must be "gdc"');
  }

  const access = candidate.access;
  if (access !== "open") {
    throw new Error('SlideReference.access must be "open"');
  }

  const fileId = requireUuidString("fileId");
  const fileName = requireNonEmptyString("fileName");
  const slideSubmitterId = requireNonEmptyString("slideSubmitterId");
  const slideId = requireUuidString("slideId");
  const sampleType = requireNonEmptyString("sampleType");

  const experimentalStrategy = candidate.experimentalStrategy;
  if (
    experimentalStrategy !== "Diagnostic Slide" &&
    experimentalStrategy !== "Tissue Slide"
  ) {
    throw new Error(
      'SlideReference.experimentalStrategy must be "Diagnostic Slide" or "Tissue Slide"',
    );
  }

  const publicPageUrl = requireNonEmptyString("publicPageUrl");
  if (publicPageUrl !== `https://portal.gdc.cancer.gov/files/${fileId}`) {
    throw new Error(
      "SlideReference.publicPageUrl must be the GDC public file page for fileId",
    );
  }

  const publicDownloadUrl = requireNonEmptyString("publicDownloadUrl");
  if (publicDownloadUrl !== `https://api.gdc.cancer.gov/data/${fileId}`) {
    throw new Error(
      "SlideReference.publicDownloadUrl must be the GDC public download URL for fileId",
    );
  }

  const viewerHandoff = validatePublicViewerHandoff(
    candidate.viewerHandoff,
    publicPageUrl,
  );

  return {
    source,
    access,
    fileId,
    fileName,
    slideSubmitterId,
    slideId,
    sampleType,
    experimentalStrategy,
    publicPageUrl,
    publicDownloadUrl,
    viewerHandoff,
  };
}

export function validateCaseManifest(value: unknown): CaseManifest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("CaseManifest must be an object");
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.schemaVersion !== "case-manifest/v1") {
    throw new Error('CaseManifest.schemaVersion must be "case-manifest/v1"');
  }

  const slides = candidate.slides;
  if (!Array.isArray(slides)) {
    throw new Error("CaseManifest.slides must be an array");
  }

  return {
    schemaVersion: "case-manifest/v1",
    case: validateCaseMetadata(candidate.case),
    genomicSnapshot: validateGenomicSnapshot(candidate.genomicSnapshot),
    slides: slides.map((slide) => validateSlideReference(slide)),
  };
}
