import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import {
  DEFAULT_OUTPUT_DIRECTORY,
  DEFAULT_SEED_MANIFEST_PATH,
  main,
} from "../src/app/build-single-case-static-app";
import {
  renderCasePage,
  renderSingleCaseStylesheet,
} from "../src/rendering/case-page";

async function withTempProjectRoot(
  run: (projectRoot: string) => Promise<void>,
): Promise<void> {
  const projectRoot = await mkdtemp(
    join(tmpdir(), "single-case-static-app-main-"),
  );
  const previousWorkingDirectory = process.cwd();
  const defaultManifestPath = join(projectRoot, DEFAULT_SEED_MANIFEST_PATH);

  try {
    await mkdir(dirname(defaultManifestPath), { recursive: true });
    await writeFile(defaultManifestPath, JSON.stringify(manifest), "utf8");
    process.chdir(projectRoot);
    await run(projectRoot);
  } finally {
    process.chdir(previousWorkingDirectory);
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function writeManifestFile(manifestPath: string): Promise<void> {
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest), "utf8");
}

async function expectBuiltAssets(outputDirectory: string): Promise<void> {
  expect(await readFile(join(outputDirectory, "index.html"), "utf8")).toBe(
    renderCasePage(manifest),
  );
  expect(await readFile(join(outputDirectory, "styles.css"), "utf8")).toBe(
    renderSingleCaseStylesheet(),
  );
}

describe("main", () => {
  test("builds the static app when manifest and output paths are both provided", async () => {
    await withTempProjectRoot(async (projectRoot) => {
      const manifestPath = join(
        projectRoot,
        "fixtures",
        "custom.case-manifest.json",
      );
      const outputDirectory = join(projectRoot, "custom-dist", "case-page");

      await writeManifestFile(manifestPath);
      await main([manifestPath, outputDirectory]);

      await expectBuiltAssets(outputDirectory);
    });
  });

  test("uses the default output directory when only a manifest path is provided", async () => {
    await withTempProjectRoot(async (projectRoot) => {
      const manifestPath = join(
        projectRoot,
        "fixtures",
        "single-arg.case-manifest.json",
      );
      const outputDirectory = join(projectRoot, DEFAULT_OUTPUT_DIRECTORY);

      await writeManifestFile(manifestPath);
      await main([manifestPath]);

      await expectBuiltAssets(outputDirectory);
    });
  });

  test("uses the default manifest and output paths when argv is empty", async () => {
    await withTempProjectRoot(async (projectRoot) => {
      const outputDirectory = join(projectRoot, DEFAULT_OUTPUT_DIRECTORY);

      await main([]);

      await expectBuiltAssets(outputDirectory);
    });
  });
});
