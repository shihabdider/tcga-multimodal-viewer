import { afterEach, describe, expect, test } from "bun:test";

import { fetchPublicCaseMetadata } from "../src/app/export-tiny-cohort-manifests";

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

describe("fetchPublicCaseMetadata", () => {
  test("fetches public GDC case metadata by submitter id and derives the anchored primary-tumor sample id", async () => {
    const caseId = "TCGA-E9-A5FL";
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
          hits: [
            {
              id: "e3935ce4-64d3-4a66-ba11-d308b844b410",
              case_id: "e3935ce4-64d3-4a66-ba11-d308b844b410",
              submitter_id: caseId,
              primary_site: "Breast",
              disease_type: "Complex Epithelial Neoplasms",
              project: {
                project_id: "TCGA-BRCA",
              },
              demographic: {
                gender: "female",
              },
              diagnoses: [
                {
                  primary_diagnosis: "Metaplastic carcinoma, NOS",
                  diagnosis_is_primary_disease: true,
                },
                {
                  primary_diagnosis: "Recurrence, NOS",
                  diagnosis_is_primary_disease: false,
                },
              ],
              samples: [
                {
                  submitter_id: "TCGA-E9-A5FL-10A",
                  sample_type: "Blood Derived Normal",
                },
                {
                  submitter_id: "TCGA-E9-A5FL-01Z",
                  sample_type: "Primary Tumor",
                },
                {
                  submitter_id: "TCGA-E9-A5FL-01A",
                  sample_type: "Primary Tumor",
                },
              ],
            },
          ],
        },
        warnings: {},
      });
    });

    await expect(fetchPublicCaseMetadata(caseId)).resolves.toEqual({
      caseId,
      gdcCaseId: "e3935ce4-64d3-4a66-ba11-d308b844b410",
      projectId: "TCGA-BRCA",
      primarySite: "Breast",
      diseaseType: "Complex Epithelial Neoplasms",
      primaryDiagnosis: "Metaplastic carcinoma, NOS",
      gender: "female",
      tumorSampleId: "TCGA-E9-A5FL-01A",
    });

    const url = new URL(requestedUrl);

    expect(`${url.origin}${url.pathname}`).toBe("https://api.gdc.cancer.gov/cases");
    expect(url.searchParams.get("expand")).toBe(
      "demographic,diagnoses,samples,project",
    );
    expect(url.searchParams.get("size")).toBe("2");
    expect(JSON.parse(url.searchParams.get("filters") ?? "null")).toEqual({
      op: "in",
      content: {
        field: "submitter_id",
        value: [caseId],
      },
    });
  });

  test("rejects ambiguous cases with more than one bounded primary-tumor sample", async () => {
    const caseId = "TCGA-ZZ-0001";

    mockFetch(async () =>
      jsonResponse({
        data: {
          hits: [
            {
              case_id: "123e4567-e89b-12d3-a456-426614174000",
              submitter_id: caseId,
              primary_site: "Breast",
              disease_type: "Complex Epithelial Neoplasms",
              project: {
                project_id: "TCGA-BRCA",
              },
              demographic: {
                gender: "female",
              },
              diagnoses: [
                {
                  primary_diagnosis: "Metaplastic carcinoma, NOS",
                  diagnosis_is_primary_disease: true,
                },
              ],
              samples: [
                {
                  submitter_id: "TCGA-ZZ-0001-01A",
                  sample_type: "Primary Tumor",
                },
                {
                  submitter_id: "TCGA-ZZ-0001-01B",
                  sample_type: "Primary Tumor",
                },
              ],
            },
          ],
        },
      }),
    );

    await expect(fetchPublicCaseMetadata(caseId)).rejects.toThrow(
      /must resolve to exactly one bounded primary tumor sample/i,
    );
  });

  test("rejects cases that are missing a bounded primary-tumor sample", async () => {
    const caseId = "TCGA-ZZ-0002";

    mockFetch(async () =>
      jsonResponse({
        data: {
          hits: [
            {
              case_id: "123e4567-e89b-12d3-a456-426614174001",
              submitter_id: caseId,
              primary_site: "Breast",
              disease_type: "Complex Epithelial Neoplasms",
              project: {
                project_id: "TCGA-BRCA",
              },
              demographic: {
                gender: "female",
              },
              diagnoses: [
                {
                  primary_diagnosis: "Metaplastic carcinoma, NOS",
                  diagnosis_is_primary_disease: true,
                },
              ],
              samples: [
                {
                  submitter_id: "TCGA-ZZ-0002-01Z",
                  sample_type: "Primary Tumor",
                },
                {
                  submitter_id: "TCGA-ZZ-0002-10A",
                  sample_type: "Blood Derived Normal",
                },
              ],
            },
          ],
        },
      }),
    );

    await expect(fetchPublicCaseMetadata(caseId)).rejects.toThrow(
      /must resolve to exactly one bounded primary tumor sample/i,
    );
  });

  test("rejects malformed metadata when the case response does not contain a unique primary diagnosis", async () => {
    const caseId = "TCGA-ZZ-0003";

    mockFetch(async () =>
      jsonResponse({
        data: {
          hits: [
            {
              case_id: "123e4567-e89b-12d3-a456-426614174002",
              submitter_id: caseId,
              primary_site: "Breast",
              disease_type: "Complex Epithelial Neoplasms",
              project: {
                project_id: "TCGA-BRCA",
              },
              demographic: {
                gender: "female",
              },
              diagnoses: [
                {
                  diagnosis_is_primary_disease: true,
                },
              ],
              samples: [
                {
                  submitter_id: "TCGA-ZZ-0003-01A",
                  sample_type: "Primary Tumor",
                },
              ],
            },
          ],
        },
      }),
    );

    await expect(fetchPublicCaseMetadata(caseId)).rejects.toThrow(
      /Public GDC case metadata TCGA-ZZ-0003 is malformed: .*primary diagnosis/i,
    );
  });

  test("throws when the metadata endpoint responds with a non-success status", async () => {
    const caseId = "TCGA-ZZ-0004";

    mockFetch(async () =>
      new Response("missing", {
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(fetchPublicCaseMetadata(caseId)).rejects.toThrow(
      /Failed to fetch public GDC case metadata TCGA-ZZ-0004: 404 Not Found/,
    );
  });

  test("wraps fetch failures with the requested case id for easier debugging", async () => {
    const caseId = "TCGA-ZZ-0005";

    mockFetch(async () => {
      throw new Error("connect ETIMEDOUT");
    });

    await expect(fetchPublicCaseMetadata(caseId)).rejects.toThrow(
      /Failed to fetch public GDC case metadata TCGA-ZZ-0005: connect ETIMEDOUT/,
    );
  });
});
