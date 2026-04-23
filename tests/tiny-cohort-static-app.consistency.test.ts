import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import tcga3cAalkManifestJson from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifestJson from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import cohortIndexManifestJson from "../manifests/tcga-brca/tcga-brca.tiny-cohort-index.json";
import cohortManifestJson from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import tcgaE9A5flManifestJson from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import { buildTinyCohortStaticApp } from "../src/app/build-tiny-cohort-static-app";
import type { CaseManifest } from "../src/contracts/case-manifest";
import type { CohortIndexManifest } from "../src/contracts/cohort-index";
import type { CohortManifest } from "../src/contracts/cohort-manifest";
import { renderCohortIndexPage } from "../src/rendering/case-page";

interface CaseManifestFile {
  relativePath: string;
  manifest: CaseManifest;
}

const checkedCohortIndexManifest = cohortIndexManifestJson as CohortIndexManifest;
const checkedCohortManifest = cohortManifestJson as CohortManifest;
const [
  tcgaE9A5flManifestPath,
  tcga3cAalkManifestPath,
  tcga4hAaakManifestPath,
] = checkedCohortManifest.caseManifestPaths;

if (
  tcgaE9A5flManifestPath === undefined ||
  tcga3cAalkManifestPath === undefined ||
  tcga4hAaakManifestPath === undefined
) {
  throw new Error("Checked tiny cohort manifest must include three case manifests");
}

const checkedCaseManifestFiles = [
  {
    relativePath: tcgaE9A5flManifestPath,
    manifest: tcgaE9A5flManifestJson as CaseManifest,
  },
  {
    relativePath: tcga3cAalkManifestPath,
    manifest: tcga3cAalkManifestJson as CaseManifest,
  },
  {
    relativePath: tcga4hAaakManifestPath,
    manifest: tcga4hAaakManifestJson as CaseManifest,
  },
];

async function withTempManifestBundle(
  run: (paths: {
    manifestPath: string;
    outputDirectory: string;
    writeBundle: (options?: {
      cohortManifest?: CohortManifest;
      cohortIndexManifest?: CohortIndexManifest;
      caseManifestFiles?: CaseManifestFile[];
    }) => Promise<void>;
  }) => Promise<void>,
): Promise<void> {
  const tempDirectory = await mkdtemp(
    join(tmpdir(), "tiny-cohort-static-app-consistency-"),
  );
  const manifestPath = join(
    tempDirectory,
    "manifests",
    "tcga-brca.tiny-cohort-manifest.json",
  );
  const outputDirectory = join(tempDirectory, "dist", "tcga-brca-tiny-cohort");

  const writeBundle = async (
    options: {
      cohortManifest?: CohortManifest;
      cohortIndexManifest?: CohortIndexManifest;
      caseManifestFiles?: CaseManifestFile[];
    } = {},
  ): Promise<void> => {
    const {
      cohortManifest = checkedCohortManifest,
      cohortIndexManifest = checkedCohortIndexManifest,
      caseManifestFiles = checkedCaseManifestFiles,
    } = options;

    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(cohortManifest), "utf8");

    const cohortIndexPath = join(
      dirname(manifestPath),
      cohortManifest.cohortIndexPath,
    );
    await mkdir(dirname(cohortIndexPath), { recursive: true });
    await writeFile(cohortIndexPath, JSON.stringify(cohortIndexManifest), "utf8");

    for (const { relativePath, manifest } of caseManifestFiles) {
      const caseManifestPath = join(dirname(manifestPath), relativePath);

      await mkdir(dirname(caseManifestPath), { recursive: true });
      await writeFile(caseManifestPath, JSON.stringify(manifest), "utf8");
    }
  };

  try {
    await run({ manifestPath, outputDirectory, writeBundle });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

describe("buildTinyCohortStaticApp consistency checks", () => {
  test("accepts loaded case manifests when each path slot resolves to the matching case id", async () => {
    await withTempManifestBundle(async ({ manifestPath, outputDirectory, writeBundle }) => {
      await writeBundle();

      const build = await buildTinyCohortStaticApp({
        manifestPath,
        outputDirectory,
      });

      expect(build.caseIds).toEqual([
        tcgaE9A5flManifestJson.case.caseId,
        tcga3cAalkManifestJson.case.caseId,
        tcga4hAaakManifestJson.case.caseId,
      ]);
    });
  });

  test("rejects duplicate case ids even when they are loaded from different manifest paths", async () => {
    await withTempManifestBundle(async ({ manifestPath, outputDirectory, writeBundle }) => {
      await writeBundle({
        caseManifestFiles: [
          {
            relativePath: tcgaE9A5flManifestPath,
            manifest: tcgaE9A5flManifestJson as CaseManifest,
          },
          {
            relativePath: tcga3cAalkManifestPath,
            manifest: tcgaE9A5flManifestJson as CaseManifest,
          },
          {
            relativePath: tcga4hAaakManifestPath,
            manifest: tcga4hAaakManifestJson as CaseManifest,
          },
        ],
      });

      await expect(
        buildTinyCohortStaticApp({
          manifestPath,
          outputDirectory,
        }),
      ).rejects.toThrow(
        /CohortManifest case manifests must resolve to unique CaseMetadata\.caseId values/,
      );
    });
  });

  test("renders the linked cohort index artifact instead of re-deriving landing-page summaries from case manifests", async () => {
    await withTempManifestBundle(async ({ manifestPath, outputDirectory, writeBundle }) => {
      const linkedCohortManifest = {
        ...checkedCohortManifest,
        cohortIndexPath: "linked/curated-cohort-index.json",
      } as CohortManifest;
      const linkedCohortIndexManifest = {
        ...checkedCohortIndexManifest,
        cases: checkedCohortIndexManifest.cases.map((entry, index) =>
          index === 0
            ? {
                ...entry,
                primaryDiagnosis: "Curated landing-page diagnosis",
                diseaseType: "Curated landing-page disease type",
                tumorSampleId: "CURATED-TUMOR-SAMPLE",
                mutationHighlightGenes: ["CURATED1", "CURATED2"],
                slideCount: 42,
              }
            : entry,
        ),
      } as CohortIndexManifest;

      await writeBundle({
        cohortManifest: linkedCohortManifest,
        cohortIndexManifest: linkedCohortIndexManifest,
      });

      const build = await buildTinyCohortStaticApp({
        manifestPath,
        outputDirectory,
      });

      expect(build.assets.find((asset) => asset.outputPath === "index.html")).toEqual({
        outputPath: "index.html",
        contentType: "text/html",
        content: renderCohortIndexPage(linkedCohortIndexManifest),
      });
      expect(build.caseIds).toEqual([
        tcgaE9A5flManifestJson.case.caseId,
        tcga3cAalkManifestJson.case.caseId,
        tcga4hAaakManifestJson.case.caseId,
      ]);
    });
  });

  test("rejects a linked cohort index entry whose href does not match the built routed case page", async () => {
    await withTempManifestBundle(async ({ manifestPath, outputDirectory, writeBundle }) => {
      await writeBundle({
        cohortIndexManifest: {
          ...checkedCohortIndexManifest,
          cases: checkedCohortIndexManifest.cases.map((entry, index) =>
            index === 0
              ? {
                  ...entry,
                  href: "cases/tcga-3c-aalk/index.html",
                }
              : entry,
          ),
        } as CohortIndexManifest,
      });

      await expect(
        buildTinyCohortStaticApp({
          manifestPath,
          outputDirectory,
        }),
      ).rejects.toThrow(
        /CohortIndexManifest\.cases\[0\]\.href does not line up with loaded case TCGA-E9-A5FL/,
      );
    });
  });

  test("rejects a loaded case manifest whose case id does not match its cohort manifest path slot", async () => {
    await withTempManifestBundle(async ({ manifestPath, outputDirectory, writeBundle }) => {
      await writeBundle({
        caseManifestFiles: [
          {
            relativePath: tcgaE9A5flManifestPath,
            manifest: tcga3cAalkManifestJson as CaseManifest,
          },
          {
            relativePath: tcga3cAalkManifestPath,
            manifest: tcgaE9A5flManifestJson as CaseManifest,
          },
          {
            relativePath: tcga4hAaakManifestPath,
            manifest: tcga4hAaakManifestJson as CaseManifest,
          },
        ],
      });

      await expect(
        buildTinyCohortStaticApp({
          manifestPath,
          outputDirectory,
        }),
      ).rejects.toThrow(
        /CohortManifest\.caseManifestPaths\[0\] does not line up with loaded case TCGA-3C-AALK/,
      );
    });
  });
});
