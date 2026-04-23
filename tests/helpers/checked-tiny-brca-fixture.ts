import { expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import tcga3cAalkManifestJson from "../../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifestJson from "../../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import cohortIndexJson from "../../manifests/tcga-brca/tcga-brca.tiny-cohort-index.json";
import cohortManifestJson from "../../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import recipeJson from "../../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import tcgaE9A5flManifestJson from "../../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type {
  CaseManifest,
  SlideReference,
  SourceFileReference,
} from "../../src/contracts/case-manifest";
import type { CohortIndexManifest } from "../../src/contracts/cohort-index";
import type { CohortManifest } from "../../src/contracts/cohort-manifest";
import type { TinyCohortExportRecipe } from "../../src/contracts/tiny-cohort-export";

const originalFetch = globalThis.fetch;
const repoRoot = join(import.meta.dir, "..", "..");
const checkedTinyBrcaManifestDirectory = join(repoRoot, "manifests", "tcga-brca");
const MASKED_SOMATIC_MUTATION_HEADER =
  "Hugo_Symbol\tHGVSp_Short\tVariant_Classification\tIMPACT\tTumor_Sample_Barcode";
const STAR_COUNTS_HEADER =
  "gene_id\tgene_name\tgene_type\tunstranded\tstranded_first\tstranded_second\ttpm_unstranded\tfpkm_unstranded\tfpkm_uq_unstranded";
const GENE_LEVEL_COPY_NUMBER_HEADER =
  "gene_id\tgene_name\tcopy_number\tmin_copy_number\tmax_copy_number";

export const checkedTinyBrcaRecipePath = join(
  checkedTinyBrcaManifestDirectory,
  "tcga-brca.tiny-export-recipe.json",
);
export const checkedTinyBrcaCohortManifestOutputPath =
  "tcga-brca.tiny-cohort-manifest.json";
export const checkedTinyBrcaCohortIndexOutputPath =
  "tcga-brca.tiny-cohort-index.json";
export const checkedTinyBrcaRecipe = recipeJson as TinyCohortExportRecipe;
export const checkedTinyBrcaCohortIndex = cohortIndexJson as CohortIndexManifest;
export const checkedTinyBrcaCohortManifest = cohortManifestJson as CohortManifest;
export const checkedTinyBrcaCaseManifests = [
  tcgaE9A5flManifestJson,
  tcga3cAalkManifestJson,
  tcga4hAaakManifestJson,
] as CaseManifest[];
export const checkedTinyBrcaManifestByCaseId = new Map<string, CaseManifest>(
  checkedTinyBrcaCaseManifests.map((manifest) => [manifest.case.caseId, manifest]),
);

const checkedTinyBrcaSourceFileReferencesById = new Map<
  string,
  SourceFileReference
>(
  checkedTinyBrcaCaseManifests.flatMap((manifest) =>
    Object.values(manifest.genomicSnapshot.sourceFiles).map((reference) => [
      reference.fileId,
      reference,
    ]),
  ),
);
const checkedTinyBrcaSlidesByFileId = new Map<string, SlideReference>(
  checkedTinyBrcaCaseManifests.map((manifest) => [
    manifest.slides[0].fileId,
    manifest.slides[0],
  ]),
);

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
  checkedTinyBrcaRecipe.cases.flatMap((caseRecipe) => {
    const manifest = checkedTinyBrcaManifestByCaseId.get(caseRecipe.caseId);

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

export async function readCheckedTinyBrcaManifest(
  relativePath: string,
): Promise<string> {
  return readFile(join(checkedTinyBrcaManifestDirectory, relativePath), "utf8");
}

export function expectCheckedTinyBrcaGdcRequestCounts(
  requestedUrls: string[],
): void {
  expect(
    requestedUrls.filter((url) =>
      url.startsWith("https://api.gdc.cancer.gov/cases"),
    ),
  ).toHaveLength(checkedTinyBrcaRecipe.cases.length);
  expect(requestedUrls.filter((url) => url.includes("?expand=analysis"))).toHaveLength(
    checkedTinyBrcaRecipe.cases.length * 3,
  );
  expect(
    requestedUrls.filter((url) =>
      url.includes("?expand=cases.samples.portions.slides"),
    ),
  ).toHaveLength(checkedTinyBrcaRecipe.cases.length);
  expect(requestedUrls.filter((url) => url.includes("/data/"))).toHaveLength(
    checkedTinyBrcaRecipe.cases.length * 3,
  );
}

export function restoreCheckedTinyBrcaFetchMock(): void {
  globalThis.fetch = originalFetch;
}

export function installCheckedTinyBrcaFetchMock(options: {
  requestedUrls?: string[];
  requestedCaseIds?: string[];
  caseMetadataDelayMsByCaseId?: Record<string, number>;
  downloadTextByFileId?: Record<string, string>;
} = {}): void {
  globalThis.fetch = (async (input) => {
    const requestedUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    options.requestedUrls?.push(requestedUrl);

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

      options.requestedCaseIds?.push(caseId);

      const delayMs = options.caseMetadataDelayMsByCaseId?.[caseId] ?? 0;

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const manifest = checkedTinyBrcaManifestByCaseId.get(caseId);

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
        const sourceFileReference = checkedTinyBrcaSourceFileReferencesById.get(fileId);

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
        const slide = checkedTinyBrcaSlidesByFileId.get(fileId);

        if (!slide) {
          return new Response("missing slide metadata", { status: 404 });
        }

        return buildOpenSlideMetadataResponse(slide);
      }

      return new Response("unexpected file metadata endpoint", { status: 404 });
    }

    if (url.pathname.startsWith("/data/")) {
      const downloadText =
        options.downloadTextByFileId?.[fileId] ?? defaultDownloadTextByFileId[fileId];

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
