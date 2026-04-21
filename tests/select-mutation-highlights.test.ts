import { describe, expect, test } from "bun:test";

import { selectMutationHighlights } from "../src/app/export-tiny-cohort-manifests";
import type { TinyMutationSelector } from "../src/contracts/tiny-cohort-export";

const MASKED_SOMATIC_MUTATION_HEADER =
  "Hugo_Symbol\tHGVSp_Short\tVariant_Classification\tIMPACT\tTumor_Sample_Barcode";

function buildMaskedSomaticMutationFile(rows: string[]): string {
  return [
    "#version 2.4",
    "# gdc masked somatic mutation",
    MASKED_SOMATIC_MUTATION_HEADER,
    ...rows,
  ].join("\n");
}

describe("selectMutationHighlights", () => {
  test("returns requested mutation highlights in recipe order while ignoring leading comment lines", () => {
    const fileContents = buildMaskedSomaticMutationFile([
      "PHLDA3\tp.E78*\tNonsense_Mutation\tHIGH\tTCGA-E9-A5FL-01A",
      "TP53\tp.H193R\tMissense_Mutation\tMODERATE\tTCGA-E9-A5FL-01A",
      "GATA3\tp.S308fs\tFrame_Shift_Del\tHIGH\tTCGA-E9-A5FL-01A",
      "ARID4B\tp.S1048*\tNonsense_Mutation\tHIGH\tTCGA-E9-A5FL-01A",
    ]);
    const selectors: TinyMutationSelector[] = [
      {
        geneSymbol: "TP53",
        proteinChange: "p.H193R",
        variantClassification: "Missense_Mutation",
      },
      {
        geneSymbol: "PHLDA3",
        proteinChange: "p.E78*",
        variantClassification: "Nonsense_Mutation",
      },
      {
        geneSymbol: "ARID4B",
        proteinChange: "p.S1048*",
        variantClassification: "Nonsense_Mutation",
      },
    ];

    expect(selectMutationHighlights(fileContents, selectors)).toEqual([
      {
        geneSymbol: "TP53",
        proteinChange: "p.H193R",
        variantClassification: "Missense_Mutation",
        impact: "MODERATE",
      },
      {
        geneSymbol: "PHLDA3",
        proteinChange: "p.E78*",
        variantClassification: "Nonsense_Mutation",
        impact: "HIGH",
      },
      {
        geneSymbol: "ARID4B",
        proteinChange: "p.S1048*",
        variantClassification: "Nonsense_Mutation",
        impact: "HIGH",
      },
    ]);
  });

  test("returns an empty list when the recipe does not request any mutation highlights", () => {
    expect(selectMutationHighlights("", [])).toEqual([]);
  });

  test("throws when a requested selector is missing from the masked mutation file", () => {
    const fileContents = buildMaskedSomaticMutationFile([
      "TP53\tp.H193R\tMissense_Mutation\tMODERATE\tTCGA-E9-A5FL-01A",
    ]);

    expect(() =>
      selectMutationHighlights(fileContents, [
        {
          geneSymbol: "ARID4B",
          proteinChange: "p.S1048*",
          variantClassification: "Nonsense_Mutation",
        },
      ]),
    ).toThrow(
      /Missing mutation highlight for selector ARID4B p\.S1048\* Nonsense_Mutation/,
    );
  });

  test("throws when a selector matches more than one MAF row", () => {
    const fileContents = buildMaskedSomaticMutationFile([
      "TP53\tp.H193R\tMissense_Mutation\tMODERATE\tTCGA-E9-A5FL-01A",
      "TP53\tp.H193R\tMissense_Mutation\tMODERATE\tTCGA-E9-A5FL-01A",
    ]);

    expect(() =>
      selectMutationHighlights(fileContents, [
        {
          geneSymbol: "TP53",
          proteinChange: "p.H193R",
          variantClassification: "Missense_Mutation",
        },
      ]),
    ).toThrow(
      /Ambiguous mutation highlight for selector TP53 p\.H193R Missense_Mutation/,
    );
  });

  test("throws when the source header is missing required MAF columns", () => {
    const fileContents = [
      "#version 2.4",
      "Hugo_Symbol\tHGVSp_Short\tVariant_Classification\tTumor_Sample_Barcode",
      "TP53\tp.H193R\tMissense_Mutation\tTCGA-E9-A5FL-01A",
    ].join("\n");

    expect(() =>
      selectMutationHighlights(fileContents, [
        {
          geneSymbol: "TP53",
          proteinChange: "p.H193R",
          variantClassification: "Missense_Mutation",
        },
      ]),
    ).toThrow(
      /Mutation source file must include Hugo_Symbol, HGVSp_Short, Variant_Classification, and IMPACT columns/,
    );
  });

  test("throws when a selected mutation row has an invalid IMPACT value", () => {
    const fileContents = buildMaskedSomaticMutationFile([
      "TP53\tp.H193R\tMissense_Mutation\tMEDIUM\tTCGA-E9-A5FL-01A",
    ]);

    expect(() =>
      selectMutationHighlights(fileContents, [
        {
          geneSymbol: "TP53",
          proteinChange: "p.H193R",
          variantClassification: "Missense_Mutation",
        },
      ]),
    ).toThrow(
      /Malformed IMPACT value for mutation TP53 p\.H193R Missense_Mutation/,
    );
  });
});
