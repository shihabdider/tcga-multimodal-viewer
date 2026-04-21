import { afterEach, describe, expect, test } from "bun:test";

import { fetchPublicSlideReferenceBase } from "../src/app/export-tiny-cohort-manifests";

const originalFetch = globalThis.fetch;

function mockFetch(
  implementation: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>,
): void {
  globalThis.fetch = implementation as typeof fetch;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchPublicSlideReferenceBase", () => {
  test("fetches public slide metadata from /files/<id>?expand=cases.samples.portions.slides and derives every SlideReference field except viewerHandoff", async () => {
    const fileId = "93b26333-5723-4fa4-a4de-6124c04ab243";
    let requestedUrl = "";

    mockFetch(async (input) => {
      requestedUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      return jsonResponse({
        data: {
          access: "open",
          file_id: fileId,
          file_name:
            "TCGA-3C-AALK-01Z-00-DX1.4E6EB156-BB19-410F-878F-FC0EA7BD0B53.svs",
          experimental_strategy: "Diagnostic Slide",
          cases: [
            {
              samples: [
                {
                  portions: [
                    {
                      slides: [
                        {
                          submitter_id: "TCGA-3C-AALK-01Z-00-DX1",
                          slide_id: "f3edee5e-8b3d-4607-961f-4c3604c60b1d",
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
      });
    });

    await expect(fetchPublicSlideReferenceBase(fileId)).resolves.toEqual({
      source: "gdc",
      access: "open",
      fileId,
      fileName:
        "TCGA-3C-AALK-01Z-00-DX1.4E6EB156-BB19-410F-878F-FC0EA7BD0B53.svs",
      slideSubmitterId: "TCGA-3C-AALK-01Z-00-DX1",
      slideId: "f3edee5e-8b3d-4607-961f-4c3604c60b1d",
      sampleType: "Primary Tumor",
      experimentalStrategy: "Diagnostic Slide",
      publicPageUrl: `https://portal.gdc.cancer.gov/files/${fileId}`,
      publicDownloadUrl: `https://api.gdc.cancer.gov/data/${fileId}`,
    });
    expect(requestedUrl).toBe(
      `https://api.gdc.cancer.gov/files/${fileId}?expand=cases.samples.portions.slides`,
    );
  });

  test("rejects slide files that are not publicly open", async () => {
    const fileId = "613b326e-f18c-4474-b169-f10273c1b065";

    mockFetch(async () =>
      jsonResponse({
        data: {
          access: "controlled",
          file_id: fileId,
          file_name: "private-slide.svs",
          experimental_strategy: "Diagnostic Slide",
          cases: [
            {
              samples: [
                {
                  portions: [
                    {
                      slides: [
                        {
                          submitter_id: "TCGA-4H-AAAK-01Z-00-DX1",
                          slide_id: "f2f87165-aea3-4c46-9557-296d7f5ddb08",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    await expect(fetchPublicSlideReferenceBase(fileId)).rejects.toThrow(
      /Public GDC slide file 613b326e-f18c-4474-b169-f10273c1b065 must have open access/,
    );
  });

  test("rejects malformed metadata when nested slide details are missing", async () => {
    const fileId = "c1f3f326-e99f-4811-9665-d15d6d8a1c33";

    mockFetch(async () =>
      jsonResponse({
        data: {
          access: "open",
          file_id: fileId,
          file_name: "TCGA-E9-A5FL-01Z-00-DX1.missing-slide-id.svs",
          experimental_strategy: "Diagnostic Slide",
          cases: [
            {
              samples: [
                {
                  portions: [
                    {
                      slides: [
                        {
                          submitter_id: "TCGA-E9-A5FL-01Z-00-DX1",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    await expect(fetchPublicSlideReferenceBase(fileId)).rejects.toThrow(
      /Public GDC slide file metadata c1f3f326-e99f-4811-9665-d15d6d8a1c33 is malformed:/,
    );
  });

  test("throws when the metadata endpoint responds with a non-success status", async () => {
    const fileId = "307261f2-f88f-4658-b6d1-98ef946148e2";

    mockFetch(async () =>
      new Response("missing", {
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(fetchPublicSlideReferenceBase(fileId)).rejects.toThrow(
      /Failed to fetch public GDC slide file metadata 307261f2-f88f-4658-b6d1-98ef946148e2: 404 Not Found/,
    );
  });

  test("wraps fetch failures with the requested slide file id for easier debugging", async () => {
    const fileId = "cbdfdd9e-23cc-43b9-adcf-1fa92656e061";

    mockFetch(async () => {
      throw new Error("connect ETIMEDOUT");
    });

    await expect(fetchPublicSlideReferenceBase(fileId)).rejects.toThrow(
      /Failed to fetch public GDC slide file metadata cbdfdd9e-23cc-43b9-adcf-1fa92656e061: connect ETIMEDOUT/,
    );
  });
});
