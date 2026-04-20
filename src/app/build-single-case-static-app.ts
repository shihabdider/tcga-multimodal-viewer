import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { CaseId, CaseManifest } from "../contracts/case-manifest";
import { validateCaseManifest } from "../contracts/case-manifest.validation";

export const DEFAULT_SEED_MANIFEST_PATH =
  "manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
export const DEFAULT_OUTPUT_DIRECTORY = "dist/tcga-e9-a5fl";

export interface StaticAsset {
  outputPath: string;
  contentType: "text/html" | "text/css";
  content: string;
}

export interface SingleCaseBuildPaths {
  manifestPath: string;
  outputDirectory: string;
}

export interface SingleCaseStaticBuild {
  caseId: CaseId;
  outputDirectory: string;
  assets: StaticAsset[];
}

export async function loadCaseManifestFromFile(
  manifestPath: string,
): Promise<CaseManifest> {
  const manifestJson = await readFile(manifestPath, "utf8");
  const parsedManifest = JSON.parse(manifestJson) as unknown;

  return validateCaseManifest(parsedManifest);
}

export async function writeStaticAssets(
  outputDirectory: string,
  assets: StaticAsset[],
): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });

  for (const asset of assets) {
    const assetPath = join(outputDirectory, asset.outputPath);

    await mkdir(dirname(assetPath), { recursive: true });
    await writeFile(assetPath, asset.content, "utf8");
  }
}

export async function buildSingleCaseStaticApp(
  paths: SingleCaseBuildPaths,
): Promise<SingleCaseStaticBuild> {
  throw new Error("not implemented: buildSingleCaseStaticApp");
}

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<void> {
  throw new Error("not implemented: main");
}
