import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type { GenomicSnapshot } from "../src/contracts/case-manifest";
import { validateGenomicSnapshot } from "../src/contracts/case-manifest.validation";

const validSnapshot: GenomicSnapshot = manifest.genomicSnapshot;

function makeGenomicSnapshot(
  overrides: Partial<Record<keyof GenomicSnapshot, unknown>> = {},
): unknown {
  return {
    ...validSnapshot,
    ...overrides,
  };
}

describe("validateGenomicSnapshot", () => {
  test("accepts the checked-in bounded genomic snapshot", () => {
    expect(validateGenomicSnapshot(validSnapshot)).toEqual(validSnapshot);
  });

  test("drops unrelated top-level and nested source-file properties", () => {
    expect(
      validateGenomicSnapshot({
        ...validSnapshot,
        note: "extra",
        sourceFiles: {
          ...validSnapshot.sourceFiles,
          geneExpression: {
            ...validSnapshot.sourceFiles.geneExpression,
            size: 12345,
          },
        },
      }),
    ).toEqual(validSnapshot);
  });

  test("accepts empty mutation, expression, and copy-number highlight collections", () => {
    expect(
      validateGenomicSnapshot(
        makeGenomicSnapshot({
          mutationHighlights: [],
          expressionHighlights: [],
          copyNumberHighlights: [],
        }),
      ),
    ).toEqual({
      ...validSnapshot,
      mutationHighlights: [],
      expressionHighlights: [],
      copyNumberHighlights: [],
    });
  });

  test("rejects values that are not plain objects", () => {
    for (const invalidValue of [null, [], "snapshot", 17]) {
      expect(() => validateGenomicSnapshot(invalidValue)).toThrow(
        /GenomicSnapshot must be an object/,
      );
    }
  });

  test("rejects missing or non-object sourceFiles blocks", () => {
    expect(() =>
      validateGenomicSnapshot(makeGenomicSnapshot({ sourceFiles: undefined })),
    ).toThrow(/GenomicSnapshot\.sourceFiles must be an object/);

    expect(() =>
      validateGenomicSnapshot(makeGenomicSnapshot({ sourceFiles: [] })),
    ).toThrow(/GenomicSnapshot\.sourceFiles must be an object/);
  });

  test("rejects missing or invalid required source-file references", () => {
    expect(() =>
      validateGenomicSnapshot(
        makeGenomicSnapshot({
          sourceFiles: {
            ...validSnapshot.sourceFiles,
            geneLevelCopyNumber: undefined,
          },
        }),
      ),
    ).toThrow(/SourceFileReference must be an object/);

    expect(() =>
      validateGenomicSnapshot(
        makeGenomicSnapshot({
          sourceFiles: {
            ...validSnapshot.sourceFiles,
            maskedSomaticMutation: {
              ...validSnapshot.sourceFiles.maskedSomaticMutation,
              fileId: "",
            },
          },
        }),
      ),
    ).toThrow(/SourceFileReference\.fileId must be a non-empty string/);
  });

  test("rejects expressionMetric values outside the bounded contract", () => {
    expect(() =>
      validateGenomicSnapshot(
        makeGenomicSnapshot({ expressionMetric: "fpkm_unstranded" }),
      ),
    ).toThrow(/GenomicSnapshot\.expressionMetric must be "tpm_unstranded"/);
  });

  test("rejects highlight collections that are not arrays", () => {
    expect(() =>
      validateGenomicSnapshot(
        makeGenomicSnapshot({ mutationHighlights: "TP53" }),
      ),
    ).toThrow(/GenomicSnapshot\.mutationHighlights must be an array/);

    expect(() =>
      validateGenomicSnapshot(
        makeGenomicSnapshot({ expressionHighlights: {} }),
      ),
    ).toThrow(/GenomicSnapshot\.expressionHighlights must be an array/);

    expect(() =>
      validateGenomicSnapshot(
        makeGenomicSnapshot({ copyNumberHighlights: null }),
      ),
    ).toThrow(/GenomicSnapshot\.copyNumberHighlights must be an array/);
  });

  test("rejects invalid nested highlight entries", () => {
    expect(() =>
      validateGenomicSnapshot(
        makeGenomicSnapshot({
          mutationHighlights: [
            {
              ...validSnapshot.mutationHighlights[0],
              impact: "SEVERE",
            },
          ],
        }),
      ),
    ).toThrow(
      /MutationHighlight\.impact must be one of HIGH, MODERATE, LOW, or MODIFIER/,
    );

    expect(() =>
      validateGenomicSnapshot(
        makeGenomicSnapshot({
          expressionHighlights: [
            {
              geneSymbol: "ERBB2",
              tpmUnstranded: -1,
            },
          ],
        }),
      ),
    ).toThrow(
      /ExpressionHighlight\.tpmUnstranded must be a finite non-negative number/,
    );

    expect(() =>
      validateGenomicSnapshot(
        makeGenomicSnapshot({
          copyNumberHighlights: [
            {
              geneSymbol: "MYC",
              copyNumber: Number.POSITIVE_INFINITY,
            },
          ],
        }),
      ),
    ).toThrow(
      /CopyNumberHighlight\.copyNumber must be a finite non-negative number/,
    );
  });
});
