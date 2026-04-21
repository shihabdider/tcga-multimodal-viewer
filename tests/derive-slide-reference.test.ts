import { afterEach, describe, expect, test } from "bun:test";

import caseManifest3cAalkJson from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import caseManifest4hAaakJson from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import caseManifestE9A5flJson from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import recipeJson from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import { deriveSlideReference } from "../src/app/export-tiny-cohort-manifests";
import type { SlideReference } from "../src/contracts/case-manifest";
import type {
  TinyCaseExportRecipe,
  TinyCohortExportRecipe,
} from "../src/contracts/tiny-cohort-export";

const originalFetch = globalThis.fetch;
const checkedRecipe = recipeJson as TinyCohortExportRecipe;
const checkedManifests = [
  caseManifestE9A5flJson,
  caseManifest3cAalkJson,
  caseManifest4hAaakJson,
] as {
  case: { caseId: string };
  slides: SlideReference[];
}[];
const checkedSlidesByCaseId = new Map(
  checkedManifests.map((manifest) => [manifest.case.caseId, manifest.slides[0]]),
);
const checkedSlidesByFileId = new Map(
  checkedManifests.map((manifest) => [manifest.slides[0].fileId, manifest.slides[0]]),
);

function buildOpenSlideMetadataResponse(slide: SlideReference): Response {
  return new Response(
    JSON.stringify({
      data: {
        access: slide.access,
        file_id: slide.fileId,
        file_name: slide.fileName,
        experimental_strategy: slide.experimentalStrategy,
        cases: [
          {
            samples: [
              {
                sample_type: slide.sampleType,
                portions: [
                  {
                    slides: [
                      {
                        submitter_id: slide.slideSubmitterId,
                        slide_id: slide.slideId,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      warnings: {},
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
}

function mockFetchWithOpenSlides(options: { requestedUrls?: string[] } = {}): void {
  globalThis.fetch = (async (input) => {
    const requestedUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    options.requestedUrls?.push(requestedUrl);

    const url = new URL(requestedUrl);
    const fileId = url.pathname.split("/").pop();

    if (!fileId) {
      return new Response("missing file id", { status: 400 });
    }

    if (url.origin !== "https://api.gdc.cancer.gov") {
      return new Response("unexpected origin", { status: 404 });
    }

    if (!url.pathname.startsWith("/files/")) {
      return new Response("unexpected endpoint", { status: 404 });
    }

    const slide = checkedSlidesByFileId.get(fileId);

    if (!slide) {
      return new Response("missing slide metadata", { status: 404 });
    }

    return buildOpenSlideMetadataResponse(slide);
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("deriveSlideReference", () => {
  test("combines pinned public GDC slide metadata with the IDC Slim handoff seed to reproduce the checked-in slide reference for every recipe case", async () => {
    const requestedUrls: string[] = [];

    mockFetchWithOpenSlides({ requestedUrls });

    for (const caseRecipe of checkedRecipe.cases) {
      const expectedSlide = checkedSlidesByCaseId.get(caseRecipe.caseId);

      if (!expectedSlide) {
        throw new Error(`Missing checked-in slide for case ${caseRecipe.caseId}`);
      }

      await expect(deriveSlideReference(caseRecipe)).resolves.toEqual(expectedSlide);
    }

    expect(requestedUrls.sort()).toEqual(
      checkedRecipe.cases
        .map(
          ({ selectedFileIds }) =>
            `https://api.gdc.cancer.gov/files/${selectedFileIds.slide}?expand=cases.samples.portions.slides`,
        )
        .sort(),
    );
  });

  test("rejects when the derived slide reference fails the existing contract validation", async () => {
    const invalidCaseRecipe = {
      ...checkedRecipe.cases[0],
      viewerHandoffSeed: {
        ...checkedRecipe.cases[0].viewerHandoffSeed,
        studyInstanceUid: "not-a-dicom-uid",
      },
    } as unknown as TinyCaseExportRecipe;

    mockFetchWithOpenSlides();

    await expect(deriveSlideReference(invalidCaseRecipe)).rejects.toThrow(
      /PublicViewerHandoff\.studyInstanceUid must be a DICOM UID string/,
    );
  });
});
