import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  checkedTinyBrcaCohortIndexOutputPath,
  checkedTinyBrcaCohortManifest,
  checkedTinyBrcaCohortManifestOutputPath,
  checkedTinyBrcaRecipePath,
  expectCheckedTinyBrcaGdcRequestCounts,
  installCheckedTinyBrcaFetchMock,
  readCheckedTinyBrcaManifest,
  restoreCheckedTinyBrcaFetchMock,
} from "./helpers/checked-tiny-brca-fixture";
import {
  resolvePathFromCwd,
  withTempProjectRoot,
} from "./helpers/temp-project-root";
import {
  DEFAULT_TINY_COHORT_EXPORT_OUTPUT_DIRECTORY,
  DEFAULT_TINY_COHORT_EXPORT_RECIPE_PATH,
  main,
} from "../src/app/export-tiny-cohort-manifests";

async function writeCheckedInRecipe(recipePath: string): Promise<void> {
  await mkdir(dirname(recipePath), { recursive: true });
  await writeFile(recipePath, await readFile(checkedTinyBrcaRecipePath, "utf8"), "utf8");
}

async function expectCheckedInManifestExport(
  outputDirectory: string,
): Promise<void> {
  const expectedOutputPaths = [
    checkedTinyBrcaCohortManifestOutputPath,
    checkedTinyBrcaCohortIndexOutputPath,
    ...checkedTinyBrcaCohortManifest.caseManifestPaths,
  ];

  for (const outputPath of expectedOutputPaths) {
    expect(await readFile(join(outputDirectory, outputPath), "utf8")).toBe(
      await readCheckedTinyBrcaManifest(outputPath),
    );
  }
}

afterEach(() => {
  restoreCheckedTinyBrcaFetchMock();
});

export async function coverExportTinyCohortManifestsMain(
  argv: string[],
): Promise<void> {
  const [, outputDirectory = DEFAULT_TINY_COHORT_EXPORT_OUTPUT_DIRECTORY] = argv;

  await main(argv);
  await expectCheckedInManifestExport(resolvePathFromCwd(outputDirectory));
}

describe("coverExportTinyCohortManifestsMain", () => {
  test("writes the checked-in tiny cohort manifests when recipe and output paths are provided explicitly", async () => {
    const requestedUrls: string[] = [];

    installCheckedTinyBrcaFetchMock({ requestedUrls });

    await withTempProjectRoot(
      "export-tiny-cohort-manifests-main-",
      async (projectRoot) => {
        const recipePath = join(
          projectRoot,
          "fixtures",
          "custom.tiny-export-recipe.json",
        );

        await writeCheckedInRecipe(recipePath);
        await coverExportTinyCohortManifestsMain([
          join("fixtures", "custom.tiny-export-recipe.json"),
          join("custom-dist", "tcga-brca-manifest-export"),
        ]);
      },
    );

    expectCheckedTinyBrcaGdcRequestCounts(requestedUrls);
  });

  test("uses the default output directory when only a recipe path is provided", async () => {
    installCheckedTinyBrcaFetchMock();

    await withTempProjectRoot(
      "export-tiny-cohort-manifests-main-",
      async (projectRoot) => {
        await writeCheckedInRecipe(
          join(projectRoot, "fixtures", "single-arg.tiny-export-recipe.json"),
        );
        await coverExportTinyCohortManifestsMain([
          join("fixtures", "single-arg.tiny-export-recipe.json"),
        ]);
      },
    );
  });

  test("uses the default recipe and output paths relative to cwd when argv is empty", async () => {
    installCheckedTinyBrcaFetchMock();

    await withTempProjectRoot(
      "export-tiny-cohort-manifests-main-",
      async (projectRoot) => {
        await writeCheckedInRecipe(
          join(projectRoot, DEFAULT_TINY_COHORT_EXPORT_RECIPE_PATH),
        );
        await coverExportTinyCohortManifestsMain([]);
      },
    );
  });
});
