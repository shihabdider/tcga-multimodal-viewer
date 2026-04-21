import { describe, expect, test } from "bun:test";

import recipe from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import type { TinyMutationSelector } from "../src/contracts/tiny-cohort-export";
import { validateTinyMutationSelector } from "../src/contracts/tiny-cohort-export.validation";

const validSelector: TinyMutationSelector = recipe.cases[2].mutationSelectors[0];

function makeSelector(overrides: Record<string, unknown> = {}): unknown {
  return {
    ...validSelector,
    ...overrides,
  };
}

describe("validateTinyMutationSelector", () => {
  test("accepts the checked-in pinned mutation selector used to match a public MAF row", () => {
    expect(validateTinyMutationSelector(validSelector)).toEqual(validSelector);
  });

  test("returns only the bounded row-matching fields from the selector contract", () => {
    expect(
      validateTinyMutationSelector(
        makeSelector({
          impact: "HIGH",
          tumorAltCount: 12,
        }),
      ),
    ).toEqual(validSelector);
  });

  test("throws when the selector is not a plain object", () => {
    for (const invalidValue of [null, [], "TP53", 42]) {
      expect(() => validateTinyMutationSelector(invalidValue)).toThrow(
        /TinyMutationSelector must be an object/,
      );
    }
  });

  test("throws when a required selector field is missing, blank, or not a string", () => {
    expect(() =>
      validateTinyMutationSelector(
        makeSelector({
          geneSymbol: undefined,
        }),
      ),
    ).toThrow(/TinyMutationSelector\.geneSymbol must be a non-empty string/);

    expect(() =>
      validateTinyMutationSelector(
        makeSelector({
          proteinChange: "   ",
        }),
      ),
    ).toThrow(
      /TinyMutationSelector\.proteinChange must be a non-empty string/,
    );

    expect(() =>
      validateTinyMutationSelector(
        makeSelector({
          variantClassification: 7,
        }),
      ),
    ).toThrow(
      /TinyMutationSelector\.variantClassification must be a non-empty string/,
    );
  });
});
