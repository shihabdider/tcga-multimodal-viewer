import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type { CaseMetadata } from "../src/contracts/case-manifest";
import { validateCaseMetadata } from "../src/contracts/case-manifest.validation";

const validCaseMetadata: CaseMetadata = manifest.case;

function makeCaseMetadata(overrides: Partial<Record<keyof CaseMetadata, unknown>> = {}): unknown {
  return {
    ...validCaseMetadata,
    ...overrides,
  };
}

describe("validateCaseMetadata", () => {
  test("accepts the checked-in TCGA-BRCA case metadata block", () => {
    expect(validateCaseMetadata(validCaseMetadata)).toEqual(validCaseMetadata);
  });

  test("rejects values that are not plain objects", () => {
    expect(() => validateCaseMetadata(null)).toThrow();
    expect(() => validateCaseMetadata([])).toThrow();
  });

  test("rejects case ids that are not TCGA case identifiers", () => {
    expect(() =>
      validateCaseMetadata(makeCaseMetadata({ caseId: "E9-A5FL" })),
    ).toThrow();
  });

  test("rejects project ids outside the bounded seed cohort", () => {
    expect(() =>
      validateCaseMetadata(makeCaseMetadata({ projectId: "TCGA-LUAD" })),
    ).toThrow();
  });

  test("rejects blank diagnosis context fields", () => {
    expect(() =>
      validateCaseMetadata(makeCaseMetadata({ primaryDiagnosis: "   " })),
    ).toThrow();
  });

  test("rejects tumor sample ids that do not anchor back to the case", () => {
    expect(() =>
      validateCaseMetadata(
        makeCaseMetadata({ tumorSampleId: "TCGA-AR-A1AR-01A" }),
      ),
    ).toThrow();
  });
});
