import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import tcga3cAalkManifestJson from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifestJson from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import cohortManifestJson from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import recipeJson from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import tcgaE9A5flManifestJson from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import { buildTinyCohortStaticApp } from "../src/app/build-tiny-cohort-static-app";
import { exportTinyCohortManifests } from "../src/app/export-tiny-cohort-manifests";
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
const cohortManifestOutputPath = "tcga-brca.tiny-cohort-manifest.json";
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

const downloadTextByFileId = Object.fromEntries(
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

async function withTempDirectories(
  run: (paths: { exportDirectory: string; buildDirectory: string }) => Promise<void>,
): Promise<void> {
  const tempDirectory = await mkdtemp(join(tmpdir(), "tiny-cohort-export-build-"));

  try {
    await run({
      exportDirectory: join(tempDirectory, "exported-manifests"),
      buildDirectory: join(tempDirectory, "dist", "tcga-brca-tiny-cohort"),
    });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
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

function mockFetchWithCheckedInputs(requestedUrls: string[]): void {
  globalThis.fetch = (async (input) => {
    const requestedUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    requestedUrls.push(requestedUrl);

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
        ? filters.content.value[0]
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
      const fileText = downloadTextByFileId[fileId];

      if (fileText === undefined) {
        return new Response("missing file body", { status: 404 });
      }

      return new Response(fileText, {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    return new Response("unexpected endpoint", { status: 404 });
  }) as typeof fetch;
}

export async function coverTinyBrcaExportToStaticViewerThinSlice(): Promise<void> {
  const requestedUrls: string[] = [];

  mockFetchWithCheckedInputs(requestedUrls);

  await withTempDirectories(async ({ exportDirectory, buildDirectory }) => {
    const exportResult = await exportTinyCohortManifests({
      recipePath: checkedRecipePath,
      outputDirectory: exportDirectory,
    });

    expect(exportResult.cohortManifest).toEqual(checkedCohortManifest);
    expect(exportResult.caseManifests).toEqual(checkedManifests);
    expect(exportResult.files.map((file) => file.outputPath)).toEqual([
      cohortManifestOutputPath,
      ...checkedCohortManifest.caseManifestPaths,
    ]);

    const build = await buildTinyCohortStaticApp({
      manifestPath: join(exportDirectory, cohortManifestOutputPath),
      outputDirectory: buildDirectory,
    });

    expect(build.cohortId).toBe(checkedCohortManifest.cohortId);
    expect(build.caseIds).toEqual(
      checkedManifests.map((manifest) => manifest.case.caseId),
    );
    expect(build.assets.map((asset) => asset.outputPath)).toEqual([
      "index.html",
      "styles.css",
      ...checkedManifests.map(
        (manifest) => `cases/${manifest.case.caseId.toLowerCase()}/index.html`,
      ),
    ]);

    const renderedIndex = await readFile(join(buildDirectory, "index.html"), "utf8");

    expect(renderedIndex).toContain(checkedCohortManifest.title);
    expect(renderedIndex).toContain(checkedCohortManifest.description);

    for (const manifest of checkedManifests) {
      expect(renderedIndex).toContain(manifest.case.caseId);
      expect(renderedIndex).toContain(manifest.case.primaryDiagnosis);
      expect(renderedIndex).toContain(
        `cases/${manifest.case.caseId.toLowerCase()}/index.html`,
      );
      expect(renderedIndex).toContain(
        manifest.genomicSnapshot.mutationHighlights[0].geneSymbol,
      );
    }

    for (const manifest of checkedManifests) {
      const caseSlug = manifest.case.caseId.toLowerCase();
      const renderedCasePage = await readFile(
        join(buildDirectory, "cases", caseSlug, "index.html"),
        "utf8",
      );

      expect(renderedCasePage).toContain(manifest.case.caseId);
      expect(renderedCasePage).toContain('aria-label="Cohort navigation"');
      expect(renderedCasePage).toContain(
        `Back to ${checkedCohortManifest.title}`,
      );
      expect(renderedCasePage).toContain('href="../../index.html"');
      expect(renderedCasePage).toContain("Open public slide in IDC Slim viewer");
      expect(renderedCasePage).toContain(manifest.slides[0].viewerHandoff.url);

      for (const cohortCaseManifest of checkedManifests) {
        expect(renderedCasePage).toContain(
          `href="../${cohortCaseManifest.case.caseId.toLowerCase()}/index.html"`,
        );
      }

      expect(renderedCasePage).toContain(
        `href="../${caseSlug}/index.html" aria-current="page"`,
      );
    }
  });

  expect(
    requestedUrls.every((url) => url.startsWith("https://api.gdc.cancer.gov/")),
  ).toBe(true);
  expect(requestedUrls.filter((url) => url.startsWith("https://api.gdc.cancer.gov/cases"))).toHaveLength(
    checkedRecipe.cases.length,
  );
  expect(requestedUrls.filter((url) => url.includes("?expand=analysis"))).toHaveLength(
    checkedRecipe.cases.length * 3,
  );
  expect(
    requestedUrls.filter((url) =>
      url.includes("?expand=cases.samples.portions.slides"),
    ),
  ).toHaveLength(checkedRecipe.cases.length);
  expect(requestedUrls.filter((url) => url.includes("/data/"))).toHaveLength(
    checkedRecipe.cases.length * 3,
  );
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("coverTinyBrcaExportToStaticViewerThinSlice", () => {
  test(
    "exports the checked-in tiny BRCA recipe and builds a static viewer artifact with cohort index, navigation, and IDC Slim handoffs",
    coverTinyBrcaExportToStaticViewerThinSlice,
  );
});
