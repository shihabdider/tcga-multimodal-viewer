import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import cohortManifest from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import tcga3cAalkManifest from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifest from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import tcgaE9A5flManifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import {
  buildTinyCohortStaticApp,
  DEFAULT_COHORT_MANIFEST_PATH,
} from "../src/app/build-tiny-cohort-static-app";

async function withTempBuildDirectory(
  run: (outputDirectory: string) => Promise<void>,
): Promise<void> {
  const tempDirectory = await mkdtemp(join(tmpdir(), "tiny-cohort-static-app-"));
  const outputDirectory = join(tempDirectory, "dist", "tcga-brca-tiny-cohort");

  try {
    await run(outputDirectory);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

describe("buildTinyCohortStaticApp", () => {
  test("builds the checked-in three-case cohort index plus case pages", async () => {
    await withTempBuildDirectory(async (outputDirectory) => {
      const build = await buildTinyCohortStaticApp({
        manifestPath: DEFAULT_COHORT_MANIFEST_PATH,
        outputDirectory,
      });

      expect(build.cohortId).toBe(cohortManifest.cohortId);
      expect(build.caseIds).toEqual([
        tcgaE9A5flManifest.case.caseId,
        tcga3cAalkManifest.case.caseId,
        tcga4hAaakManifest.case.caseId,
      ]);
      expect(build.assets.map((asset) => asset.outputPath)).toEqual([
        "index.html",
        "styles.css",
        "cases/tcga-e9-a5fl/index.html",
        "cases/tcga-3c-aalk/index.html",
        "cases/tcga-4h-aaak/index.html",
      ]);
    });
  });

  test("writes the cohort index and each case page into the requested output directory", async () => {
    await withTempBuildDirectory(async (outputDirectory) => {
      await buildTinyCohortStaticApp({
        manifestPath: DEFAULT_COHORT_MANIFEST_PATH,
        outputDirectory,
      });

      const renderedIndex = await readFile(join(outputDirectory, "index.html"), "utf8");
      expect(renderedIndex).toContain(cohortManifest.title);
      expect(renderedIndex).toContain(tcga4hAaakManifest.case.caseId);

      const renderedCasePage = await readFile(
        join(outputDirectory, "cases", "tcga-3c-aalk", "index.html"),
        "utf8",
      );
      expect(renderedCasePage).toContain(tcga3cAalkManifest.case.caseId);
      expect(renderedCasePage).toContain("Back to TCGA-BRCA tiny cohort");
      expect(renderedCasePage).toContain(tcga3cAalkManifest.slides[0].viewerHandoff.url);
    });
  });
});
