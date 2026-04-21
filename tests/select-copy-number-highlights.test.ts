import { describe, expect, test } from "bun:test";

import { selectCopyNumberHighlights } from "../src/app/export-tiny-cohort-manifests";

const GENE_LEVEL_COPY_NUMBER_HEADER =
  "gene_id\tgene_name\tcopy_number\tmin_copy_number\tmax_copy_number";

function buildGeneLevelCopyNumberFile(rows: string[]): string {
  return [
    "# gene level copy number",
    "# workflow_type: ABSOLUTE LiftOver",
    GENE_LEVEL_COPY_NUMBER_HEADER,
    ...rows,
  ].join("\n");
}

describe("selectCopyNumberHighlights", () => {
  test("returns requested genes in configured panel order while ignoring comment lines", () => {
    const fileContents = buildGeneLevelCopyNumberFile([
      "ENSG00000141736.16\tERBB2\t4\t4\t4",
      "ENSG00000136997.13\tMYC\t7\t7\t7",
      "ENSG00000147889.18\tCDKN2A\t0\t0\t0",
      "ENSG00000121879.15\tPIK3CA\t5\t5\t5",
      "ENSG00000171431.6\tKRT5\t2\t2\t2",
    ]);

    expect(
      selectCopyNumberHighlights(fileContents, ["PIK3CA", "MYC", "CDKN2A", "ERBB2"]),
    ).toEqual([
      {
        geneSymbol: "PIK3CA",
        copyNumber: 5,
      },
      {
        geneSymbol: "MYC",
        copyNumber: 7,
      },
      {
        geneSymbol: "CDKN2A",
        copyNumber: 0,
      },
      {
        geneSymbol: "ERBB2",
        copyNumber: 4,
      },
    ]);
  });

  test("returns an empty list when the configured panel is empty", () => {
    expect(selectCopyNumberHighlights("", [])).toEqual([]);
  });

  test("throws when a requested gene is missing from the source file", () => {
    const fileContents = buildGeneLevelCopyNumberFile([
      "ENSG00000136997.13\tMYC\t7\t7\t7",
    ]);

    expect(() =>
      selectCopyNumberHighlights(fileContents, ["MYC", "ERBB2"]),
    ).toThrow(/Missing copy-number value for gene ERBB2/);
  });

  test("throws when a requested gene has a blank copy-number value", () => {
    const fileContents = buildGeneLevelCopyNumberFile([
      "ENSG00000141736.16\tERBB2\t\t4\t4",
    ]);

    expect(() => selectCopyNumberHighlights(fileContents, ["ERBB2"])).toThrow(
      /Malformed copy_number value for gene ERBB2/,
    );
  });

  test("throws when a requested gene has a malformed copy-number value", () => {
    const fileContents = buildGeneLevelCopyNumberFile([
      "ENSG00000141736.16\tERBB2\tnot-a-number\t4\t4",
    ]);

    expect(() => selectCopyNumberHighlights(fileContents, ["ERBB2"])).toThrow(
      /Malformed copy_number value for gene ERBB2/,
    );
  });

  test("throws when the source header is missing required columns", () => {
    const fileContents = [
      "# gene level copy number",
      "gene_id\tgene_name\tmin_copy_number\tmax_copy_number",
      "ENSG00000141736.16\tERBB2\t4\t4",
    ].join("\n");

    expect(() => selectCopyNumberHighlights(fileContents, ["ERBB2"])).toThrow(
      /Copy-number source file must include gene_name and copy_number columns/,
    );
  });
});
