import { afterEach, describe, expect, test } from "bun:test";

import { fetchPublicSourceFileReference } from "../src/app/export-tiny-cohort-manifests";

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

describe("fetchPublicSourceFileReference", () => {
  test("fetches public GDC file metadata from /files/<id>?expand=analysis and maps it into SourceFileReference", async () => {
    const fileId = "c1f3f326-e99f-4811-9665-d15d6d8a1c33";
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
            "8b0bdebf-7292-4b66-bcf2-fcb0a06c24e3.rna_seq.augmented_star_gene_counts.tsv",
          data_type: "Gene Expression Quantification",
          analysis: {
            workflow_type: "STAR - Counts",
          },
        },
        warnings: {},
      });
    });

    await expect(fetchPublicSourceFileReference(fileId)).resolves.toEqual({
      fileId,
      fileName:
        "8b0bdebf-7292-4b66-bcf2-fcb0a06c24e3.rna_seq.augmented_star_gene_counts.tsv",
      dataType: "Gene Expression Quantification",
      workflow: "STAR - Counts",
    });
    expect(requestedUrl).toBe(
      `https://api.gdc.cancer.gov/files/${fileId}?expand=analysis`,
    );
  });

  test("rejects file metadata that is not publicly open", async () => {
    const fileId = "613b326e-f18c-4474-b169-f10273c1b065";

    mockFetch(async () =>
      jsonResponse({
        data: {
          access: "controlled",
          file_id: fileId,
          file_name: "private.rna_seq.tsv",
          data_type: "Gene Expression Quantification",
          analysis: {
            workflow_type: "STAR - Counts",
          },
        },
      }),
    );

    await expect(fetchPublicSourceFileReference(fileId)).rejects.toThrow(
      /Public GDC file 613b326e-f18c-4474-b169-f10273c1b065 must have open access/,
    );
  });

  test("rejects malformed metadata when the workflow field is missing", async () => {
    const fileId = "d5b3a491-d625-4526-bb70-a18df651b59a";

    mockFetch(async () =>
      jsonResponse({
        data: {
          access: "open",
          file_id: fileId,
          file_name:
            "TCGA-BRCA.absolute_liftover.gene_level_copy_number.v36.tsv",
          data_type: "Gene Level Copy Number",
          analysis: {},
        },
      }),
    );

    await expect(fetchPublicSourceFileReference(fileId)).rejects.toThrow(
      /Public GDC file metadata d5b3a491-d625-4526-bb70-a18df651b59a is malformed: SourceFileReference\.workflow must be a non-empty string/,
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

    await expect(fetchPublicSourceFileReference(fileId)).rejects.toThrow(
      /Failed to fetch public GDC file metadata 307261f2-f88f-4658-b6d1-98ef946148e2: 404 Not Found/,
    );
  });

  test("wraps fetch failures with the requested file id for easier debugging", async () => {
    const fileId = "cbdfdd9e-23cc-43b9-adcf-1fa92656e061";

    mockFetch(async () => {
      throw new Error("connect ETIMEDOUT");
    });

    await expect(fetchPublicSourceFileReference(fileId)).rejects.toThrow(
      /Failed to fetch public GDC file metadata cbdfdd9e-23cc-43b9-adcf-1fa92656e061: connect ETIMEDOUT/,
    );
  });
});
