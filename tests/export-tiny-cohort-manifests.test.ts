import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkedTinyBrcaCaseManifests,
  checkedTinyBrcaCohortIndexOutputPath,
  checkedTinyBrcaCohortManifest,
  checkedTinyBrcaCohortManifestOutputPath,
  checkedTinyBrcaRecipe,
  checkedTinyBrcaRecipePath,
  expectCheckedTinyBrcaGdcRequestCounts,
  installCheckedTinyBrcaFetchMock,
  readCheckedTinyBrcaManifest,
  restoreCheckedTinyBrcaFetchMock,
} from "./helpers/checked-tiny-brca-fixture";
import { exportTinyCohortManifests } from "../src/app/export-tiny-cohort-manifests";

async function withTempDirectory(
  run: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "export-tiny-cohort-manifests-"));

  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

afterEach(() => {
  restoreCheckedTinyBrcaFetchMock();
});

describe("exportTinyCohortManifests", () => {
  test("loads the checked-in recipe, derives checked-in case manifests in recipe order, writes normalized manifest JSON files, and returns the structured export result", async () => {
    const requestedUrls: string[] = [];
    const expectedFiles = [
      {
        outputPath: checkedTinyBrcaCohortManifestOutputPath,
        content: await readCheckedTinyBrcaManifest(
          checkedTinyBrcaCohortManifestOutputPath,
        ),
      },
      {
        outputPath: checkedTinyBrcaCohortIndexOutputPath,
        content: await readCheckedTinyBrcaManifest(
          checkedTinyBrcaCohortIndexOutputPath,
        ),
      },
      ...(
        await Promise.all(
          checkedTinyBrcaCohortManifest.caseManifestPaths.map(
            async (outputPath) => ({
              outputPath,
              content: await readCheckedTinyBrcaManifest(outputPath),
            }),
          ),
        )
      ),
    ];

    installCheckedTinyBrcaFetchMock({
      requestedUrls,
      caseMetadataDelayMsByCaseId: {
        "TCGA-E9-A5FL": 30,
        "TCGA-3C-AALK": 20,
        "TCGA-4H-AAAK": 10,
      },
    });

    await withTempDirectory(async (tempRoot) => {
      const outputDirectory = join(tempRoot, "nested", "dist", "tcga-brca-manifest-export");
      const result = await exportTinyCohortManifests({
        recipePath: checkedTinyBrcaRecipePath,
        outputDirectory,
      });

      expect(result).toEqual({
        outputDirectory,
        cohortManifest: checkedTinyBrcaCohortManifest,
        caseManifests: checkedTinyBrcaCaseManifests,
        files: expectedFiles,
      });

      for (const expectedFile of expectedFiles) {
        expect(
          await readFile(join(outputDirectory, expectedFile.outputPath), "utf8"),
        ).toBe(expectedFile.content);
      }
    });

    expectCheckedTinyBrcaGdcRequestCounts(requestedUrls);
  });

  test("rejects invalid recipes before fetching public data or writing manifest files", async () => {
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input) => {
      const requestedUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      requestedUrls.push(requestedUrl);

      return new Response("unexpected fetch", { status: 500 });
    }) as typeof fetch;

    await withTempDirectory(async (tempRoot) => {
      const recipePath = join(tempRoot, "invalid-recipe.json");
      const outputDirectory = join(tempRoot, "dist", "tcga-brca-manifest-export");

      await writeFile(
        recipePath,
        JSON.stringify(
          {
            ...checkedTinyBrcaRecipe,
            projectId: "TCGA-LUAD",
          },
          null,
          2,
        ),
      );

      await expect(
        exportTinyCohortManifests({
          recipePath,
          outputDirectory,
        }),
      ).rejects.toThrow(/TinyCohortExportRecipe\.projectId must be "TCGA-BRCA"/);

      expect(requestedUrls).toEqual([]);
      await expect(
        readFile(join(outputDirectory, checkedTinyBrcaCohortManifestOutputPath), "utf8"),
      ).rejects.toThrow();
      await expect(
        readFile(join(outputDirectory, checkedTinyBrcaCohortIndexOutputPath), "utf8"),
      ).rejects.toThrow();
    });
  });
});
