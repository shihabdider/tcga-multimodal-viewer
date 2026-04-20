import { describe, expect, test } from "bun:test";

import type { MutationHighlight, MutationImpact } from "../src/contracts/case-manifest";
import { validateMutationHighlight } from "../src/contracts/case-manifest.validation";

const validHighlight: MutationHighlight = {
  geneSymbol: "TP53",
  proteinChange: "p.H193R",
  variantClassification: "Missense_Mutation",
  impact: "MODERATE",
};

describe("validateMutationHighlight", () => {
  test("returns a validated mutation highlight for a typical somatic mutation", () => {
    expect(validateMutationHighlight(validHighlight)).toEqual(validHighlight);
  });

  test("accepts each supported mutation impact variant", () => {
    const impacts: MutationImpact[] = ["HIGH", "MODERATE", "LOW", "MODIFIER"];

    for (const impact of impacts) {
      expect(
        validateMutationHighlight({
          ...validHighlight,
          impact,
        }),
      ).toEqual({
        ...validHighlight,
        impact,
      });
    }
  });

  test("throws for non-object inputs", () => {
    expect(() => validateMutationHighlight(null)).toThrow(
      /MutationHighlight must be an object/,
    );
    expect(() => validateMutationHighlight("TP53")).toThrow(
      /MutationHighlight must be an object/,
    );
    expect(() => validateMutationHighlight([validHighlight])).toThrow(
      /MutationHighlight must be an object/,
    );
  });

  test("throws when a required string field is missing, blank, or not a string", () => {
    expect(() =>
      validateMutationHighlight({
        geneSymbol: "TP53",
        variantClassification: "Missense_Mutation",
        impact: "MODERATE",
      }),
    ).toThrow(/MutationHighlight\.proteinChange must be a non-empty string/);

    expect(() =>
      validateMutationHighlight({
        ...validHighlight,
        geneSymbol: 53,
      }),
    ).toThrow(/MutationHighlight\.geneSymbol must be a non-empty string/);

    expect(() =>
      validateMutationHighlight({
        ...validHighlight,
        variantClassification: "",
      }),
    ).toThrow(
      /MutationHighlight\.variantClassification must be a non-empty string/,
    );
  });

  test("throws when impact is not one of the allowed values", () => {
    expect(() =>
      validateMutationHighlight({
        ...validHighlight,
        impact: "SEVERE",
      }),
    ).toThrow(
      /MutationHighlight\.impact must be one of HIGH, MODERATE, LOW, or MODIFIER/,
    );
  });
});
