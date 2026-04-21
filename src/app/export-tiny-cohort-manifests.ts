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
  throw new Error("not implemented: deriveCohortManifest");
}

export function serializeNormalizedManifestJson(
  manifest: CaseManifest | CohortManifest,
): string {
  throw new Error("not implemented: serializeNormalizedManifestJson");
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
