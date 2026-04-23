import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkedTinyBrcaCaseManifests,
  checkedTinyBrcaCohortIndex,
  checkedTinyBrcaCohortIndexOutputPath,
  checkedTinyBrcaCohortManifest,
  checkedTinyBrcaCohortManifestOutputPath,
  checkedTinyBrcaRecipePath,
  expectCheckedTinyBrcaGdcRequestCounts,
  installCheckedTinyBrcaFetchMock,
  readCheckedTinyBrcaManifest,
  restoreCheckedTinyBrcaFetchMock,
} from "./helpers/checked-tiny-brca-fixture";
import { buildTinyCohortStaticApp } from "../src/app/build-tiny-cohort-static-app";
import { exportTinyCohortManifests } from "../src/app/export-tiny-cohort-manifests";
import { renderCohortIndexPage } from "../src/rendering/case-page";

async function withTempDirectories(
  run: (paths: { exportDirectory: string; buildDirectory: string }) => Promise<void>,
): Promise<void> {
  const tempDirectory = await mkdtemp(join(tmpdir(), "tiny-cohort-export-build-"));

  try {
    await run({
      exportDirectory: join(tempDirectory, "exported-manifests"),
      buildDirectory: join(tempDirectory, "dist", "tcga-brca-tiny-cohort"),
    });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

export async function coverTinyBrcaExportToStaticViewerThinSlice(): Promise<void> {
  const requestedUrls: string[] = [];

  installCheckedTinyBrcaFetchMock({ requestedUrls });

  await withTempDirectories(async ({ exportDirectory, buildDirectory }) => {
    const exportResult = await exportTinyCohortManifests({
      recipePath: checkedTinyBrcaRecipePath,
      outputDirectory: exportDirectory,
    });

    expect(exportResult.cohortManifest).toEqual(checkedTinyBrcaCohortManifest);
    expect(exportResult.caseManifests).toEqual(checkedTinyBrcaCaseManifests);
    expect(exportResult.files.map((file) => file.outputPath)).toEqual([
      checkedTinyBrcaCohortManifestOutputPath,
      checkedTinyBrcaCohortIndexOutputPath,
      ...checkedTinyBrcaCohortManifest.caseManifestPaths,
    ]);

    const expectedCohortIndexJson = await readCheckedTinyBrcaManifest(
      checkedTinyBrcaCohortIndexOutputPath,
    );
    const exportedCohortIndexFile = exportResult.files.find(
      (file) => file.outputPath === exportResult.cohortManifest.cohortIndexPath,
    );
    const exportedCohortIndexPath = join(
      exportDirectory,
      exportResult.cohortManifest.cohortIndexPath,
    );
    const exportedCohortIndexJson = await readFile(exportedCohortIndexPath, "utf8");
    const exportedCohortIndex = JSON.parse(
      exportedCohortIndexJson,
    ) as typeof checkedTinyBrcaCohortIndex;

    expect(exportedCohortIndexFile).toEqual({
      outputPath: exportResult.cohortManifest.cohortIndexPath,
      content: expectedCohortIndexJson,
    });
    expect(exportedCohortIndexJson).toBe(expectedCohortIndexJson);
    expect(exportedCohortIndex).toEqual(checkedTinyBrcaCohortIndex);

    const build = await buildTinyCohortStaticApp({
      manifestPath: join(exportDirectory, checkedTinyBrcaCohortManifestOutputPath),
      outputDirectory: buildDirectory,
    });

    expect(build.cohortId).toBe(checkedTinyBrcaCohortManifest.cohortId);
    expect(build.caseIds).toEqual(
      checkedTinyBrcaCaseManifests.map((manifest) => manifest.case.caseId),
    );
    expect(build.assets.map((asset) => asset.outputPath)).toEqual([
      "index.html",
      "styles.css",
      ...checkedTinyBrcaCaseManifests.map(
        (manifest) => `cases/${manifest.case.caseId.toLowerCase()}/index.html`,
      ),
    ]);

    const expectedRenderedIndex = renderCohortIndexPage(exportedCohortIndex);
    const renderedIndex = await readFile(join(buildDirectory, "index.html"), "utf8");

    expect(build.assets.find((asset) => asset.outputPath === "index.html")).toEqual({
      outputPath: "index.html",
      contentType: "text/html",
      content: expectedRenderedIndex,
    });
    expect(renderedIndex).toBe(expectedRenderedIndex);

    for (const manifest of checkedTinyBrcaCaseManifests) {
      const caseSlug = manifest.case.caseId.toLowerCase();
      const renderedCasePage = await readFile(
        join(buildDirectory, "cases", caseSlug, "index.html"),
        "utf8",
      );

      expect(renderedCasePage).toContain(manifest.case.caseId);
      expect(renderedCasePage).toContain('aria-label="Cohort navigation"');
      expect(renderedCasePage).toContain(
        `Back to ${checkedTinyBrcaCohortManifest.title}`,
      );
      expect(renderedCasePage).toContain('href="../../index.html"');
      expect(renderedCasePage).toContain("Open public slide in IDC Slim viewer");
      expect(renderedCasePage).toContain(manifest.slides[0].viewerHandoff.url);

      for (const cohortCaseManifest of checkedTinyBrcaCaseManifests) {
        expect(renderedCasePage).toContain(
          `href="../${cohortCaseManifest.case.caseId.toLowerCase()}/index.html"`,
        );
      }

      expect(renderedCasePage).toContain(
        `href="../${caseSlug}/index.html" aria-current="page"`,
      );
    }
  });

  expect(
    requestedUrls.every((url) => url.startsWith("https://api.gdc.cancer.gov/")),
  ).toBe(true);
  expectCheckedTinyBrcaGdcRequestCounts(requestedUrls);
}

afterEach(() => {
  restoreCheckedTinyBrcaFetchMock();
});

describe("coverTinyBrcaExportToStaticViewerThinSlice", () => {
  test(
    "exports the checked-in tiny BRCA recipe and builds a static viewer artifact with cohort index, navigation, and IDC Slim handoffs",
    coverTinyBrcaExportToStaticViewerThinSlice,
  );
});
