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
  throw new Error("not implemented: downloadOpenGdcFileText");
}

export function selectMutationHighlights(
  fileContents: string,
  selectors: TinyMutationSelector[],
): MutationHighlight[] {
  throw new Error("not implemented: selectMutationHighlights");
}

export function selectExpressionHighlights(
  fileContents: string,
  genePanel: string[],
): ExpressionHighlight[] {
  throw new Error("not implemented: selectExpressionHighlights");
}

export function selectCopyNumberHighlights(
  fileContents: string,
  genePanel: string[],
): CopyNumberHighlight[] {
  throw new Error("not implemented: selectCopyNumberHighlights");
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
