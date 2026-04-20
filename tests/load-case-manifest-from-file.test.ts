import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import checkedInManifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import {
  DEFAULT_SEED_MANIFEST_PATH,
  loadCaseManifestFromFile,
} from "../src/app/build-single-case-static-app";

async function withTempDir(
  run: (tempDirectory: string) => Promise<void>,
): Promise<void> {
  const tempDirectory = await mkdtemp(join(tmpdir(), "case-manifest-"));

  try {
    await run(tempDirectory);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

describe("loadCaseManifestFromFile", () => {
  test("loads the checked-in seed manifest from disk", async () => {
    await expect(
      loadCaseManifestFromFile(DEFAULT_SEED_MANIFEST_PATH),
    ).resolves.toEqual(checkedInManifest);
  });

  test("validates parsed manifest JSON before returning it", async () => {
    await withTempDir(async (tempDirectory) => {
      const manifestPath = join(tempDirectory, "seed.case-manifest.json");

      await writeFile(
        manifestPath,
        JSON.stringify({
          ...checkedInManifest,
          note: "extra top-level metadata",
          case: {
            ...checkedInManifest.case,
            cohort: "seed",
          },
        }),
      );

      await expect(loadCaseManifestFromFile(manifestPath)).resolves.toEqual(
        checkedInManifest,
      );
    });
  });

  test("rejects manifest JSON that fails the CaseManifest contract", async () => {
    await withTempDir(async (tempDirectory) => {
      const manifestPath = join(tempDirectory, "invalid.case-manifest.json");

      await writeFile(
        manifestPath,
        JSON.stringify({
          ...checkedInManifest,
          schemaVersion: "case-manifest/v2",
        }),
      );

      await expect(loadCaseManifestFromFile(manifestPath)).rejects.toThrow(
        /CaseManifest\.schemaVersion must be "case-manifest\/v1"/,
      );
    });
  });
});
