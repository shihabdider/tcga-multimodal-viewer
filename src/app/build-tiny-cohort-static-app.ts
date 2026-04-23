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
import { loadValidatedJsonFile } from "./load-validated-json-file";
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
  return loadValidatedJsonFile(manifestPath, validateCohortManifest);
}

export async function loadCohortIndexManifestFromFile(
  manifestPath: string,
): Promise<CohortIndexManifest> {
  return loadValidatedJsonFile(manifestPath, validateCohortIndexManifest);
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
  if (loadedCases.length !== cohortManifest.caseManifestPaths.length) {
    throw new Error(
      "CohortManifest.caseManifestPaths must resolve one-to-one with loaded case manifests",
    );
  }

  const caseIds = loadedCases.map(({ manifest }) => manifest.case.caseId);

  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error(
      "CohortManifest case manifests must resolve to unique CaseMetadata.caseId values",
    );
  }

  loadedCases.forEach(({ manifestPath, manifest }, index) => {
    const expectedManifestPath =
      `${manifest.case.caseId.toLowerCase()}.case-manifest.json`;
    const caseManifestPath = cohortManifest.caseManifestPaths[index];

    if (caseManifestPath !== expectedManifestPath) {
      throw new Error(
        `CohortManifest.caseManifestPaths[${index}] does not line up with loaded case ${manifest.case.caseId}`,
      );
    }

    if (manifest.case.projectId !== cohortManifest.projectId) {
      throw new Error(
        `Case manifest ${manifestPath} does not match CohortManifest.projectId`,
      );
    }
  });
}

function assertCohortIndexMatchesLoadedCases(
  cohortManifest: CohortManifest,
  cohortIndexManifest: CohortIndexManifest,
  loadedCases: LoadedCohortCase[],
): void {
  if (cohortIndexManifest.cohortId !== cohortManifest.cohortId) {
    throw new Error("CohortIndexManifest.cohortId must match CohortManifest.cohortId");
  }

  if (cohortIndexManifest.projectId !== cohortManifest.projectId) {
    throw new Error(
      "CohortIndexManifest.projectId must match CohortManifest.projectId",
    );
  }

  if (cohortIndexManifest.title !== cohortManifest.title) {
    throw new Error("CohortIndexManifest.title must match CohortManifest.title");
  }

  if (cohortIndexManifest.description !== cohortManifest.description) {
    throw new Error(
      "CohortIndexManifest.description must match CohortManifest.description",
    );
  }

  if (cohortIndexManifest.cases.length !== loadedCases.length) {
    throw new Error(
      "CohortIndexManifest.cases must resolve one-to-one with loaded case manifests",
    );
  }

  cohortIndexManifest.cases.forEach((entry, index) => {
    const loadedCase = loadedCases[index];
    const caseManifestPath = cohortManifest.caseManifestPaths[index];

    if (!loadedCase || caseManifestPath === undefined) {
      throw new Error(
        `CohortIndexManifest.cases[${index}] does not line up with loaded case manifests`,
      );
    }

    const caseId = loadedCase.manifest.case.caseId;

    if (entry.caseId !== caseId) {
      throw new Error(
        `CohortIndexManifest.cases[${index}].caseId does not line up with loaded case ${caseId}`,
      );
    }

    if (entry.caseManifestPath !== caseManifestPath) {
      throw new Error(
        `CohortIndexManifest.cases[${index}].caseManifestPath does not line up with loaded case ${caseId}`,
      );
    }

    if (entry.href !== buildIndexHref(caseId)) {
      throw new Error(
        `CohortIndexManifest.cases[${index}].href does not line up with loaded case ${caseId}`,
      );
    }
  });
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
  const cohortIndexManifestPath = join(
    dirname(paths.manifestPath),
    cohortManifest.cohortIndexPath,
  );
  const cohortIndexManifest = await loadCohortIndexManifestFromFile(
    cohortIndexManifestPath,
  );

  assertLoadedCasesMatchCohort(cohortManifest, loadedCases);
  assertCohortIndexMatchesLoadedCases(
    cohortManifest,
    cohortIndexManifest,
    loadedCases,
  );

  const assets: StaticAsset[] = [
    {
      outputPath: "index.html",
      contentType: "text/html",
      content: renderCohortIndexPage(cohortIndexManifest),
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
