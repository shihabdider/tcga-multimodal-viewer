import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type { SlideReference } from "../src/contracts/case-manifest";
import { validateSlideReference } from "../src/contracts/case-manifest.validation";

const validSlideReference: SlideReference = manifest.slides[0];

function makeSlideReference(
  overrides: Partial<Record<keyof SlideReference, unknown>> = {},
): unknown {
  return {
    ...validSlideReference,
    ...overrides,
  };
}

describe("validateSlideReference", () => {
  test("accepts the checked-in open GDC diagnostic slide reference", () => {
    expect(validateSlideReference(validSlideReference)).toEqual(validSlideReference);
  });

  test("accepts both supported experimental strategy variants", () => {
    expect(
      validateSlideReference(
        makeSlideReference({ experimentalStrategy: "Tissue Slide" }),
      ),
    ).toMatchObject({
      experimentalStrategy: "Tissue Slide",
    });
  });

  test("rejects values that are not plain objects", () => {
    for (const invalidValue of [null, [], "slide", 42]) {
      expect(() => validateSlideReference(invalidValue)).toThrow(
        /SlideReference must be an object/,
      );
    }
  });

  test("rejects source and access values outside the open GDC contract", () => {
    expect(() =>
      validateSlideReference(makeSlideReference({ source: "idc" })),
    ).toThrow(/SlideReference\.source must be "gdc"/);

    expect(() =>
      validateSlideReference(makeSlideReference({ access: "controlled" })),
    ).toThrow(/SlideReference\.access must be "open"/);
  });

  test("rejects malformed GDC identifier and sample-context fields", () => {
    expect(() =>
      validateSlideReference(
        makeSlideReference({ fileId: "not-a-uuid" }),
      ),
    ).toThrow(/SlideReference\.fileId must be a UUID string/);

    expect(() =>
      validateSlideReference(
        makeSlideReference({ slideSubmitterId: "   " }),
      ),
    ).toThrow(/SlideReference\.slideSubmitterId must be a non-empty string/);

    expect(() =>
      validateSlideReference(makeSlideReference({ slideId: "" })),
    ).toThrow(/SlideReference\.slideId must be a UUID string/);
  });

  test("rejects public handoff URLs that do not match the file id", () => {
    expect(() =>
      validateSlideReference(
        makeSlideReference({
          publicPageUrl:
            "https://portal.gdc.cancer.gov/files/00000000-0000-0000-0000-000000000000",
        }),
      ),
    ).toThrow(/SlideReference\.publicPageUrl must be the GDC public file page for fileId/);

    expect(() =>
      validateSlideReference(
        makeSlideReference({
          publicDownloadUrl:
            "https://api.gdc.cancer.gov/data/00000000-0000-0000-0000-000000000000",
        }),
      ),
    ).toThrow(
      /SlideReference\.publicDownloadUrl must be the GDC public download URL for fileId/,
    );
  });
});
