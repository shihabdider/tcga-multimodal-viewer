import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type { CopyNumberHighlight } from "../src/contracts/case-manifest";
import { validateCopyNumberHighlight } from "../src/contracts/case-manifest.validation";

const validHighlight: CopyNumberHighlight =
  manifest.genomicSnapshot.copyNumberHighlights[0];

function makeCopyNumberHighlight(
  overrides: Partial<Record<keyof CopyNumberHighlight, unknown>> = {},
): unknown {
  return {
    ...validHighlight,
    ...overrides,
  };
}

describe("validateCopyNumberHighlight", () => {
  test("accepts the checked-in gene-level absolute copy-number highlight", () => {
    expect(validateCopyNumberHighlight(validHighlight)).toEqual(validHighlight);
  });

  test("accepts a zero absolute copy-number value", () => {
    expect(
      validateCopyNumberHighlight(
        makeCopyNumberHighlight({
          geneSymbol: "CDKN2A",
          copyNumber: 0,
        }),
      ),
    ).toEqual({
      geneSymbol: "CDKN2A",
      copyNumber: 0,
    });
  });

  test("rejects values that are not plain objects", () => {
    for (const invalidValue of [null, [], "MYC", 7]) {
      expect(() => validateCopyNumberHighlight(invalidValue)).toThrow(
        /CopyNumberHighlight must be an object/,
      );
    }
  });

  test("rejects missing or blank gene symbols", () => {
    expect(() =>
      validateCopyNumberHighlight(makeCopyNumberHighlight({ geneSymbol: undefined })),
    ).toThrow(/CopyNumberHighlight\.geneSymbol must be a non-empty string/);

    expect(() =>
      validateCopyNumberHighlight(makeCopyNumberHighlight({ geneSymbol: "   " })),
    ).toThrow(/CopyNumberHighlight\.geneSymbol must be a non-empty string/);
  });

  test("rejects missing, non-finite, or negative copy-number values", () => {
    for (const invalidValue of [undefined, "4", Number.POSITIVE_INFINITY, NaN, -1]) {
      expect(() =>
        validateCopyNumberHighlight(
          makeCopyNumberHighlight({ copyNumber: invalidValue }),
        ),
      ).toThrow(
        /CopyNumberHighlight\.copyNumber must be a finite non-negative number/,
      );
    }
  });
});
