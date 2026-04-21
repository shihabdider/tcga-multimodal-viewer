import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import tcga3cAalkManifest from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifest from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import cohortManifest from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import tcgaE9A5flManifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import { writeManifestJsonFiles } from "../src/app/export-tiny-cohort-manifests";
import type { CaseManifest } from "../src/contracts/case-manifest";
import type { CohortManifest } from "../src/contracts/cohort-manifest";

const repoRoot = join(import.meta.dir, "..");
const checkedInManifestDirectory = join(repoRoot, "manifests", "tcga-brca");
const cohortOutputPath = "tcga-brca.tiny-cohort-manifest.json";

async function withTempDirectory(
  run: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "write-manifest-json-files-"));

  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function readCheckedInManifest(relativePath: string): Promise<string> {
  return readFile(join(checkedInManifestDirectory, relativePath), "utf8");
}

describe("writeManifestJsonFiles", () => {
  test("writes the checked-in cohort and case manifests with stable filenames, order, and normalized source text", async () => {
    const expectedFiles = [
      {
        outputPath: cohortOutputPath,
        content: await readCheckedInManifest(cohortOutputPath),
      },
      ...(
        await Promise.all(
          (cohortManifest as CohortManifest).caseManifestPaths.map(
            async (outputPath) => ({
              outputPath,
              content: await readCheckedInManifest(outputPath),
            }),
          ),
        )
      ),
    ];

    await withTempDirectory(async (tempRoot) => {
      const outputDirectory = join(tempRoot, "dist", "tcga-brca-manifest-export");
      const files = await writeManifestJsonFiles(
        outputDirectory,
        cohortManifest as CohortManifest,
        [
          tcga4hAaakManifest as CaseManifest,
          tcgaE9A5flManifest as CaseManifest,
          tcga3cAalkManifest as CaseManifest,
        ],
      );

      expect(files).toEqual(expectedFiles);

      for (const expectedFile of expectedFiles) {
        expect(
          await readFile(join(outputDirectory, expectedFile.outputPath), "utf8"),
        ).toBe(expectedFile.content);
      }
    });
  });

  test("creates the requested export directory before writing the manifest files", async () => {
    await withTempDirectory(async (tempRoot) => {
      const outputDirectory = join(tempRoot, "nested", "exports", "tcga-brca");

      await writeManifestJsonFiles(
        outputDirectory,
        cohortManifest as CohortManifest,
        [
          tcgaE9A5flManifest as CaseManifest,
          tcga3cAalkManifest as CaseManifest,
          tcga4hAaakManifest as CaseManifest,
        ],
      );

      expect((await readdir(outputDirectory)).sort()).toEqual([
        "tcga-3c-aalk.case-manifest.json",
        "tcga-4h-aaak.case-manifest.json",
        "tcga-brca.tiny-cohort-manifest.json",
        "tcga-e9-a5fl.case-manifest.json",
      ]);
    });
  });
});
