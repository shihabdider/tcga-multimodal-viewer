import { describe, expect, test } from "bun:test";

import recipe from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import type { TinyCaseSelectedFileIds } from "../src/contracts/tiny-cohort-export";
import { validateTinyCaseSelectedFileIds } from "../src/contracts/tiny-cohort-export.validation";

const validSelectedFileIds: TinyCaseSelectedFileIds = recipe.cases[0].selectedFileIds;

function makeSelectedFileIds(
  overrides: Partial<Record<keyof TinyCaseSelectedFileIds, unknown>> = {},
): unknown {
  return {
    ...validSelectedFileIds,
    ...overrides,
  };
}

describe("validateTinyCaseSelectedFileIds", () => {
  test("accepts the checked-in pinned public GDC file ids for one tiny-cohort case", () => {
    expect(validateTinyCaseSelectedFileIds(validSelectedFileIds)).toEqual(
      validSelectedFileIds,
    );
  });

  test("returns only the four bounded file-id fields from the recipe contract", () => {
    expect(
      validateTinyCaseSelectedFileIds(
        makeSelectedFileIds({
          fileName: "ignored.tsv",
          dataType: "Masked Somatic Mutation",
        } as Record<string, unknown>),
      ),
    ).toEqual(validSelectedFileIds);
  });

  test("throws when selected file ids are not a plain object", () => {
    for (const invalidValue of [null, [], "file-ids", 42]) {
      expect(() => validateTinyCaseSelectedFileIds(invalidValue)).toThrow(
        /TinyCaseSelectedFileIds must be an object/,
      );
    }
  });

  test("throws when a required pinned file id is missing or malformed", () => {
    expect(() =>
      validateTinyCaseSelectedFileIds(
        makeSelectedFileIds({ maskedSomaticMutation: undefined }),
      ),
    ).toThrow(/TinyCaseSelectedFileIds\.maskedSomaticMutation must be a UUID string/);

    expect(() =>
      validateTinyCaseSelectedFileIds(
        makeSelectedFileIds({ geneExpression: "not-a-uuid" }),
      ),
    ).toThrow(/TinyCaseSelectedFileIds\.geneExpression must be a UUID string/);

    expect(() =>
      validateTinyCaseSelectedFileIds(
        makeSelectedFileIds({ geneLevelCopyNumber: "   " }),
      ),
    ).toThrow(/TinyCaseSelectedFileIds\.geneLevelCopyNumber must be a UUID string/);

    expect(() =>
      validateTinyCaseSelectedFileIds(makeSelectedFileIds({ slide: 7 })),
    ).toThrow(/TinyCaseSelectedFileIds\.slide must be a UUID string/);
  });
});
