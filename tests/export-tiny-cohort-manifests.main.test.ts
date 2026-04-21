import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

import tcga3cAalkManifestJson from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifestJson from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import cohortManifestJson from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import recipeJson from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import tcgaE9A5flManifestJson from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import {
  DEFAULT_TINY_COHORT_EXPORT_OUTPUT_DIRECTORY,
  DEFAULT_TINY_COHORT_EXPORT_RECIPE_PATH,
  main,
} from "../src/app/export-tiny-cohort-manifests";
import type {
  CaseManifest,
  SlideReference,
  SourceFileReference,
} from "../src/contracts/case-manifest";
import type { CohortManifest } from "../src/contracts/cohort-manifest";
import type { TinyCohortExportRecipe } from "../src/contracts/tiny-cohort-export";

const originalFetch = globalThis.fetch;
const repoRoot = join(import.meta.dir, "..");
const checkedRecipePath = join(
  repoRoot,
  "manifests",
  "tcga-brca",
  "tcga-brca.tiny-export-recipe.json",
);
const checkedInManifestDirectory = join(repoRoot, "manifests", "tcga-brca");
const cohortOutputPath = "tcga-brca.tiny-cohort-manifest.json";
const checkedRecipe = recipeJson as TinyCohortExportRecipe;
const checkedCohortManifest = cohortManifestJson as CohortManifest;
const checkedManifests = [
  tcgaE9A5flManifestJson,
  tcga3cAalkManifestJson,
  tcga4hAaakManifestJson,
] as CaseManifest[];
const checkedManifestByCaseId = new Map(
  checkedManifests.map((manifest) => [manifest.case.caseId, manifest]),
);
const sourceFileReferencesById = new Map<string, SourceFileReference>(
  checkedManifests.flatMap((manifest) =>
    Object.values(manifest.genomicSnapshot.sourceFiles).map((reference) => [
      reference.fileId,
      reference,
    ]),
  ),
);
const checkedSlidesByFileId = new Map<string, SlideReference>(
  checkedManifests.map((manifest) => [manifest.slides[0].fileId, manifest.slides[0]]),
);

const MASKED_SOMATIC_MUTATION_HEADER =
  "Hugo_Symbol\tHGVSp_Short\tVariant_Classification\tIMPACT\tTumor_Sample_Barcode";
const STAR_COUNTS_HEADER =
  "gene_id\tgene_name\tgene_type\tunstranded\tstranded_first\tstranded_second\ttpm_unstranded\tfpkm_unstranded\tfpkm_uq_unstranded";
const GENE_LEVEL_COPY_NUMBER_HEADER =
  "gene_id\tgene_name\tcopy_number\tmin_copy_number\tmax_copy_number";

function buildMaskedSomaticMutationFile(manifest: CaseManifest): string {
  const rows = [...manifest.genomicSnapshot.mutationHighlights]
    .reverse()
    .map(
      ({ geneSymbol, proteinChange, variantClassification, impact }) =>
        `${geneSymbol}\t${proteinChange}\t${variantClassification}\t${impact}\t${manifest.case.tumorSampleId}`,
    );

  return [
    "#version 2.4",
    "# gdc masked somatic mutation",
    MASKED_SOMATIC_MUTATION_HEADER,
    ...rows,
    `UNUSED1\tp.S1F\tMissense_Mutation\tLOW\t${manifest.case.caseId}-10A`,
  ].join("\n");
}

function buildStarCountsFile(manifest: CaseManifest): string {
  const rows = [...manifest.genomicSnapshot.expressionHighlights]
    .reverse()
    .map(
      ({ geneSymbol, tpmUnstranded }, index) =>
        `ENSG${index}\t${geneSymbol}\tprotein_coding\t0\t0\t0\t${tpmUnstranded}\t0\t0`,
    );

  return [
    "# gene expression quantification",
    "# workflow_type: STAR - Counts",
    STAR_COUNTS_HEADER,
    ...rows,
    "ENSG_UNUSED\tUNUSED1\tprotein_coding\t0\t0\t0\t1.5\t0\t0",
  ].join("\n");
}

function buildGeneLevelCopyNumberFile(manifest: CaseManifest): string {
  const rows = [...manifest.genomicSnapshot.copyNumberHighlights]
    .reverse()
    .map(
      ({ geneSymbol, copyNumber }, index) =>
        `ENSG_COPY_${index}\t${geneSymbol}\t${copyNumber}\t${copyNumber}\t${copyNumber}`,
    );

  return [
    "# gene level copy number",
    "# workflow_type: ABSOLUTE LiftOver",
    GENE_LEVEL_COPY_NUMBER_HEADER,
    ...rows,
    "ENSG_COPY_UNUSED\tUNUSED1\t2\t2\t2",
  ].join("\n");
}

const defaultDownloadTextByFileId = Object.fromEntries(
  checkedRecipe.cases.flatMap((caseRecipe) => {
    const manifest = checkedManifestByCaseId.get(caseRecipe.caseId);

    if (!manifest) {
      throw new Error(`Missing checked-in case manifest for ${caseRecipe.caseId}`);
    }

    return [
      [
        caseRecipe.selectedFileIds.maskedSomaticMutation,
        buildMaskedSomaticMutationFile(manifest),
      ],
      [caseRecipe.selectedFileIds.geneExpression, buildStarCountsFile(manifest)],
      [
        caseRecipe.selectedFileIds.geneLevelCopyNumber,
        buildGeneLevelCopyNumberFile(manifest),
      ],
    ];
  }),
) as Record<string, string>;

async function withTempProjectRoot(
  run: (projectRoot: string) => Promise<void>,
): Promise<void> {
  const projectRoot = await mkdtemp(
    join(tmpdir(), "export-tiny-cohort-manifests-main-"),
  );
  const previousWorkingDirectory = process.cwd();

  try {
    process.chdir(projectRoot);
    await run(projectRoot);
  } finally {
    process.chdir(previousWorkingDirectory);
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function writeCheckedInRecipe(recipePath: string): Promise<void> {
  await mkdir(dirname(recipePath), { recursive: true });
  await writeFile(recipePath, await readFile(checkedRecipePath, "utf8"), "utf8");
}

async function readCheckedInManifest(relativePath: string): Promise<string> {
  return readFile(join(checkedInManifestDirectory, relativePath), "utf8");
}

async function expectCheckedInManifestExport(
  outputDirectory: string,
): Promise<void> {
  const expectedOutputPaths = [
    cohortOutputPath,
    ...checkedCohortManifest.caseManifestPaths,
  ];

  for (const outputPath of expectedOutputPaths) {
    expect(await readFile(join(outputDirectory, outputPath), "utf8")).toBe(
      await readCheckedInManifest(outputPath),
    );
  }
}

function resolvePathFromCwd(path: string): string {
  return isAbsolute(path) ? path : join(process.cwd(), path);
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

function buildCaseMetadataResponse(manifest: CaseManifest): Response {
  return jsonResponse({
    data: {
      hits: [
        {
          case_id: manifest.case.gdcCaseId,
          submitter_id: manifest.case.caseId,
          primary_site: manifest.case.primarySite,
          disease_type: manifest.case.diseaseType,
          project: {
            project_id: manifest.case.projectId,
          },
          demographic: {
            gender: manifest.case.gender,
          },
          diagnoses: [
            {
              primary_diagnosis: manifest.case.primaryDiagnosis,
              diagnosis_is_primary_disease: true,
            },
          ],
          samples: [
            {
              submitter_id: `${manifest.case.caseId}-10A`,
              sample_type: "Blood Derived Normal",
            },
            {
              submitter_id: `${manifest.case.caseId}-01Z`,
              sample_type: "Primary Tumor",
            },
            {
              submitter_id: manifest.case.tumorSampleId,
              sample_type: "Primary Tumor",
            },
          ],
        },
      ],
    },
    warnings: {},
  });
}

function buildOpenSlideMetadataResponse(slide: SlideReference): Response {
  return jsonResponse({
    data: {
      access: slide.access,
      file_id: slide.fileId,
      file_name: slide.fileName,
      experimental_strategy: slide.experimentalStrategy,
      cases: [
        {
          samples: [
            {
              sample_type: slide.sampleType,
              portions: [
                {
                  slides: [
                    {
                      submitter_id: slide.slideSubmitterId,
                      slide_id: slide.slideId,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    warnings: {},
  });
}

function mockFetchWithCheckedInputs(requestedUrls?: string[]): void {
  globalThis.fetch = (async (input) => {
    const requestedUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    requestedUrls?.push(requestedUrl);

    const url = new URL(requestedUrl);
    const fileId = url.pathname.split("/").pop();

    if (url.origin !== "https://api.gdc.cancer.gov") {
      return new Response("unexpected origin", { status: 404 });
    }

    if (url.pathname === "/cases") {
      const filters = JSON.parse(url.searchParams.get("filters") ?? "null") as {
        content?: { value?: unknown };
      } | null;
      const caseId = Array.isArray(filters?.content?.value)
        ? filters.content?.value[0]
        : undefined;

      if (typeof caseId !== "string") {
        return new Response("missing case id", { status: 400 });
      }

      const manifest = checkedManifestByCaseId.get(caseId);

      if (!manifest) {
        return new Response("missing case metadata", { status: 404 });
      }

      return buildCaseMetadataResponse(manifest);
    }

    if (!fileId) {
      return new Response("missing file id", { status: 400 });
    }

    if (url.pathname.startsWith("/files/")) {
      if (url.searchParams.get("expand") === "analysis") {
        const sourceFileReference = sourceFileReferencesById.get(fileId);

        if (!sourceFileReference) {
          return new Response("missing source-file metadata", { status: 404 });
        }

        return jsonResponse({
          data: {
            access: "open",
            file_id: sourceFileReference.fileId,
            file_name: sourceFileReference.fileName,
            data_type: sourceFileReference.dataType,
            analysis: {
              workflow_type: sourceFileReference.workflow,
            },
          },
        });
      }

      if (url.searchParams.get("expand") === "cases.samples.portions.slides") {
        const slide = checkedSlidesByFileId.get(fileId);

        if (!slide) {
          return new Response("missing slide metadata", { status: 404 });
        }

        return buildOpenSlideMetadataResponse(slide);
      }

      return new Response("unexpected file metadata endpoint", { status: 404 });
    }

    if (url.pathname.startsWith("/data/")) {
      const downloadText = defaultDownloadTextByFileId[fileId];

      if (downloadText === undefined) {
        return new Response("missing file body", { status: 404 });
      }

      return new Response(downloadText, {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    return new Response("unexpected endpoint", { status: 404 });
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
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

    mockFetchWithCheckedInputs(requestedUrls);

    await withTempProjectRoot(async (projectRoot) => {
      const recipePath = join(projectRoot, "fixtures", "custom.tiny-export-recipe.json");
      const outputDirectory = join(
        projectRoot,
        "custom-dist",
        "tcga-brca-manifest-export",
      );

      await writeCheckedInRecipe(recipePath);
      await coverExportTinyCohortManifestsMain([
        join("fixtures", "custom.tiny-export-recipe.json"),
        join("custom-dist", "tcga-brca-manifest-export"),
      ]);
    });

    expect(
      requestedUrls.filter((url) =>
        url.startsWith("https://api.gdc.cancer.gov/cases"),
      ),
    ).toHaveLength(checkedRecipe.cases.length);
    expect(
      requestedUrls.filter((url) => url.includes("?expand=analysis")),
    ).toHaveLength(checkedRecipe.cases.length * 3);
    expect(
      requestedUrls.filter((url) =>
        url.includes("?expand=cases.samples.portions.slides"),
      ),
    ).toHaveLength(checkedRecipe.cases.length);
    expect(requestedUrls.filter((url) => url.includes("/data/"))).toHaveLength(
      checkedRecipe.cases.length * 3,
    );
  });

  test("uses the default output directory when only a recipe path is provided", async () => {
    mockFetchWithCheckedInputs();

    await withTempProjectRoot(async (projectRoot) => {
      const recipePath = join(projectRoot, "fixtures", "single-arg.tiny-export-recipe.json");
      const outputDirectory = join(
        projectRoot,
        DEFAULT_TINY_COHORT_EXPORT_OUTPUT_DIRECTORY,
      );

      await writeCheckedInRecipe(recipePath);
      await coverExportTinyCohortManifestsMain([
        join("fixtures", "single-arg.tiny-export-recipe.json"),
      ]);
    });
  });

  test("uses the default recipe and output paths relative to cwd when argv is empty", async () => {
    mockFetchWithCheckedInputs();

    await withTempProjectRoot(async (projectRoot) => {
      const recipePath = join(
        projectRoot,
        DEFAULT_TINY_COHORT_EXPORT_RECIPE_PATH,
      );
      const outputDirectory = join(
        projectRoot,
        DEFAULT_TINY_COHORT_EXPORT_OUTPUT_DIRECTORY,
      );

      await writeCheckedInRecipe(recipePath);
      await coverExportTinyCohortManifestsMain([]);
    });
  });
});
