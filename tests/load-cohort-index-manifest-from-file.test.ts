import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import checkedInManifest from "../manifests/tcga-brca/tcga-brca.tiny-cohort-index.json";
import { loadCohortIndexManifestFromFile } from "../src/app/build-tiny-cohort-static-app";

const CHECKED_IN_MANIFEST_PATH =
  "manifests/tcga-brca/tcga-brca.tiny-cohort-index.json";

async function withTempDir(
  run: (tempDirectory: string) => Promise<void>,
): Promise<void> {
  const tempDirectory = await mkdtemp(join(tmpdir(), "cohort-index-manifest-"));

  try {
    await run(tempDirectory);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

describe("loadCohortIndexManifestFromFile", () => {
  test("loads the checked-in cohort index artifact from disk", async () => {
    await expect(
      loadCohortIndexManifestFromFile(CHECKED_IN_MANIFEST_PATH),
    ).resolves.toEqual(checkedInManifest);
  });

  test("validates parsed cohort index JSON before returning it", async () => {
    await withTempDir(async (tempDirectory) => {
      const manifestPath = join(tempDirectory, "tcga-brca.tiny-cohort-index.json");

      await writeFile(
        manifestPath,
        JSON.stringify({
          ...checkedInManifest,
          note: "extra top-level metadata",
          cases: checkedInManifest.cases.map((entry, index) =>
            index === 0
              ? {
                  ...entry,
                  cohortLabel: checkedInManifest.cohortId,
                }
              : entry,
          ),
        }),
      );

      await expect(loadCohortIndexManifestFromFile(manifestPath)).resolves.toEqual(
        checkedInManifest,
      );
    });
  });

  test("rejects cohort index JSON that fails the CohortIndexManifest contract", async () => {
    await withTempDir(async (tempDirectory) => {
      const manifestPath = join(tempDirectory, "invalid.tiny-cohort-index.json");

      await writeFile(
        manifestPath,
        JSON.stringify({
          ...checkedInManifest,
          schemaVersion: "cohort-index/v2",
        }),
      );

      await expect(loadCohortIndexManifestFromFile(manifestPath)).rejects.toThrow(
        /CohortIndexManifest\.schemaVersion must be "cohort-index\/v1"/,
      );
    });
  });

  test("rejects malformed JSON before validation", async () => {
    await withTempDir(async (tempDirectory) => {
      const manifestPath = join(tempDirectory, "malformed.tiny-cohort-index.json");

      await writeFile(manifestPath, "{\n");

      await expect(loadCohortIndexManifestFromFile(manifestPath)).rejects.toThrow();
    });
  });
});
