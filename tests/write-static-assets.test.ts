import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  type StaticAsset,
  writeStaticAssets,
} from "../src/app/build-single-case-static-app";

async function withTempDirectory(
  run: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "write-static-assets-"));

  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("writeStaticAssets", () => {
  test("writes html and css assets into the requested output directory", async () => {
    const assets: StaticAsset[] = [
      {
        outputPath: "index.html",
        contentType: "text/html",
        content: "<!doctype html><html><body><h1>TCGA-E9-A5FL</h1></body></html>",
      },
      {
        outputPath: "styles.css",
        contentType: "text/css",
        content: "body { font-family: sans-serif; }",
      },
    ];

    await withTempDirectory(async (tempRoot) => {
      const outputDirectory = join(tempRoot, "dist", "tcga-e9-a5fl");

      await writeStaticAssets(outputDirectory, assets);

      expect(await readFile(join(outputDirectory, "index.html"), "utf8")).toBe(
        assets[0].content,
      );
      expect(await readFile(join(outputDirectory, "styles.css"), "utf8")).toBe(
        assets[1].content,
      );
    });
  });

  test("creates nested directories for asset output paths", async () => {
    const assets: StaticAsset[] = [
      {
        outputPath: "assets/css/styles.css",
        contentType: "text/css",
        content: ".case-page { max-width: 72rem; }",
      },
    ];

    await withTempDirectory(async (tempRoot) => {
      const outputDirectory = join(tempRoot, "dist", "nested-assets");

      await writeStaticAssets(outputDirectory, assets);

      expect(
        await readFile(join(outputDirectory, "assets", "css", "styles.css"), "utf8"),
      ).toBe(assets[0].content);
    });
  });

  test("creates the output directory even when there are no assets", async () => {
    await withTempDirectory(async (tempRoot) => {
      const outputDirectory = join(tempRoot, "dist", "empty-build");

      await writeStaticAssets(outputDirectory, []);

      expect(await readdir(outputDirectory)).toEqual([]);
    });
  });
});
