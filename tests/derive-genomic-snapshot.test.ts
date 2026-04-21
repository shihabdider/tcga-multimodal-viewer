import { afterEach, describe, expect, test } from "bun:test";

import checkedManifestJson from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import checkedRecipeJson from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import { deriveGenomicSnapshot } from "../src/app/export-tiny-cohort-manifests";
import type {
  GenomicSnapshot,
  SourceFileReference,
} from "../src/contracts/case-manifest";
import type {
  TinyCaseExportRecipe,
  TinyCohortExportRecipe,
} from "../src/contracts/tiny-cohort-export";

const originalFetch = globalThis.fetch;
const checkedManifest = checkedManifestJson as {
  case: { caseId: string };
  genomicSnapshot: GenomicSnapshot;
};
const checkedRecipe = checkedRecipeJson as TinyCohortExportRecipe;
const checkedCaseRecipe = checkedRecipe.cases.find(
  ({ caseId }) => caseId === checkedManifest.case.caseId,
);

if (!checkedCaseRecipe) {
  throw new Error(
    `Missing checked-in export recipe for case ${checkedManifest.case.caseId}`,
  );
}

const expectedSnapshot = checkedManifest.genomicSnapshot;
const sourceFileReferencesById = new Map<string, SourceFileReference>(
  Object.values(expectedSnapshot.sourceFiles).map((reference) => [
    reference.fileId,
    reference,
  ]),
);

const MASKED_SOMATIC_MUTATION_HEADER =
  "Hugo_Symbol\tHGVSp_Short\tVariant_Classification\tIMPACT\tTumor_Sample_Barcode";
const STAR_COUNTS_HEADER =
  "gene_id\tgene_name\tgene_type\tunstranded\tstranded_first\tstranded_second\ttpm_unstranded\tfpkm_unstranded\tfpkm_uq_unstranded";
const GENE_LEVEL_COPY_NUMBER_HEADER =
  "gene_id\tgene_name\tcopy_number\tmin_copy_number\tmax_copy_number";

function buildMaskedSomaticMutationFile(rows: string[]): string {
  return [
    "#version 2.4",
    "# gdc masked somatic mutation",
    MASKED_SOMATIC_MUTATION_HEADER,
    ...rows,
  ].join("\n");
}

function buildStarCountsFile(rows: string[]): string {
  return [
    "# gene expression quantification",
    "# workflow_type: STAR - Counts",
    STAR_COUNTS_HEADER,
    ...rows,
  ].join("\n");
}

function buildGeneLevelCopyNumberFile(rows: string[]): string {
  return [
    "# gene level copy number",
    "# workflow_type: ABSOLUTE LiftOver",
    GENE_LEVEL_COPY_NUMBER_HEADER,
    ...rows,
  ].join("\n");
}

function mockFetchWithOpenGdcFiles(options: {
  requestedUrls?: string[];
  downloadTextByFileId: Record<string, string>;
}): void {
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

    if (!fileId) {
      return new Response("missing file id", { status: 400 });
    }

    if (url.origin !== "https://api.gdc.cancer.gov") {
      return new Response("unexpected origin", { status: 404 });
    }

    if (url.pathname.startsWith("/files/")) {
      const reference = sourceFileReferencesById.get(fileId);

      if (!reference) {
        return new Response("missing metadata", { status: 404 });
      }

      return new Response(
        JSON.stringify({
          data: {
            access: "open",
            file_id: reference.fileId,
            file_name: reference.fileName,
            data_type: reference.dataType,
            analysis: {
              workflow_type: reference.workflow,
            },
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
          },
        },
      );
    }

    if (url.pathname.startsWith("/data/")) {
      const downloadText = options.downloadTextByFileId[fileId];

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

describe("deriveGenomicSnapshot", () => {
  test("combines pinned source-file metadata with parsed highlights while preserving bounded order", async () => {
    const requestedUrls: string[] = [];

    mockFetchWithOpenGdcFiles({
      requestedUrls,
      downloadTextByFileId: {
        [checkedCaseRecipe.selectedFileIds.maskedSomaticMutation]:
          buildMaskedSomaticMutationFile([
            "PHLDA3\tp.E78*\tNonsense_Mutation\tHIGH\tTCGA-E9-A5FL-01A",
            "TP53\tp.H193R\tMissense_Mutation\tMODERATE\tTCGA-E9-A5FL-01A",
            "ARID4B\tp.S1048*\tNonsense_Mutation\tHIGH\tTCGA-E9-A5FL-01A",
          ]),
        [checkedCaseRecipe.selectedFileIds.geneExpression]: buildStarCountsFile([
          "ENSG00000171431.6\tKRT5\tprotein_coding\t9000\t4500\t4500\t2452.7661\t2.0\t2.1",
          "ENSG00000121879.15\tPGR\tprotein_coding\t0\t0\t0\t0.0163\t0\t0",
          "ENSG00000091831.23\tESR1\tprotein_coding\t10\t5\t5\t4.5339\t0.1\t0.2",
          "ENSG00000141736.16\tERBB2\tprotein_coding\t100\t50\t50\t27.7342\t1.0\t1.1",
        ]),
        [checkedCaseRecipe.selectedFileIds.geneLevelCopyNumber]:
          buildGeneLevelCopyNumberFile([
            "ENSG00000147889.18\tCDKN2A\t0\t0\t0",
            "ENSG00000141736.16\tERBB2\t4\t4\t4",
            "ENSG00000136997.13\tMYC\t7\t7\t7",
            "ENSG00000121879.15\tPIK3CA\t5\t5\t5",
          ]),
      },
    });

    await expect(
      deriveGenomicSnapshot(
        checkedCaseRecipe,
        checkedRecipe.expressionGenePanel,
        checkedRecipe.copyNumberGenePanel,
      ),
    ).resolves.toEqual(expectedSnapshot);

    expect(requestedUrls.sort()).toEqual(
      [
        `https://api.gdc.cancer.gov/files/${checkedCaseRecipe.selectedFileIds.maskedSomaticMutation}?expand=analysis`,
        `https://api.gdc.cancer.gov/files/${checkedCaseRecipe.selectedFileIds.geneExpression}?expand=analysis`,
        `https://api.gdc.cancer.gov/files/${checkedCaseRecipe.selectedFileIds.geneLevelCopyNumber}?expand=analysis`,
        `https://api.gdc.cancer.gov/data/${checkedCaseRecipe.selectedFileIds.maskedSomaticMutation}`,
        `https://api.gdc.cancer.gov/data/${checkedCaseRecipe.selectedFileIds.geneExpression}`,
        `https://api.gdc.cancer.gov/data/${checkedCaseRecipe.selectedFileIds.geneLevelCopyNumber}`,
      ].sort(),
    );
  });

  test("returns bounded empty highlight collections when no selectors or gene panels are requested", async () => {
    const caseRecipe: TinyCaseExportRecipe = {
      ...checkedCaseRecipe,
      mutationSelectors: [],
    };

    mockFetchWithOpenGdcFiles({
      downloadTextByFileId: {
        [caseRecipe.selectedFileIds.maskedSomaticMutation]: "unused mutation body",
        [caseRecipe.selectedFileIds.geneExpression]: "unused expression body",
        [caseRecipe.selectedFileIds.geneLevelCopyNumber]: "unused copy-number body",
      },
    });

    await expect(
      deriveGenomicSnapshot(caseRecipe, [], []),
    ).resolves.toEqual({
      sourceFiles: expectedSnapshot.sourceFiles,
      mutationHighlights: [],
      expressionMetric: "tpm_unstranded",
      expressionHighlights: [],
      copyNumberHighlights: [],
    });
  });

  test("rejects when a requested expression highlight is missing from the downloaded file", async () => {
    mockFetchWithOpenGdcFiles({
      downloadTextByFileId: {
        [checkedCaseRecipe.selectedFileIds.maskedSomaticMutation]:
          buildMaskedSomaticMutationFile([
            "TP53\tp.H193R\tMissense_Mutation\tMODERATE\tTCGA-E9-A5FL-01A",
            "ARID4B\tp.S1048*\tNonsense_Mutation\tHIGH\tTCGA-E9-A5FL-01A",
            "PHLDA3\tp.E78*\tNonsense_Mutation\tHIGH\tTCGA-E9-A5FL-01A",
          ]),
        [checkedCaseRecipe.selectedFileIds.geneExpression]: buildStarCountsFile([
          "ENSG00000091831.23\tESR1\tprotein_coding\t10\t5\t5\t4.5339\t0.1\t0.2",
          "ENSG00000121879.15\tPGR\tprotein_coding\t0\t0\t0\t0.0163\t0\t0",
          "ENSG00000141736.16\tERBB2\tprotein_coding\t100\t50\t50\t27.7342\t1.0\t1.1",
        ]),
        [checkedCaseRecipe.selectedFileIds.geneLevelCopyNumber]:
          buildGeneLevelCopyNumberFile([
            "ENSG00000121879.15\tPIK3CA\t5\t5\t5",
            "ENSG00000136997.13\tMYC\t7\t7\t7",
            "ENSG00000147889.18\tCDKN2A\t0\t0\t0",
            "ENSG00000141736.16\tERBB2\t4\t4\t4",
          ]),
      },
    });

    await expect(
      deriveGenomicSnapshot(
        checkedCaseRecipe,
        checkedRecipe.expressionGenePanel,
        checkedRecipe.copyNumberGenePanel,
      ),
    ).rejects.toThrow(/Missing expression value for gene KRT5/);
  });
});
