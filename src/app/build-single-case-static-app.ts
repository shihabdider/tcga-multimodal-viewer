import type { CaseId, CaseManifest } from "../contracts/case-manifest";

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
  throw new Error("not implemented: loadCaseManifestFromFile");
}

export async function writeStaticAssets(
  outputDirectory: string,
  assets: StaticAsset[],
): Promise<void> {
  throw new Error("not implemented: writeStaticAssets");
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
