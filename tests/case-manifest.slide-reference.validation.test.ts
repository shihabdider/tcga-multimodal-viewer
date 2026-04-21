import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type { SlideReference } from "../src/contracts/case-manifest";
import { validateSlideReference } from "../src/contracts/case-manifest.validation";

const validSlideReference: SlideReference = manifest.slides[0];

function buildExpectedSlimViewerUrl(
  handoff: Pick<
    SlideReference["viewerHandoff"],
    "studyInstanceUid" | "seriesInstanceUid"
  >,
): string {
  return `https://viewer.imaging.datacommons.cancer.gov/slim/studies/${handoff.studyInstanceUid}/series/${handoff.seriesInstanceUid}`;
}

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

  test("accepts the bounded external IDC Slim viewer handoff contract", () => {
    const validatedSlideReference = validateSlideReference(validSlideReference);

    expect(validatedSlideReference).toMatchObject({
      viewerHandoff: validSlideReference.viewerHandoff,
    });
    expect(validatedSlideReference.viewerHandoff.url).toBe(
      buildExpectedSlimViewerUrl(validatedSlideReference.viewerHandoff),
    );
  });

  test("rejects viewer handoff values outside the bounded external IDC Slim contract", () => {
    expect(() =>
      validateSlideReference(
        makeSlideReference({
          viewerHandoff: {
            ...validSlideReference.viewerHandoff,
            kind: "embedded",
          },
        }),
      ),
    ).toThrow(/PublicViewerHandoff\.kind must be "external"/);

    expect(() =>
      validateSlideReference(
        makeSlideReference({
          viewerHandoff: {
            ...validSlideReference.viewerHandoff,
            provider: "idc",
          },
        }),
      ),
    ).toThrow(/PublicViewerHandoff\.provider must be "idc-slim"/);

    expect(() =>
      validateSlideReference(
        makeSlideReference({
          viewerHandoff: {
            ...validSlideReference.viewerHandoff,
            studyInstanceUid: "not-a-dicom-uid",
          },
        }),
      ),
    ).toThrow(/PublicViewerHandoff\.studyInstanceUid must be a DICOM UID string/);

    expect(() =>
      validateSlideReference(
        makeSlideReference({
          viewerHandoff: {
            ...validSlideReference.viewerHandoff,
            seriesInstanceUid: "bad series uid",
          },
        }),
      ),
    ).toThrow(/PublicViewerHandoff\.seriesInstanceUid must be a DICOM UID string/);

    expect(() =>
      validateSlideReference(
        makeSlideReference({
          viewerHandoff: {
            ...validSlideReference.viewerHandoff,
            url: validSlideReference.publicPageUrl,
          },
        }),
      ),
    ).toThrow(
      /PublicViewerHandoff\.url must match the IDC Slim URL derived from studyInstanceUid and seriesInstanceUid/,
    );
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
