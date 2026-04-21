import { describe, expect, test } from "bun:test";

import recipe from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import { validateIdcSlimViewerHandoffSeed } from "../src/contracts/tiny-cohort-export.validation";

const validSeed = recipe.cases[0].viewerHandoffSeed;

function makeSeed(overrides: Record<string, unknown> = {}): unknown {
  return {
    ...validSeed,
    ...overrides,
  };
}

describe("validateIdcSlimViewerHandoffSeed", () => {
  test("accepts the checked-in bounded IDC Slim handoff seed", () => {
    expect(validateIdcSlimViewerHandoffSeed(validSeed)).toEqual(validSeed);
  });

  test("returns only the provider and DICOM UIDs needed to derive the public viewer URL", () => {
    expect(
      validateIdcSlimViewerHandoffSeed(
        makeSeed({
          kind: "external",
          url: "https://viewer.example.test/slim",
          studySize: 1,
        }),
      ),
    ).toEqual(validSeed);
  });

  test("throws when the seed is not a plain object", () => {
    for (const invalidValue of [null, [], "handoff", 42]) {
      expect(() => validateIdcSlimViewerHandoffSeed(invalidValue)).toThrow(
        /IdcSlimViewerHandoffSeed must be an object/,
      );
    }
  });

  test("throws when provider is outside the bounded IDC Slim contract", () => {
    expect(() =>
      validateIdcSlimViewerHandoffSeed(makeSeed({ provider: "idc" })),
    ).toThrow(/IdcSlimViewerHandoffSeed\.provider must be "idc-slim"/);
  });

  test("throws when study or series instance UIDs are missing or malformed", () => {
    expect(() =>
      validateIdcSlimViewerHandoffSeed(
        makeSeed({ studyInstanceUid: "not-a-dicom-uid" }),
      ),
    ).toThrow(
      /IdcSlimViewerHandoffSeed\.studyInstanceUid must be a DICOM UID string/,
    );

    expect(() =>
      validateIdcSlimViewerHandoffSeed(makeSeed({ seriesInstanceUid: "" })),
    ).toThrow(
      /IdcSlimViewerHandoffSeed\.seriesInstanceUid must be a DICOM UID string/,
    );
  });
});
