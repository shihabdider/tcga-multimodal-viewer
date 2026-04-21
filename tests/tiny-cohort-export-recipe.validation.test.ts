import { describe, expect, test } from "bun:test";

import recipe from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import type { TinyCohortExportRecipe } from "../src/contracts/tiny-cohort-export";
import { validateTinyCohortExportRecipe } from "../src/contracts/tiny-cohort-export.validation";

const validRecipe: TinyCohortExportRecipe = recipe;

function makeRecipe(
  overrides: Partial<Record<keyof TinyCohortExportRecipe, unknown>> = {},
): unknown {
  return {
    ...validRecipe,
    ...overrides,
  };
}

describe("validateTinyCohortExportRecipe", () => {
  test("accepts the checked-in tiny cohort export recipe with cohort metadata, shared gene panels, and stable case order", () => {
    expect(validateTinyCohortExportRecipe(validRecipe)).toEqual(validRecipe);
  });

  test("drops unrelated top-level and nested case properties while preserving shared panel and case order", () => {
    const expressionGenePanel = [...validRecipe.expressionGenePanel].reverse();
    const copyNumberGenePanel = [...validRecipe.copyNumberGenePanel].reverse();
    const orderedCases = [...validRecipe.cases].reverse();

    expect(
      validateTinyCohortExportRecipe(
        makeRecipe({
          exportNote: "ignored",
          expressionGenePanel,
          copyNumberGenePanel,
          cases: orderedCases.map((caseRecipe, index) =>
            ({
              ...caseRecipe,
              exportRank: index + 1,
            }) as Record<string, unknown>,
          ),
        } as Record<string, unknown>),
      ),
    ).toEqual({
      ...validRecipe,
      expressionGenePanel,
      copyNumberGenePanel,
      cases: orderedCases,
    });
  });

  test("rejects values that are not plain objects", () => {
    for (const invalidValue of [null, [], "recipe", 17]) {
      expect(() => validateTinyCohortExportRecipe(invalidValue)).toThrow(
        /TinyCohortExportRecipe must be an object/,
      );
    }
  });

  test("rejects schema versions outside the bounded recipe contract", () => {
    expect(() =>
      validateTinyCohortExportRecipe(
        makeRecipe({ schemaVersion: "tiny-cohort-export-recipe/v2" }),
      ),
    ).toThrow(
      /TinyCohortExportRecipe\.schemaVersion must be "tiny-cohort-export-recipe\/v1"/,
    );
  });

  test("rejects missing or blank cohort metadata strings", () => {
    expect(() =>
      validateTinyCohortExportRecipe(makeRecipe({ cohortId: undefined })),
    ).toThrow(/TinyCohortExportRecipe\.cohortId must be a non-empty string/);

    expect(() =>
      validateTinyCohortExportRecipe(makeRecipe({ title: "   " })),
    ).toThrow(/TinyCohortExportRecipe\.title must be a non-empty string/);

    expect(() =>
      validateTinyCohortExportRecipe(makeRecipe({ description: 7 })),
    ).toThrow(/TinyCohortExportRecipe\.description must be a non-empty string/);
  });

  test("rejects projectIds outside the bounded TCGA-BRCA cohort scope", () => {
    expect(() =>
      validateTinyCohortExportRecipe(makeRecipe({ projectId: "TCGA-LUAD" })),
    ).toThrow(/TinyCohortExportRecipe\.projectId must be "TCGA-BRCA"/);
  });

  test("rejects missing, empty, or malformed shared gene panels", () => {
    expect(() =>
      validateTinyCohortExportRecipe(
        makeRecipe({ expressionGenePanel: undefined }),
      ),
    ).toThrow(
      /TinyCohortExportRecipe\.expressionGenePanel must be a non-empty array/,
    );

    expect(() =>
      validateTinyCohortExportRecipe(makeRecipe({ copyNumberGenePanel: [] })),
    ).toThrow(
      /TinyCohortExportRecipe\.copyNumberGenePanel must be a non-empty array/,
    );

    expect(() =>
      validateTinyCohortExportRecipe(
        makeRecipe({
          expressionGenePanel: [validRecipe.expressionGenePanel[0], "   "],
        }),
      ),
    ).toThrow(
      /TinyCohortExportRecipe\.expressionGenePanel\[1\] must be a non-empty string/,
    );
  });

  test("rejects missing, empty, or duplicate ordered case lists", () => {
    expect(() => validateTinyCohortExportRecipe(makeRecipe({ cases: undefined }))).toThrow(
      /TinyCohortExportRecipe\.cases must be a non-empty array/,
    );

    expect(() => validateTinyCohortExportRecipe(makeRecipe({ cases: [] }))).toThrow(
      /TinyCohortExportRecipe\.cases must be a non-empty array/,
    );

    expect(() =>
      validateTinyCohortExportRecipe(
        makeRecipe({
          cases: [validRecipe.cases[0], validRecipe.cases[0]],
        }),
      ),
    ).toThrow(/TinyCohortExportRecipe\.cases must contain unique caseIds/);
  });

  test("rejects invalid nested case recipes", () => {
    expect(() =>
      validateTinyCohortExportRecipe(
        makeRecipe({
          cases: [
            {
              ...validRecipe.cases[0],
              viewerHandoffSeed: {
                ...validRecipe.cases[0].viewerHandoffSeed,
                provider: "idc",
              },
            },
          ],
        }),
      ),
    ).toThrow(/IdcSlimViewerHandoffSeed\.provider must be "idc-slim"/);
  });
});
