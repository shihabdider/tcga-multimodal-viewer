import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type { CaseManifest } from "../src/contracts/case-manifest";
import { validateCaseManifest } from "../src/contracts/case-manifest.validation";

const validManifest: CaseManifest = manifest;

function makeCaseManifest(
  overrides: Partial<Record<keyof CaseManifest, unknown>> = {},
): unknown {
  return {
    ...validManifest,
    ...overrides,
  };
}

describe("validateCaseManifest", () => {
  test("accepts the checked-in TCGA-BRCA case manifest document", () => {
    expect(validateCaseManifest(validManifest)).toEqual(validManifest);
  });

  test("drops unrelated top-level and nested properties outside the contract", () => {
    expect(
      validateCaseManifest({
        ...validManifest,
        note: "extra",
        case: {
          ...validManifest.case,
          cohort: "seed",
        },
        genomicSnapshot: {
          ...validManifest.genomicSnapshot,
          note: "bounded",
        },
        slides: validManifest.slides.map((slide) => ({
          ...slide,
          viewer: "external",
          viewerHandoff: {
            ...slide.viewerHandoff,
            note: "public",
          },
        })),
      }),
    ).toEqual(validManifest);
  });

  test("accepts an empty slide list", () => {
    expect(
      validateCaseManifest(makeCaseManifest({ slides: [] })),
    ).toEqual({
      ...validManifest,
      slides: [],
    });
  });

  test("rejects values that are not plain objects", () => {
    for (const invalidValue of [null, [], "manifest", 17]) {
      expect(() => validateCaseManifest(invalidValue)).toThrow(
        /CaseManifest must be an object/,
      );
    }
  });

  test("rejects schema versions outside the bounded manifest contract", () => {
    expect(() =>
      validateCaseManifest(
        makeCaseManifest({ schemaVersion: "case-manifest/v2" }),
      ),
    ).toThrow(/CaseManifest\.schemaVersion must be "case-manifest\/v1"/);
  });

  test("rejects missing or invalid case blocks", () => {
    expect(() =>
      validateCaseManifest(makeCaseManifest({ case: undefined })),
    ).toThrow(/CaseMetadata must be an object/);

    expect(() =>
      validateCaseManifest(
        makeCaseManifest({
          case: {
            ...validManifest.case,
            caseId: "E9-A5FL",
          },
        }),
      ),
    ).toThrow(/CaseMetadata\.caseId must be a TCGA case identifier/);
  });

  test("rejects missing or invalid genomic snapshot blocks", () => {
    expect(() =>
      validateCaseManifest(makeCaseManifest({ genomicSnapshot: undefined })),
    ).toThrow(/GenomicSnapshot must be an object/);

    expect(() =>
      validateCaseManifest(
        makeCaseManifest({
          genomicSnapshot: {
            ...validManifest.genomicSnapshot,
            expressionMetric: "fpkm_unstranded",
          },
        }),
      ),
    ).toThrow(/GenomicSnapshot\.expressionMetric must be "tpm_unstranded"/);
  });

  test("rejects missing or non-array slide collections", () => {
    expect(() =>
      validateCaseManifest(makeCaseManifest({ slides: undefined })),
    ).toThrow(/CaseManifest\.slides must be an array/);

    expect(() =>
      validateCaseManifest(makeCaseManifest({ slides: {} })),
    ).toThrow(/CaseManifest\.slides must be an array/);
  });

  test("rejects invalid nested slide references", () => {
    expect(() =>
      validateCaseManifest(
        makeCaseManifest({
          slides: [
            {
              ...validManifest.slides[0],
              source: "idc",
            },
          ],
        }),
      ),
    ).toThrow(/SlideReference\.source must be "gdc"/);
  });
});
