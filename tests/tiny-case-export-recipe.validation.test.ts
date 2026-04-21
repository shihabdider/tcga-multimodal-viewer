import { describe, expect, test } from "bun:test";

import recipe from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import type { TinyCaseExportRecipe } from "../src/contracts/tiny-cohort-export";
import { validateTinyCaseExportRecipe } from "../src/contracts/tiny-cohort-export.validation";

const validCaseRecipe: TinyCaseExportRecipe = recipe.cases[0];

function makeCaseRecipe(overrides: Record<string, unknown> = {}): unknown {
  return {
    ...validCaseRecipe,
    ...overrides,
  };
}

describe("validateTinyCaseExportRecipe", () => {
  test("accepts the checked-in tiny-case export recipe with pinned file ids, ordered mutation selectors, and IDC Slim handoff seed", () => {
    expect(validateTinyCaseExportRecipe(validCaseRecipe)).toEqual(validCaseRecipe);
  });

  test("accepts a single-selector case recipe and returns only the bounded fields from the contract", () => {
    expect(
      validateTinyCaseExportRecipe(
        makeCaseRecipe({
          exportNote: "ignored",
          selectedFileIds: {
            ...validCaseRecipe.selectedFileIds,
            fileName: "ignored.tsv",
          } as Record<string, unknown>,
          mutationSelectors: [
            {
              ...validCaseRecipe.mutationSelectors[1],
              rank: 1,
              tumorAltCount: 12,
            } as Record<string, unknown>,
          ],
          viewerHandoffSeed: {
            ...validCaseRecipe.viewerHandoffSeed,
            kind: "external",
            url: "https://viewer.example.test/slim",
          } as Record<string, unknown>,
        }),
      ),
    ).toEqual({
      caseId: validCaseRecipe.caseId,
      selectedFileIds: validCaseRecipe.selectedFileIds,
      mutationSelectors: [validCaseRecipe.mutationSelectors[1]],
      viewerHandoffSeed: validCaseRecipe.viewerHandoffSeed,
    });
  });

  test("throws when the case recipe is not a plain object", () => {
    for (const invalidValue of [null, [], "case-recipe", 42]) {
      expect(() => validateTinyCaseExportRecipe(invalidValue)).toThrow(
        /TinyCaseExportRecipe must be an object/,
      );
    }
  });

  test("throws when caseId is missing or not a TCGA case identifier", () => {
    expect(() =>
      validateTinyCaseExportRecipe(makeCaseRecipe({ caseId: undefined })),
    ).toThrow(/TinyCaseExportRecipe\.caseId must be a TCGA case identifier/);

    expect(() =>
      validateTinyCaseExportRecipe(makeCaseRecipe({ caseId: "tcga-e9-a5fl" })),
    ).toThrow(/TinyCaseExportRecipe\.caseId must be a TCGA case identifier/);
  });

  test("throws when selectedFileIds fails its nested validation", () => {
    expect(() =>
      validateTinyCaseExportRecipe(
        makeCaseRecipe({
          selectedFileIds: {
            ...validCaseRecipe.selectedFileIds,
            slide: "not-a-uuid",
          },
        }),
      ),
    ).toThrow(/TinyCaseSelectedFileIds\.slide must be a UUID string/);
  });

  test("throws when mutationSelectors is missing, empty, or not an array", () => {
    for (const invalidSelectors of [undefined, [], "TP53"]) {
      expect(() =>
        validateTinyCaseExportRecipe(
          makeCaseRecipe({ mutationSelectors: invalidSelectors }),
        ),
      ).toThrow(/TinyCaseExportRecipe\.mutationSelectors must be a non-empty array/);
    }
  });

  test("throws when a bounded mutation selector is malformed", () => {
    expect(() =>
      validateTinyCaseExportRecipe(
        makeCaseRecipe({
          mutationSelectors: [
            {
              ...validCaseRecipe.mutationSelectors[0],
              proteinChange: "   ",
            },
          ],
        }),
      ),
    ).toThrow(/TinyMutationSelector\.proteinChange must be a non-empty string/);
  });

  test("throws when viewerHandoffSeed fails its nested validation", () => {
    expect(() =>
      validateTinyCaseExportRecipe(
        makeCaseRecipe({
          viewerHandoffSeed: {
            ...validCaseRecipe.viewerHandoffSeed,
            provider: "idc",
          },
        }),
      ),
    ).toThrow(/IdcSlimViewerHandoffSeed\.provider must be "idc-slim"/);
  });
});
