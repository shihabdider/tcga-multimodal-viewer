import { readFile } from "node:fs/promises";

import type {
  CaseId,
  CaseManifest,
  CaseMetadata,
  CopyNumberHighlight,
  ExpressionHighlight,
  GenomicSnapshot,
  MutationHighlight,
  PublicViewerHandoff,
  SlideReference,
  SourceFileReference,
} from "../contracts/case-manifest";
import type { CohortIndexManifest } from "../contracts/cohort-index";
import type { CohortManifest } from "../contracts/cohort-manifest";
import type {
  IdcSlimViewerHandoffSeed,
  ManifestJsonFile,
  TinyCaseExportRecipe,
  TinyCohortExportRecipe,
  TinyCohortManifestExport,
  TinyMutationSelector,
} from "../contracts/tiny-cohort-export";
import { validateTinyCohortExportRecipe } from "../contracts/tiny-cohort-export.validation";

export const DEFAULT_TINY_COHORT_EXPORT_RECIPE_PATH =
  "manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
export const DEFAULT_TINY_COHORT_EXPORT_OUTPUT_DIRECTORY =
  "dist/tcga-brca-manifest-export";
export const DEFAULT_COHORT_INDEX_OUTPUT_PATH =
  "tcga-brca.tiny-cohort-index.json";

export interface TinyCohortExportPaths {
  recipePath: string;
  outputDirectory: string;
}

export async function loadTinyCohortExportRecipeFromFile(
  recipePath: string,
): Promise<TinyCohortExportRecipe> {
  const recipeJson = await readFile(recipePath, "utf8");
  const parsedRecipe = JSON.parse(recipeJson) as unknown;

  return validateTinyCohortExportRecipe(parsedRecipe);
}

export async function fetchPublicCaseMetadata(
  caseId: CaseId,
): Promise<CaseMetadata> {
  const endpointUrl = new URL("https://api.gdc.cancer.gov/cases");

  endpointUrl.searchParams.set(
    "filters",
    JSON.stringify({
      op: "in",
      content: {
        field: "submitter_id",
        value: [caseId],
      },
    }),
  );
  endpointUrl.searchParams.set(
    "expand",
    "demographic,diagnoses,samples,project",
  );
  endpointUrl.searchParams.set("size", "2");

  const endpoint = endpointUrl.toString();
  const describeError = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);
  const readRecord = (value: unknown, path: string): Record<string, unknown> => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error(`${path} must be an object`);
    }

    return value as Record<string, unknown>;
  };
  const readRecordArray = (
    value: unknown,
    path: string,
  ): Record<string, unknown>[] => {
    if (!Array.isArray(value)) {
      throw new Error(`${path} must be an array`);
    }

    return value.map((entry, index) => readRecord(entry, `${path}[${index}]`));
  };
  const readNonEmptyString = (
    record: Record<string, unknown>,
    fieldName: string,
    path: string,
  ): string => {
    const value = record[fieldName];

    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${path} must be a non-empty string`);
    }

    return value;
  };
  const boundedPrimaryTumorSamplePattern = new RegExp(
    `^${caseId.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}-\\d{2}[A-Y]$`,
  );

  let response: Response;

  try {
    response = await fetch(endpoint);
  } catch (error) {
    throw new Error(
      `Failed to fetch public GDC case metadata ${caseId}: ${describeError(error)}`,
    );
  }

  if (!response.ok) {
    const statusSuffix = response.statusText ? ` ${response.statusText}` : "";

    throw new Error(
      `Failed to fetch public GDC case metadata ${caseId}: ${response.status}${statusSuffix}`,
    );
  }

  let responseJson: unknown;

  try {
    responseJson = await response.json();
  } catch (error) {
    throw new Error(
      `Public GDC case metadata ${caseId} is malformed: ${describeError(error)}`,
    );
  }

  if (
    typeof responseJson !== "object" ||
    responseJson === null ||
    Array.isArray(responseJson)
  ) {
    throw new Error(
      `Public GDC case metadata ${caseId} is malformed: response body must be an object`,
    );
  }

  const { data } = responseJson as { data?: unknown };

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(
      `Public GDC case metadata ${caseId} is malformed: response.data must be an object`,
    );
  }

  const { validateCaseMetadata } = await import(
    "../contracts/case-manifest.validation"
  );

  try {
    const dataRecord = data as Record<string, unknown>;
    const hits = readRecordArray(dataRecord.hits, "response.data.hits");

    if (hits.length !== 1) {
      throw new Error(
        `response.data.hits must contain exactly one case for submitter_id ${caseId}`,
      );
    }

    const caseRecord = hits[0];
    const responseCaseId = readNonEmptyString(
      caseRecord,
      "submitter_id",
      "response.data.hits[0].submitter_id",
    );

    if (responseCaseId !== caseId) {
      throw new Error(
        `response.data.hits[0].submitter_id must match requested caseId ${caseId}`,
      );
    }

    const gdcCaseId = readNonEmptyString(
      caseRecord,
      "case_id",
      "response.data.hits[0].case_id",
    );
    const primarySite = readNonEmptyString(
      caseRecord,
      "primary_site",
      "response.data.hits[0].primary_site",
    );
    const diseaseType = readNonEmptyString(
      caseRecord,
      "disease_type",
      "response.data.hits[0].disease_type",
    );
    const projectRecord = readRecord(
      caseRecord.project,
      "response.data.hits[0].project",
    );
    const demographicRecord = readRecord(
      caseRecord.demographic,
      "response.data.hits[0].demographic",
    );
    const projectId = readNonEmptyString(
      projectRecord,
      "project_id",
      "response.data.hits[0].project.project_id",
    );
    const gender = readNonEmptyString(
      demographicRecord,
      "gender",
      "response.data.hits[0].demographic.gender",
    );
    const diagnosisRecords = readRecordArray(
      caseRecord.diagnoses,
      "response.data.hits[0].diagnoses",
    );
    const primaryDiagnosisCandidates = diagnosisRecords.flatMap((diagnosis) => {
      const primaryDiagnosis = diagnosis.primary_diagnosis;
      const isPrimaryDiagnosis =
        diagnosis.diagnosis_is_primary_disease === true ||
        diagnosis.classification_of_tumor === "primary";

      if (
        !isPrimaryDiagnosis ||
        typeof primaryDiagnosis !== "string" ||
        primaryDiagnosis.trim().length === 0
      ) {
        return [];
      }

      return [primaryDiagnosis];
    });

    if (primaryDiagnosisCandidates.length !== 1) {
      throw new Error(
        "response.data.hits[0].diagnoses must contain exactly one primary diagnosis",
      );
    }

    const sampleRecords = readRecordArray(
      caseRecord.samples,
      "response.data.hits[0].samples",
    );
    const boundedPrimaryTumorSamples = sampleRecords.flatMap((sample) => {
      const submitterId = sample.submitter_id;

      if (
        sample.sample_type !== "Primary Tumor" ||
        typeof submitterId !== "string" ||
        submitterId.trim().length === 0 ||
        !boundedPrimaryTumorSamplePattern.test(submitterId)
      ) {
        return [];
      }

      return [submitterId];
    });

    if (boundedPrimaryTumorSamples.length !== 1) {
      throw new Error(
        "response.data.hits[0].samples must resolve to exactly one bounded primary tumor sample",
      );
    }

    return validateCaseMetadata({
      caseId,
      gdcCaseId,
      projectId,
      primarySite,
      diseaseType,
      primaryDiagnosis: primaryDiagnosisCandidates[0],
      gender,
      tumorSampleId: boundedPrimaryTumorSamples[0],
    });
  } catch (error) {
    throw new Error(
      `Public GDC case metadata ${caseId} is malformed: ${describeError(error)}`,
    );
  }
}

export async function fetchPublicSourceFileReference(
  fileId: string,
): Promise<SourceFileReference> {
  const endpoint = `https://api.gdc.cancer.gov/files/${fileId}?expand=analysis`;
  const describeError = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

  let response: Response;

  try {
    response = await fetch(endpoint);
  } catch (error) {
    throw new Error(
      `Failed to fetch public GDC file metadata ${fileId}: ${describeError(error)}`,
    );
  }

  if (!response.ok) {
    const statusSuffix = response.statusText ? ` ${response.statusText}` : "";

    throw new Error(
      `Failed to fetch public GDC file metadata ${fileId}: ${response.status}${statusSuffix}`,
    );
  }

  let responseJson: unknown;

  try {
    responseJson = await response.json();
  } catch (error) {
    throw new Error(
      `Public GDC file metadata ${fileId} is malformed: ${describeError(error)}`,
    );
  }

  if (
    typeof responseJson !== "object" ||
    responseJson === null ||
    Array.isArray(responseJson)
  ) {
    throw new Error(
      `Public GDC file metadata ${fileId} is malformed: response body must be an object`,
    );
  }

  const { data } = responseJson as { data?: unknown };

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(
      `Public GDC file metadata ${fileId} is malformed: response.data must be an object`,
    );
  }

  const {
    access,
    file_id: responseFileId,
    file_name: fileName,
    data_type: dataType,
    analysis,
  } = data as {
    access?: unknown;
    file_id?: unknown;
    file_name?: unknown;
    data_type?: unknown;
    analysis?: unknown;
  };

  if (access !== "open") {
    throw new Error(`Public GDC file ${fileId} must have open access`);
  }

  const workflow =
    typeof analysis === "object" && analysis !== null && !Array.isArray(analysis)
      ? (analysis as { workflow_type?: unknown }).workflow_type
      : undefined;
  const { validateSourceFileReference } = await import(
    "../contracts/case-manifest.validation"
  );

  try {
    return validateSourceFileReference({
      fileId: responseFileId,
      fileName,
      dataType,
      workflow,
    });
  } catch (error) {
    throw new Error(
      `Public GDC file metadata ${fileId} is malformed: ${describeError(error)}`,
    );
  }
}

export async function fetchPublicSlideReferenceBase(
  fileId: string,
): Promise<Omit<SlideReference, "viewerHandoff">> {
  const endpoint = `https://api.gdc.cancer.gov/files/${fileId}?expand=cases.samples.portions.slides`;
  const describeError = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);
  const readFirstRecord = (value: unknown, path: string): Record<string, unknown> => {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`response.data.${path} must be a non-empty array`);
    }

    const firstValue = value[0];

    if (
      typeof firstValue !== "object" ||
      firstValue === null ||
      Array.isArray(firstValue)
    ) {
      throw new Error(`response.data.${path}[0] must be an object`);
    }

    return firstValue as Record<string, unknown>;
  };
  const inferSampleTypeFromSlideSubmitterId = (
    slideSubmitterId: unknown,
  ): string | undefined => {
    if (typeof slideSubmitterId !== "string") {
      return undefined;
    }

    const sampleTypeByCode: Record<string, string> = {
      "01": "Primary Tumor",
      "02": "Recurrent Tumor",
      "03": "Primary Blood Derived Cancer - Peripheral Blood",
      "04": "Recurrent Blood Derived Cancer - Bone Marrow",
      "05": "Additional - New Primary",
      "06": "Metastatic",
      "07": "Additional Metastatic",
      "08": "Human Tumor Original Cells",
      "09": "Primary Blood Derived Cancer - Bone Marrow",
      "10": "Blood Derived Normal",
      "11": "Solid Tissue Normal",
      "12": "Buccal Cell Normal",
      "13": "EBV Immortalized Normal",
      "14": "Bone Marrow Normal",
      "20": "Control Analyte",
      "40": "Recurrent Blood Derived Cancer - Peripheral Blood",
      "50": "Cell Lines",
      "60": "Primary Xenograft Tissue",
      "61": "Cell Line Derived Xenograft Tissue",
    };
    const barcodeParts = slideSubmitterId.split("-");
    const sampleDescriptor = barcodeParts[3];
    const sampleTypeCode = sampleDescriptor?.slice(0, 2);

    return sampleTypeCode ? sampleTypeByCode[sampleTypeCode] : undefined;
  };

  let response: Response;

  try {
    response = await fetch(endpoint);
  } catch (error) {
    throw new Error(
      `Failed to fetch public GDC slide file metadata ${fileId}: ${describeError(error)}`,
    );
  }

  if (!response.ok) {
    const statusSuffix = response.statusText ? ` ${response.statusText}` : "";

    throw new Error(
      `Failed to fetch public GDC slide file metadata ${fileId}: ${response.status}${statusSuffix}`,
    );
  }

  let responseJson: unknown;

  try {
    responseJson = await response.json();
  } catch (error) {
    throw new Error(
      `Public GDC slide file metadata ${fileId} is malformed: ${describeError(error)}`,
    );
  }

  if (
    typeof responseJson !== "object" ||
    responseJson === null ||
    Array.isArray(responseJson)
  ) {
    throw new Error(
      `Public GDC slide file metadata ${fileId} is malformed: response body must be an object`,
    );
  }

  const { data } = responseJson as { data?: unknown };

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error(
      `Public GDC slide file metadata ${fileId} is malformed: response.data must be an object`,
    );
  }

  const dataRecord = data as Record<string, unknown>;
  const access = dataRecord.access;

  if (access !== "open") {
    throw new Error(`Public GDC slide file ${fileId} must have open access`);
  }

  const { validateSlideReference } = await import(
    "../contracts/case-manifest.validation"
  );

  try {
    const caseRecord = readFirstRecord(dataRecord.cases, "cases");
    const sampleRecord = readFirstRecord(caseRecord.samples, "cases[0].samples");
    const portionRecord = readFirstRecord(
      sampleRecord.portions,
      "cases[0].samples[0].portions",
    );
    const slideRecord = readFirstRecord(
      portionRecord.slides,
      "cases[0].samples[0].portions[0].slides",
    );
    const sampleType =
      typeof sampleRecord.sample_type === "string" &&
      sampleRecord.sample_type.trim().length > 0
        ? sampleRecord.sample_type
        : inferSampleTypeFromSlideSubmitterId(slideRecord.submitter_id);
    const validatedSlideReference = validateSlideReference({
      source: "gdc",
      access,
      fileId: dataRecord.file_id,
      fileName: dataRecord.file_name,
      slideSubmitterId: slideRecord.submitter_id,
      slideId: slideRecord.slide_id,
      sampleType,
      experimentalStrategy: dataRecord.experimental_strategy,
      publicPageUrl:
        typeof dataRecord.file_id === "string"
          ? `https://portal.gdc.cancer.gov/files/${dataRecord.file_id}`
          : undefined,
      publicDownloadUrl:
        typeof dataRecord.file_id === "string"
          ? `https://api.gdc.cancer.gov/data/${dataRecord.file_id}`
          : undefined,
      viewerHandoff: {
        kind: "external",
        provider: "idc-slim",
        studyInstanceUid: "1.2.3",
        seriesInstanceUid: "1.2.3.4",
        url: "https://viewer.imaging.datacommons.cancer.gov/slim/studies/1.2.3/series/1.2.3.4",
      },
    });
    const { viewerHandoff: _viewerHandoff, ...slideReferenceBase } =
      validatedSlideReference;

    return slideReferenceBase;
  } catch (error) {
    throw new Error(
      `Public GDC slide file metadata ${fileId} is malformed: ${describeError(error)}`,
    );
  }
}

export async function downloadOpenGdcFileText(fileId: string): Promise<string> {
  const endpoint = `https://api.gdc.cancer.gov/data/${fileId}`;
  const describeError = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

  let response: Response;

  try {
    response = await fetch(endpoint);
  } catch (error) {
    throw new Error(
      `Failed to download open GDC file ${fileId}: ${describeError(error)}`,
    );
  }

  if (!response.ok) {
    const statusSuffix = response.statusText ? ` ${response.statusText}` : "";

    throw new Error(
      `Failed to download open GDC file ${fileId}: ${response.status}${statusSuffix}`,
    );
  }

  const responseBytes = new Uint8Array(await response.arrayBuffer());
  const isGzipEncoded =
    responseBytes.length >= 2 &&
    responseBytes[0] === 0x1f &&
    responseBytes[1] === 0x8b;
  const fileText = isGzipEncoded
    ? (await import("node:zlib")).gunzipSync(responseBytes).toString("utf8")
    : new TextDecoder().decode(responseBytes);

  if (fileText.trim().length === 0) {
    throw new Error(
      `Downloaded open GDC file ${fileId} must contain non-empty text`,
    );
  }

  return fileText;
}

export function selectMutationHighlights(
  fileContents: string,
  selectors: TinyMutationSelector[],
): MutationHighlight[] {
  if (selectors.length === 0) {
    return [];
  }

  const lines = fileContents
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const headerLine = lines.find((line) => !line.startsWith("#"));

  if (!headerLine) {
    throw new Error("Mutation source file is missing header line");
  }

  const headerColumns = headerLine.split("\t");
  const geneSymbolIndex = headerColumns.indexOf("Hugo_Symbol");
  const proteinChangeIndex = headerColumns.indexOf("HGVSp_Short");
  const variantClassificationIndex = headerColumns.indexOf(
    "Variant_Classification",
  );
  const impactIndex = headerColumns.indexOf("IMPACT");

  if (
    geneSymbolIndex < 0 ||
    proteinChangeIndex < 0 ||
    variantClassificationIndex < 0 ||
    impactIndex < 0
  ) {
    throw new Error(
      "Mutation source file must include Hugo_Symbol, HGVSp_Short, Variant_Classification, and IMPACT columns",
    );
  }

  const buildSelectorKey = (
    geneSymbol: string,
    proteinChange: string,
    variantClassification: string,
  ): string => JSON.stringify([geneSymbol, proteinChange, variantClassification]);

  const requestedSelectorKeys = new Set(
    selectors.map((selector) =>
      buildSelectorKey(
        selector.geneSymbol,
        selector.proteinChange,
        selector.variantClassification,
      ),
    ),
  );
  const matchesBySelector = new Map<string, MutationHighlight[]>();
  let headerSeen = false;

  for (const line of lines) {
    if (line.startsWith("#")) {
      continue;
    }

    if (!headerSeen) {
      headerSeen = true;
      continue;
    }

    const columns = line.split("\t");
    const geneSymbol = columns[geneSymbolIndex];
    const proteinChange = columns[proteinChangeIndex];
    const variantClassification = columns[variantClassificationIndex];
    const selectorKey = buildSelectorKey(
      geneSymbol,
      proteinChange,
      variantClassification,
    );

    if (!requestedSelectorKeys.has(selectorKey)) {
      continue;
    }

    const impact = columns[impactIndex]?.trim();

    if (
      impact !== "HIGH" &&
      impact !== "MODERATE" &&
      impact !== "LOW" &&
      impact !== "MODIFIER"
    ) {
      throw new Error(
        `Malformed IMPACT value for mutation ${geneSymbol} ${proteinChange} ${variantClassification}`,
      );
    }

    const matches = matchesBySelector.get(selectorKey) ?? [];
    matches.push({
      geneSymbol,
      proteinChange,
      variantClassification,
      impact,
    });
    matchesBySelector.set(selectorKey, matches);
  }

  return selectors.map((selector) => {
    const selectorKey = buildSelectorKey(
      selector.geneSymbol,
      selector.proteinChange,
      selector.variantClassification,
    );
    const matches = matchesBySelector.get(selectorKey);

    if (!matches || matches.length === 0) {
      throw new Error(
        `Missing mutation highlight for selector ${selector.geneSymbol} ${selector.proteinChange} ${selector.variantClassification}`,
      );
    }

    if (matches.length > 1) {
      throw new Error(
        `Ambiguous mutation highlight for selector ${selector.geneSymbol} ${selector.proteinChange} ${selector.variantClassification}`,
      );
    }

    return matches[0];
  });
}

function selectNumericGeneHighlights<THighlight>(
  fileContents: string,
  genePanel: string[],
  sourceLabel: "Expression" | "Copy-number",
  valueColumnName: "tpm_unstranded" | "copy_number",
  missingValueLabel: "expression" | "copy-number",
  buildHighlight: (geneSymbol: string, value: number) => THighlight,
): THighlight[] {
  if (genePanel.length === 0) {
    return [];
  }

  const lines = fileContents
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const headerLine = lines.find((line) => !line.startsWith("#"));

  if (!headerLine) {
    throw new Error(`${sourceLabel} source file is missing header line`);
  }

  const headerColumns = headerLine.split("\t");
  const geneNameIndex = headerColumns.indexOf("gene_name");
  const valueIndex = headerColumns.indexOf(valueColumnName);

  if (geneNameIndex < 0 || valueIndex < 0) {
    throw new Error(
      `${sourceLabel} source file must include gene_name and ${valueColumnName} columns`,
    );
  }

  const requestedGenes = new Set(genePanel);
  const valuesByGene = new Map<string, number>();
  let headerSeen = false;

  for (const line of lines) {
    if (line.startsWith("#")) {
      continue;
    }

    if (!headerSeen) {
      headerSeen = true;
      continue;
    }

    const columns = line.split("\t");
    const geneName = columns[geneNameIndex];

    if (!geneName || !requestedGenes.has(geneName)) {
      continue;
    }

    const rawValue = columns[valueIndex]?.trim();

    if (!rawValue) {
      throw new Error(`Malformed ${valueColumnName} value for gene ${geneName}`);
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Malformed ${valueColumnName} value for gene ${geneName}`);
    }

    valuesByGene.set(geneName, value);
  }

  return genePanel.map((geneSymbol) => {
    const value = valuesByGene.get(geneSymbol);

    if (value === undefined) {
      throw new Error(`Missing ${missingValueLabel} value for gene ${geneSymbol}`);
    }

    return buildHighlight(geneSymbol, value);
  });
}

export function selectExpressionHighlights(
  fileContents: string,
  genePanel: string[],
): ExpressionHighlight[] {
  return selectNumericGeneHighlights(
    fileContents,
    genePanel,
    "Expression",
    "tpm_unstranded",
    "expression",
    (geneSymbol, tpmUnstranded) => ({
      geneSymbol,
      tpmUnstranded,
    }),
  );
}

export function selectCopyNumberHighlights(
  fileContents: string,
  genePanel: string[],
): CopyNumberHighlight[] {
  return selectNumericGeneHighlights(
    fileContents,
    genePanel,
    "Copy-number",
    "copy_number",
    "copy-number",
    (geneSymbol, copyNumber) => ({
      geneSymbol,
      copyNumber,
    }),
  );
}

export function buildIdcSlimViewerHandoff(
  seed: IdcSlimViewerHandoffSeed,
): PublicViewerHandoff {
  const url = `https://viewer.imaging.datacommons.cancer.gov/slim/studies/${seed.studyInstanceUid}/series/${seed.seriesInstanceUid}`;

  return {
    kind: "external",
    provider: "idc-slim",
    studyInstanceUid: seed.studyInstanceUid,
    seriesInstanceUid: seed.seriesInstanceUid,
    url,
  };
}

export async function deriveGenomicSnapshot(
  caseRecipe: TinyCaseExportRecipe,
  expressionGenePanel: string[],
  copyNumberGenePanel: string[],
): Promise<GenomicSnapshot> {
  const {
    maskedSomaticMutation: maskedSomaticMutationFileId,
    geneExpression: geneExpressionFileId,
    geneLevelCopyNumber: geneLevelCopyNumberFileId,
  } = caseRecipe.selectedFileIds;

  const [maskedSomaticMutation, geneExpression, geneLevelCopyNumber] =
    await Promise.all([
      fetchPublicSourceFileReference(maskedSomaticMutationFileId),
      fetchPublicSourceFileReference(geneExpressionFileId),
      fetchPublicSourceFileReference(geneLevelCopyNumberFileId),
    ]);
  const [mutationFileContents, expressionFileContents, copyNumberFileContents] =
    await Promise.all([
      caseRecipe.mutationSelectors.length > 0
        ? downloadOpenGdcFileText(maskedSomaticMutationFileId)
        : Promise.resolve(""),
      expressionGenePanel.length > 0
        ? downloadOpenGdcFileText(geneExpressionFileId)
        : Promise.resolve(""),
      copyNumberGenePanel.length > 0
        ? downloadOpenGdcFileText(geneLevelCopyNumberFileId)
        : Promise.resolve(""),
    ]);

  return {
    sourceFiles: {
      maskedSomaticMutation,
      geneExpression,
      geneLevelCopyNumber,
    },
    mutationHighlights: selectMutationHighlights(
      mutationFileContents,
      caseRecipe.mutationSelectors,
    ),
    expressionMetric: "tpm_unstranded",
    expressionHighlights: selectExpressionHighlights(
      expressionFileContents,
      expressionGenePanel,
    ),
    copyNumberHighlights: selectCopyNumberHighlights(
      copyNumberFileContents,
      copyNumberGenePanel,
    ),
  };
}

export async function deriveSlideReference(
  caseRecipe: TinyCaseExportRecipe,
): Promise<SlideReference> {
  const slideReferenceBase = await fetchPublicSlideReferenceBase(
    caseRecipe.selectedFileIds.slide,
  );
  const viewerHandoff = buildIdcSlimViewerHandoff(caseRecipe.viewerHandoffSeed);
  const { validateSlideReference } = await import(
    "../contracts/case-manifest.validation"
  );

  return validateSlideReference({
    ...slideReferenceBase,
    viewerHandoff,
  });
}

export async function deriveCaseManifest(
  caseRecipe: TinyCaseExportRecipe,
  expressionGenePanel: string[],
  copyNumberGenePanel: string[],
): Promise<CaseManifest> {
  const [caseMetadata, genomicSnapshot, slideReference] = await Promise.all([
    fetchPublicCaseMetadata(caseRecipe.caseId),
    deriveGenomicSnapshot(
      caseRecipe,
      expressionGenePanel,
      copyNumberGenePanel,
    ),
    deriveSlideReference(caseRecipe),
  ]);
  const { validateCaseManifest } = await import(
    "../contracts/case-manifest.validation"
  );

  return validateCaseManifest({
    schemaVersion: "case-manifest/v1",
    case: caseMetadata,
    genomicSnapshot,
    slides: [slideReference],
  });
}

export function deriveCohortIndexManifest(
  recipe: TinyCohortExportRecipe,
  cohortManifest: CohortManifest,
  caseManifests: CaseManifest[],
): CohortIndexManifest {
  const recipeCaseIds = new Set(recipe.cases.map(({ caseId }) => caseId));
  const manifestsByCaseId = new Map<CaseId, CaseManifest>();

  for (const caseManifest of caseManifests) {
    const caseId = caseManifest.case.caseId;

    if (!recipeCaseIds.has(caseId)) {
      throw new Error(`Unexpected case manifest for non-recipe case ${caseId}`);
    }

    if (manifestsByCaseId.has(caseId)) {
      throw new Error(`Duplicate case manifest for case ${caseId}`);
    }

    if (caseManifest.case.projectId !== recipe.projectId) {
      throw new Error(`Case manifest ${caseId} does not match recipe.projectId`);
    }

    manifestsByCaseId.set(caseId, caseManifest);
  }

  if (cohortManifest.caseManifestPaths.length !== recipe.cases.length) {
    throw new Error(
      "CohortManifest.caseManifestPaths must line up one-to-one with recipe.cases",
    );
  }

  return {
    schemaVersion: "cohort-index/v1",
    cohortId: recipe.cohortId,
    projectId: recipe.projectId,
    title: recipe.title,
    description: recipe.description,
    cases: recipe.cases.map(({ caseId }, index) => {
      const caseManifest = manifestsByCaseId.get(caseId);

      if (!caseManifest) {
        throw new Error(`Missing case manifest for recipe case ${caseId}`);
      }

      const caseManifestPath = cohortManifest.caseManifestPaths[index];
      const expectedCaseManifestPath =
        `${caseManifest.case.caseId.toLowerCase()}.case-manifest.json`;

      if (caseManifestPath !== expectedCaseManifestPath) {
        throw new Error(
          `Cohort manifest path ${caseManifestPath} does not line up with recipe case ${caseId}`,
        );
      }

      return {
        caseId: caseManifest.case.caseId,
        href: `cases/${caseManifest.case.caseId.toLowerCase()}/index.html`,
        caseManifestPath,
        primaryDiagnosis: caseManifest.case.primaryDiagnosis,
        diseaseType: caseManifest.case.diseaseType,
        tumorSampleId: caseManifest.case.tumorSampleId,
        mutationHighlightGenes: caseManifest.genomicSnapshot.mutationHighlights.map(
          (highlight) => highlight.geneSymbol,
        ),
        slideCount: caseManifest.slides.length,
      };
    }),
  };
}

export function deriveCohortManifest(
  recipe: TinyCohortExportRecipe,
  caseManifests: CaseManifest[],
): CohortManifest {
  const recipeCaseIds = new Set(recipe.cases.map(({ caseId }) => caseId));
  const manifestsByCaseId = new Map<CaseId, CaseManifest>();

  for (const caseManifest of caseManifests) {
    const caseId = caseManifest.case.caseId;

    if (!recipeCaseIds.has(caseId)) {
      throw new Error(`Unexpected case manifest for non-recipe case ${caseId}`);
    }

    if (manifestsByCaseId.has(caseId)) {
      throw new Error(`Duplicate case manifest for case ${caseId}`);
    }

    if (caseManifest.case.projectId !== recipe.projectId) {
      throw new Error(`Case manifest ${caseId} does not match recipe.projectId`);
    }

    manifestsByCaseId.set(caseId, caseManifest);
  }

  return {
    schemaVersion: "cohort-manifest/v1",
    cohortId: recipe.cohortId,
    projectId: recipe.projectId,
    title: recipe.title,
    description: recipe.description,
    cohortIndexPath: DEFAULT_COHORT_INDEX_OUTPUT_PATH,
    caseManifestPaths: recipe.cases.map(({ caseId }) => {
      const caseManifest = manifestsByCaseId.get(caseId);

      if (!caseManifest) {
        throw new Error(`Missing case manifest for recipe case ${caseId}`);
      }

      return `${caseManifest.case.caseId.toLowerCase()}.case-manifest.json`;
    }),
  };
}

export function serializeNormalizedManifestJson(
  manifest: CaseManifest | CohortManifest | CohortIndexManifest,
): string {
  const normalizeSourceFileReference = (
    reference: SourceFileReference,
  ): SourceFileReference => ({
    fileId: reference.fileId,
    fileName: reference.fileName,
    dataType: reference.dataType,
    workflow: reference.workflow,
  });

  if ("case" in manifest) {
    return `${JSON.stringify(
      {
        schemaVersion: manifest.schemaVersion,
        case: {
          caseId: manifest.case.caseId,
          gdcCaseId: manifest.case.gdcCaseId,
          projectId: manifest.case.projectId,
          primarySite: manifest.case.primarySite,
          diseaseType: manifest.case.diseaseType,
          primaryDiagnosis: manifest.case.primaryDiagnosis,
          gender: manifest.case.gender,
          tumorSampleId: manifest.case.tumorSampleId,
        },
        genomicSnapshot: {
          sourceFiles: {
            maskedSomaticMutation: normalizeSourceFileReference(
              manifest.genomicSnapshot.sourceFiles.maskedSomaticMutation,
            ),
            geneExpression: normalizeSourceFileReference(
              manifest.genomicSnapshot.sourceFiles.geneExpression,
            ),
            geneLevelCopyNumber: normalizeSourceFileReference(
              manifest.genomicSnapshot.sourceFiles.geneLevelCopyNumber,
            ),
          },
          mutationHighlights: manifest.genomicSnapshot.mutationHighlights.map(
            (highlight) => ({
              geneSymbol: highlight.geneSymbol,
              proteinChange: highlight.proteinChange,
              variantClassification: highlight.variantClassification,
              impact: highlight.impact,
            }),
          ),
          expressionMetric: manifest.genomicSnapshot.expressionMetric,
          expressionHighlights: manifest.genomicSnapshot.expressionHighlights.map(
            (highlight) => ({
              geneSymbol: highlight.geneSymbol,
              tpmUnstranded: highlight.tpmUnstranded,
            }),
          ),
          copyNumberHighlights: manifest.genomicSnapshot.copyNumberHighlights.map(
            (highlight) => ({
              geneSymbol: highlight.geneSymbol,
              copyNumber: highlight.copyNumber,
            }),
          ),
        },
        slides: manifest.slides.map((slide) => ({
          source: slide.source,
          access: slide.access,
          fileId: slide.fileId,
          fileName: slide.fileName,
          slideSubmitterId: slide.slideSubmitterId,
          slideId: slide.slideId,
          sampleType: slide.sampleType,
          experimentalStrategy: slide.experimentalStrategy,
          publicPageUrl: slide.publicPageUrl,
          publicDownloadUrl: slide.publicDownloadUrl,
          viewerHandoff: {
            kind: slide.viewerHandoff.kind,
            provider: slide.viewerHandoff.provider,
            studyInstanceUid: slide.viewerHandoff.studyInstanceUid,
            seriesInstanceUid: slide.viewerHandoff.seriesInstanceUid,
            url: slide.viewerHandoff.url,
          },
        })),
      },
      null,
      2,
    )}\n`;
  }

  if ("cases" in manifest) {
    throw new Error("not implemented: serializeNormalizedManifestJson<CohortIndexManifest>");
  }

  return `${JSON.stringify(
    {
      schemaVersion: manifest.schemaVersion,
      cohortId: manifest.cohortId,
      projectId: manifest.projectId,
      title: manifest.title,
      description: manifest.description,
      cohortIndexPath: manifest.cohortIndexPath,
      caseManifestPaths: [...manifest.caseManifestPaths],
    },
    null,
    2,
  )}\n`;
}

export async function writeManifestJsonFiles(
  outputDirectory: string,
  cohortManifest: CohortManifest,
  caseManifests: CaseManifest[],
): Promise<ManifestJsonFile[]> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const cohortOutputPath = "tcga-brca.tiny-cohort-manifest.json";
  const expectedCaseManifestPaths = new Set(cohortManifest.caseManifestPaths);
  const caseManifestsByOutputPath = new Map<string, CaseManifest>();

  for (const caseManifest of caseManifests) {
    const outputPath = `${caseManifest.case.caseId.toLowerCase()}.case-manifest.json`;

    if (!expectedCaseManifestPaths.has(outputPath)) {
      throw new Error(`Unexpected case manifest for cohort path ${outputPath}`);
    }

    if (caseManifestsByOutputPath.has(outputPath)) {
      throw new Error(`Duplicate case manifest for cohort path ${outputPath}`);
    }

    caseManifestsByOutputPath.set(outputPath, caseManifest);
  }

  const files: ManifestJsonFile[] = [
    {
      outputPath: cohortOutputPath,
      content: serializeNormalizedManifestJson(cohortManifest),
    },
    ...cohortManifest.caseManifestPaths.map((outputPath) => {
      const caseManifest = caseManifestsByOutputPath.get(outputPath);

      if (!caseManifest) {
        throw new Error(`Missing case manifest for cohort path ${outputPath}`);
      }

      return {
        outputPath,
        content: serializeNormalizedManifestJson(caseManifest),
      };
    }),
  ];

  await mkdir(outputDirectory, { recursive: true });

  for (const file of files) {
    await writeFile(join(outputDirectory, file.outputPath), file.content, "utf8");
  }

  return files;
}

export async function exportTinyCohortManifests(
  paths: TinyCohortExportPaths,
): Promise<TinyCohortManifestExport> {
  const recipe = await loadTinyCohortExportRecipeFromFile(paths.recipePath);
  const caseManifests = await Promise.all(
    recipe.cases.map((caseRecipe) =>
      deriveCaseManifest(
        caseRecipe,
        recipe.expressionGenePanel,
        recipe.copyNumberGenePanel,
      ),
    ),
  );
  const cohortManifest = deriveCohortManifest(recipe, caseManifests);
  const files = await writeManifestJsonFiles(
    paths.outputDirectory,
    cohortManifest,
    caseManifests,
  );

  return {
    outputDirectory: paths.outputDirectory,
    cohortManifest,
    caseManifests,
    files,
  };
}

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<void> {
  const [
    recipePath = DEFAULT_TINY_COHORT_EXPORT_RECIPE_PATH,
    outputDirectory = DEFAULT_TINY_COHORT_EXPORT_OUTPUT_DIRECTORY,
  ] = argv;

  await exportTinyCohortManifests({
    recipePath,
    outputDirectory,
  });
}

if (import.meta.main) {
  await main();
}
