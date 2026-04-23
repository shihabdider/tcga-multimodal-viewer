import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { CaseId, CaseManifest } from "../contracts/case-manifest";
import type { CohortIndexManifest } from "../contracts/cohort-index";
import type { CohortManifest } from "../contracts/cohort-manifest";
import { validateCohortIndexManifest } from "../contracts/cohort-index.validation";
import { validateCohortManifest } from "../contracts/cohort-manifest.validation";
import {
  loadCaseManifestFromFile,
  type StaticAsset,
  writeStaticAssets,
} from "./build-single-case-static-app";
import {
  renderCasePage,
  renderCohortIndexPage,
  renderSingleCaseStylesheet,
} from "../rendering/case-page";

export const DEFAULT_COHORT_MANIFEST_PATH =
  "manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
export const DEFAULT_OUTPUT_DIRECTORY = "dist/tcga-brca-tiny-cohort";

export interface TinyCohortBuildPaths {
  manifestPath: string;
  outputDirectory: string;
}

export interface TinyCohortStaticBuild {
  cohortId: string;
  outputDirectory: string;
  caseIds: CaseId[];
  assets: StaticAsset[];
}

interface LoadedCohortCase {
  manifestPath: string;
  manifest: CaseManifest;
}

export async function loadCohortManifestFromFile(
  manifestPath: string,
): Promise<CohortManifest> {
  const manifestJson = await readFile(manifestPath, "utf8");
  const parsedManifest = JSON.parse(manifestJson) as unknown;

  return validateCohortManifest(parsedManifest);
}

export async function loadCohortIndexManifestFromFile(
  manifestPath: string,
): Promise<CohortIndexManifest> {
  const manifestJson = await readFile(manifestPath, "utf8");
  const parsedManifest = JSON.parse(manifestJson) as unknown;

  return validateCohortIndexManifest(parsedManifest);
}

function buildCaseSlug(caseId: CaseId): string {
  return caseId.toLowerCase();
}

function buildCaseOutputPath(caseId: CaseId): string {
  return `cases/${buildCaseSlug(caseId)}/index.html`;
}

function buildIndexHref(caseId: CaseId): string {
  return `cases/${buildCaseSlug(caseId)}/index.html`;
}

function buildSiblingCaseHref(caseId: CaseId): string {
  return `../${buildCaseSlug(caseId)}/index.html`;
}

function assertLoadedCasesMatchCohort(
  cohortManifest: CohortManifest,
  loadedCases: LoadedCohortCase[],
): void {
  const caseIds = loadedCases.map(({ manifest }) => manifest.case.caseId);

  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error(
      "CohortManifest case manifests must resolve to unique CaseMetadata.caseId values",
    );
  }

  for (const { manifestPath, manifest } of loadedCases) {
    if (manifest.case.projectId !== cohortManifest.projectId) {
      throw new Error(
        `Case manifest ${manifestPath} does not match CohortManifest.projectId`,
      );
    }
  }
}

async function loadCohortCases(
  cohortManifestPath: string,
  cohortManifest: CohortManifest,
): Promise<LoadedCohortCase[]> {
  const manifestDirectory = dirname(cohortManifestPath);

  return Promise.all(
    cohortManifest.caseManifestPaths.map(async (relativeManifestPath) => {
      const manifestPath = join(manifestDirectory, relativeManifestPath);

      return {
        manifestPath,
        manifest: await loadCaseManifestFromFile(manifestPath),
      };
    }),
  );
}

export async function buildTinyCohortStaticApp(
  paths: TinyCohortBuildPaths,
): Promise<TinyCohortStaticBuild> {
  const cohortManifest = await loadCohortManifestFromFile(paths.manifestPath);
  const loadedCases = await loadCohortCases(paths.manifestPath, cohortManifest);

  assertLoadedCasesMatchCohort(cohortManifest, loadedCases);

  const assets: StaticAsset[] = [
    {
      outputPath: "index.html",
      contentType: "text/html",
      content: renderCohortIndexPage({
        title: cohortManifest.title,
        description: cohortManifest.description,
        cases: loadedCases.map(({ manifest }) => ({
          caseId: manifest.case.caseId,
          href: buildIndexHref(manifest.case.caseId),
          primaryDiagnosis: manifest.case.primaryDiagnosis,
          diseaseType: manifest.case.diseaseType,
          tumorSampleId: manifest.case.tumorSampleId,
          mutationHighlightGenes: manifest.genomicSnapshot.mutationHighlights.map(
            (highlight) => highlight.geneSymbol,
          ),
          slideCount: manifest.slides.length,
        })),
      }),
    },
    {
      outputPath: "styles.css",
      contentType: "text/css",
      content: renderSingleCaseStylesheet(),
    },
    ...loadedCases.map(({ manifest }) => ({
      outputPath: buildCaseOutputPath(manifest.case.caseId),
      contentType: "text/html" as const,
      content: renderCasePage(manifest, {
        stylesheetHref: "../../styles.css",
        navigation: {
          cohortTitle: cohortManifest.title,
          cohortIndexHref: "../../index.html",
          caseLinks: loadedCases.map(({ manifest: cohortCaseManifest }) => ({
            caseId: cohortCaseManifest.case.caseId,
            href: buildSiblingCaseHref(cohortCaseManifest.case.caseId),
            current: cohortCaseManifest.case.caseId === manifest.case.caseId,
          })),
        },
      }),
    })),
  ];

  await writeStaticAssets(paths.outputDirectory, assets);

  return {
    cohortId: cohortManifest.cohortId,
    outputDirectory: paths.outputDirectory,
    caseIds: loadedCases.map(({ manifest }) => manifest.case.caseId),
    assets,
  };
}

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<void> {
  const [manifestPath = DEFAULT_COHORT_MANIFEST_PATH, outputDirectory = DEFAULT_OUTPUT_DIRECTORY] =
    argv;

  await buildTinyCohortStaticApp({
    manifestPath,
    outputDirectory,
  });
}

if (import.meta.main) {
  await main();
}
