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
  throw new Error("not implemented: fetchPublicCaseMetadata");
}

export async function fetchPublicSourceFileReference(
  fileId: string,
): Promise<SourceFileReference> {
  throw new Error("not implemented: fetchPublicSourceFileReference");
}

export async function fetchPublicSlideReferenceBase(
  fileId: string,
): Promise<Omit<SlideReference, "viewerHandoff">> {
  throw new Error("not implemented: fetchPublicSlideReferenceBase");
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

export function selectExpressionHighlights(
  fileContents: string,
  genePanel: string[],
): ExpressionHighlight[] {
  if (genePanel.length === 0) {
    return [];
  }

  const lines = fileContents
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const headerLine = lines.find((line) => !line.startsWith("#"));

  if (!headerLine) {
    throw new Error("Expression source file is missing header line");
  }

  const headerColumns = headerLine.split("\t");
  const geneNameIndex = headerColumns.indexOf("gene_name");
  const tpmUnstrandedIndex = headerColumns.indexOf("tpm_unstranded");

  if (geneNameIndex < 0 || tpmUnstrandedIndex < 0) {
    throw new Error(
      "Expression source file must include gene_name and tpm_unstranded columns",
    );
  }

  const requestedGenes = new Set(genePanel);
  const expressionByGene = new Map<string, number>();
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

    const rawTpmUnstranded = columns[tpmUnstrandedIndex]?.trim();

    if (!rawTpmUnstranded) {
      throw new Error(`Malformed tpm_unstranded value for gene ${geneName}`);
    }

    const tpmUnstranded = Number(rawTpmUnstranded);

    if (!Number.isFinite(tpmUnstranded) || tpmUnstranded < 0) {
      throw new Error(`Malformed tpm_unstranded value for gene ${geneName}`);
    }

    expressionByGene.set(geneName, tpmUnstranded);
  }

  return genePanel.map((geneSymbol) => {
    const tpmUnstranded = expressionByGene.get(geneSymbol);

    if (tpmUnstranded === undefined) {
      throw new Error(`Missing expression value for gene ${geneSymbol}`);
    }

    return {
      geneSymbol,
      tpmUnstranded,
    };
  });
}

export function selectCopyNumberHighlights(
  fileContents: string,
  genePanel: string[],
): CopyNumberHighlight[] {
  if (genePanel.length === 0) {
    return [];
  }

  const lines = fileContents
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const headerLine = lines.find((line) => !line.startsWith("#"));

  if (!headerLine) {
    throw new Error("Copy-number source file is missing header line");
  }

  const headerColumns = headerLine.split("\t");
  const geneNameIndex = headerColumns.indexOf("gene_name");
  const copyNumberIndex = headerColumns.indexOf("copy_number");

  if (geneNameIndex < 0 || copyNumberIndex < 0) {
    throw new Error(
      "Copy-number source file must include gene_name and copy_number columns",
    );
  }

  const requestedGenes = new Set(genePanel);
  const copyNumberByGene = new Map<string, number>();
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

    const rawCopyNumber = columns[copyNumberIndex]?.trim();

    if (!rawCopyNumber) {
      throw new Error(`Malformed copy_number value for gene ${geneName}`);
    }

    const copyNumber = Number(rawCopyNumber);

    if (!Number.isFinite(copyNumber) || copyNumber < 0) {
      throw new Error(`Malformed copy_number value for gene ${geneName}`);
    }

    copyNumberByGene.set(geneName, copyNumber);
  }

  return genePanel.map((geneSymbol) => {
    const copyNumber = copyNumberByGene.get(geneSymbol);

    if (copyNumber === undefined) {
      throw new Error(`Missing copy-number value for gene ${geneSymbol}`);
    }

    return {
      geneSymbol,
      copyNumber,
    };
  });
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
  throw new Error("not implemented: deriveGenomicSnapshot");
}

export async function deriveSlideReference(
  caseRecipe: TinyCaseExportRecipe,
): Promise<SlideReference> {
  throw new Error("not implemented: deriveSlideReference");
}

export async function deriveCaseManifest(
  caseRecipe: TinyCaseExportRecipe,
  expressionGenePanel: string[],
  copyNumberGenePanel: string[],
): Promise<CaseManifest> {
  throw new Error("not implemented: deriveCaseManifest");
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
  manifest: CaseManifest | CohortManifest,
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

  return `${JSON.stringify(
    {
      schemaVersion: manifest.schemaVersion,
      cohortId: manifest.cohortId,
      projectId: manifest.projectId,
      title: manifest.title,
      description: manifest.description,
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
  throw new Error("not implemented: writeManifestJsonFiles");
}

export async function exportTinyCohortManifests(
  paths: TinyCohortExportPaths,
): Promise<TinyCohortManifestExport> {
  throw new Error("not implemented: exportTinyCohortManifests");
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
