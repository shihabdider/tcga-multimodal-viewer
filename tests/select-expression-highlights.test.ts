import { describe, expect, test } from "bun:test";

import { selectExpressionHighlights } from "../src/app/export-tiny-cohort-manifests";

const STAR_COUNTS_HEADER =
  "gene_id\tgene_name\tgene_type\tunstranded\tstranded_first\tstranded_second\ttpm_unstranded\tfpkm_unstranded\tfpkm_uq_unstranded";

function buildStarCountsFile(rows: string[]): string {
  return [
    "# gene expression quantification",
    "# workflow_type: STAR - Counts",
    STAR_COUNTS_HEADER,
    ...rows,
  ].join("\n");
}

describe("selectExpressionHighlights", () => {
  test("returns requested genes in configured panel order while ignoring comment lines", () => {
    const fileContents = buildStarCountsFile([
      "ENSG00000141736.16\tERBB2\tprotein_coding\t100\t50\t50\t27.7342\t1.0\t1.1",
      "ENSG00000091831.23\tESR1\tprotein_coding\t10\t5\t5\t4.5339\t0.1\t0.2",
      "ENSG00000121879.15\tPGR\tprotein_coding\t0\t0\t0\t0.0163\t0\t0",
      "ENSG00000171431.6\tKRT5\tprotein_coding\t9000\t4500\t4500\t2452.7661\t2.0\t2.1",
    ]);

    expect(
      selectExpressionHighlights(fileContents, ["ESR1", "PGR", "ERBB2"]),
    ).toEqual([
      {
        geneSymbol: "ESR1",
        tpmUnstranded: 4.5339,
      },
      {
        geneSymbol: "PGR",
        tpmUnstranded: 0.0163,
      },
      {
        geneSymbol: "ERBB2",
        tpmUnstranded: 27.7342,
      },
    ]);
  });

  test("accepts a zero TPM value for a requested gene", () => {
    const fileContents = buildStarCountsFile([
      "ENSG00000121879.15\tPGR\tprotein_coding\t0\t0\t0\t0\t0\t0",
    ]);

    expect(selectExpressionHighlights(fileContents, ["PGR"])).toEqual([
      {
        geneSymbol: "PGR",
        tpmUnstranded: 0,
      },
    ]);
  });

  test("throws when a requested gene is missing from the source file", () => {
    const fileContents = buildStarCountsFile([
      "ENSG00000091831.23\tESR1\tprotein_coding\t10\t5\t5\t4.5339\t0.1\t0.2",
    ]);

    expect(() =>
      selectExpressionHighlights(fileContents, ["ESR1", "KRT5"]),
    ).toThrow(/Missing expression value for gene KRT5/);
  });

  test("throws when a requested gene has a malformed TPM value", () => {
    const fileContents = buildStarCountsFile([
      "ENSG00000141736.16\tERBB2\tprotein_coding\t100\t50\t50\tnot-a-number\t1.0\t1.1",
    ]);

    expect(() => selectExpressionHighlights(fileContents, ["ERBB2"])).toThrow(
      /Malformed tpm_unstranded value for gene ERBB2/,
    );
  });

  test("throws when the source header is missing required columns", () => {
    const fileContents = [
      "# gene expression quantification",
      "gene_id\tgene_name\tgene_type\tfpkm_unstranded",
      "ENSG00000091831.23\tESR1\tprotein_coding\t0.1",
    ].join("\n");

    expect(() => selectExpressionHighlights(fileContents, ["ESR1"])).toThrow(
      /Expression source file must include gene_name and tpm_unstranded columns/,
    );
  });
});
