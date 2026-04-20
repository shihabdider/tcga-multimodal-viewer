import { describe, expect, test } from "bun:test";

import { validateExpressionHighlight } from "../src/contracts/case-manifest.validation";

describe("validateExpressionHighlight", () => {
  test("returns a validated highlight for a typical gene and TPM value", () => {
    expect(
      validateExpressionHighlight({
        geneSymbol: "KRT5",
        tpmUnstranded: 2452.7661,
      }),
    ).toEqual({
      geneSymbol: "KRT5",
      tpmUnstranded: 2452.7661,
    });
  });

  test("accepts a zero tpm_unstranded value", () => {
    expect(
      validateExpressionHighlight({
        geneSymbol: "PGR",
        tpmUnstranded: 0,
      }),
    ).toEqual({
      geneSymbol: "PGR",
      tpmUnstranded: 0,
    });
  });

  test("throws when the highlight is not an object", () => {
    for (const invalidValue of [null, "KRT5", 42, []]) {
      expect(() => validateExpressionHighlight(invalidValue)).toThrow(
        /ExpressionHighlight must be an object/,
      );
    }
  });

  test("throws when geneSymbol is missing or blank", () => {
    expect(() =>
      validateExpressionHighlight({ tpmUnstranded: 12.5 }),
    ).toThrow(/ExpressionHighlight\.geneSymbol must be a non-empty string/);

    expect(() =>
      validateExpressionHighlight({
        geneSymbol: "",
        tpmUnstranded: 12.5,
      }),
    ).toThrow(/ExpressionHighlight\.geneSymbol must be a non-empty string/);
  });

  test("throws when tpmUnstranded is missing, non-finite, or negative", () => {
    for (const invalidValue of [undefined, "12.5", Number.POSITIVE_INFINITY, -1]) {
      expect(() =>
        validateExpressionHighlight({
          geneSymbol: "ERBB2",
          tpmUnstranded: invalidValue,
        }),
      ).toThrow(
        /ExpressionHighlight\.tpmUnstranded must be a finite non-negative number/,
      );
    }
  });
});
