import { describe, expect, test } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolvePathFromCwd,
  withTempProjectRoot,
} from "./helpers/temp-project-root";
import tcga3cAalkManifestJson from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifestJson from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import cohortIndexManifestJson from "../manifests/tcga-brca/tcga-brca.tiny-cohort-index.json";
import cohortManifestJson from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import tcgaE9A5flManifestJson from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import {
  DEFAULT_COHORT_MANIFEST_PATH,
  DEFAULT_OUTPUT_DIRECTORY,
  main,
} from "../src/app/build-tiny-cohort-static-app";
import type { CaseManifest } from "../src/contracts/case-manifest";
import type { CohortIndexManifest } from "../src/contracts/cohort-index";
import type { CohortManifest } from "../src/contracts/cohort-manifest";
import {
  renderCasePage,
  renderCohortIndexPage,
  renderSingleCaseStylesheet,
} from "../src/rendering/case-page";

const BUILD_SCRIPT_PATH = fileURLToPath(
  new URL("../src/app/build-tiny-cohort-static-app.ts", import.meta.url),
);
const checkedCohortIndexManifest = cohortIndexManifestJson as CohortIndexManifest;
const checkedCohortManifest = cohortManifestJson as CohortManifest;
const [
  tcgaE9A5flManifestPath,
  tcga3cAalkManifestPath,
  tcga4hAaakManifestPath,
] = checkedCohortManifest.caseManifestPaths;

if (
  tcgaE9A5flManifestPath === undefined ||
  tcga3cAalkManifestPath === undefined ||
  tcga4hAaakManifestPath === undefined
) {
  throw new Error("Checked tiny cohort manifest must include three case manifests");
}

const checkedCaseManifestFiles = [
  {
    relativePath: tcgaE9A5flManifestPath,
    manifest: tcgaE9A5flManifestJson as CaseManifest,
  },
  {
    relativePath: tcga3cAalkManifestPath,
    manifest: tcga3cAalkManifestJson as CaseManifest,
  },
  {
    relativePath: tcga4hAaakManifestPath,
    manifest: tcga4hAaakManifestJson as CaseManifest,
  },
];
const checkedCaseManifests = checkedCaseManifestFiles.map(
  ({ manifest }) => manifest,
);

function buildCaseSlug(caseId: string): string {
  return caseId.toLowerCase();
}

function renderExpectedCohortIndexPage(): string {
  return renderCohortIndexPage(checkedCohortIndexManifest);
}

function renderExpectedCasePage(manifest: CaseManifest): string {
  return renderCasePage(manifest, {
    stylesheetHref: "../../styles.css",
    navigation: {
      cohortTitle: checkedCohortManifest.title,
      cohortIndexHref: "../../index.html",
      caseLinks: checkedCaseManifests.map((cohortCaseManifest) => ({
        caseId: cohortCaseManifest.case.caseId,
        href: `../${buildCaseSlug(cohortCaseManifest.case.caseId)}/index.html`,
        current: cohortCaseManifest.case.caseId === manifest.case.caseId,
      })),
    },
  });
}

async function writeCohortManifestBundle(manifestPath: string): Promise<void> {
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(checkedCohortManifest), "utf8");
  await writeFile(
    join(dirname(manifestPath), checkedCohortManifest.cohortIndexPath),
    JSON.stringify(checkedCohortIndexManifest),
    "utf8",
  );

  for (const { relativePath, manifest } of checkedCaseManifestFiles) {
    const caseManifestPath = join(dirname(manifestPath), relativePath);

    await mkdir(dirname(caseManifestPath), { recursive: true });
    await writeFile(caseManifestPath, JSON.stringify(manifest), "utf8");
  }
}

async function runBuildScriptDirectly(
  projectRoot: string,
  argv: string[] = [],
): Promise<{ exitCode: number; stderr: string }> {
  const subprocess = Bun.spawn([process.execPath, "run", BUILD_SCRIPT_PATH, ...argv], {
    cwd: projectRoot,
    stdout: "ignore",
    stderr: "pipe",
  });
  const [exitCode, stderr] = await Promise.all([
    subprocess.exited,
    new Response(subprocess.stderr).text(),
  ]);

  return { exitCode, stderr };
}

async function expectBuiltAssets(outputDirectory: string): Promise<void> {
  expect(await readFile(join(outputDirectory, "index.html"), "utf8")).toBe(
    renderExpectedCohortIndexPage(),
  );
  expect(await readFile(join(outputDirectory, "styles.css"), "utf8")).toBe(
    renderSingleCaseStylesheet(),
  );

  for (const manifest of checkedCaseManifests) {
    expect(
      await readFile(
        join(
          outputDirectory,
          "cases",
          buildCaseSlug(manifest.case.caseId),
          "index.html",
        ),
        "utf8",
      ),
    ).toBe(renderExpectedCasePage(manifest));
  }
}

export async function coverBuildTinyCohortStaticAppMain(
  argv: string[],
): Promise<void> {
  const [, outputDirectory = DEFAULT_OUTPUT_DIRECTORY] = argv;

  await main(argv);
  await expectBuiltAssets(resolvePathFromCwd(outputDirectory));
}

describe("coverBuildTinyCohortStaticAppMain", () => {
  test("builds the static app when manifest and output paths are both provided", async () => {
    await withTempProjectRoot(
      "tiny-cohort-static-app-main-",
      async (projectRoot) => {
        const manifestPath = join(
          projectRoot,
          "dist",
          "tcga-brca-manifest-export",
          "tcga-brca.tiny-cohort-manifest.json",
        );
        const outputDirectory = "dist/tcga-brca-tiny-cohort-from-export";

        await writeCohortManifestBundle(manifestPath);
        await coverBuildTinyCohortStaticAppMain([
          "dist/tcga-brca-manifest-export/tcga-brca.tiny-cohort-manifest.json",
          outputDirectory,
        ]);
      },
    );
  });

  test("uses the default output directory when only a manifest path is provided", async () => {
    await withTempProjectRoot(
      "tiny-cohort-static-app-main-",
      async (projectRoot) => {
        const manifestPath = join(
          projectRoot,
          "fixtures",
          "exported",
          "tcga-brca.tiny-cohort-manifest.json",
        );

        await writeCohortManifestBundle(manifestPath);
        await coverBuildTinyCohortStaticAppMain([
          "fixtures/exported/tcga-brca.tiny-cohort-manifest.json",
        ]);
      },
    );
  });

  test("uses the default manifest and output paths when argv is empty", async () => {
    await withTempProjectRoot(
      "tiny-cohort-static-app-main-",
      async (projectRoot) => {
        await writeCohortManifestBundle(
          join(projectRoot, DEFAULT_COHORT_MANIFEST_PATH),
        );

        await coverBuildTinyCohortStaticAppMain([]);
      },
    );
  });

  test("invokes main when the module is run directly with Bun", async () => {
    await withTempProjectRoot(
      "tiny-cohort-static-app-main-",
      async (projectRoot) => {
        await writeCohortManifestBundle(
          join(projectRoot, DEFAULT_COHORT_MANIFEST_PATH),
        );

        const { exitCode, stderr } = await runBuildScriptDirectly(projectRoot);

        expect(exitCode).toBe(0);
        expect(stderr).toBe("");
        await expectBuiltAssets(join(projectRoot, DEFAULT_OUTPUT_DIRECTORY));
      },
    );
  });
});
