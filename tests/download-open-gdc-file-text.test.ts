import { afterEach, describe, expect, test } from "bun:test";
import { gzipSync } from "node:zlib";

import { downloadOpenGdcFileText } from "../src/app/export-tiny-cohort-manifests";

const originalFetch = globalThis.fetch;

function mockFetch(
  implementation: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>,
): void {
  globalThis.fetch = implementation as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("downloadOpenGdcFileText", () => {
  test("downloads plain-text open GDC source files from the public /data endpoint", async () => {
    const fileId = "1b465f36-4bde-4549-821f-5bc21443fcae";
    const expectedText = [
      "gene_name\tcopy_number",
      "ERBB2\t8",
      "MYC\t4",
    ].join("\n");
    let requestedUrl = "";

    mockFetch(async (input) => {
      requestedUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      return new Response(expectedText, {
        status: 200,
        headers: {
          "content-type": "text/tab-separated-values; charset=utf-8",
        },
      });
    });

    await expect(downloadOpenGdcFileText(fileId)).resolves.toBe(expectedText);
    expect(requestedUrl).toBe(`https://api.gdc.cancer.gov/data/${fileId}`);
  });

  test("gunzips gzip-compressed masked somatic mutation files before returning text", async () => {
    const fileId = "a5056a39-67d7-420c-82fc-3a086b6ec75e";
    const expectedText = [
      "#version 2.4",
      "Hugo_Symbol\tHGVSp_Short\tVariant_Classification\tIMPACT",
      "TP53\tp.H193R\tMissense_Mutation\tMODERATE",
    ].join("\n");

    mockFetch(async () =>
      new Response(gzipSync(expectedText), {
        status: 200,
        headers: {
          "content-type": "application/gzip",
        },
      }),
    );

    await expect(downloadOpenGdcFileText(fileId)).resolves.toBe(expectedText);
  });

  test("throws when the GDC endpoint responds with a non-success status", async () => {
    const fileId = "613b326e-f18c-4474-b169-f10273c1b065";

    mockFetch(async () =>
      new Response("upstream unavailable", {
        status: 503,
        statusText: "Service Unavailable",
      }),
    );

    await expect(downloadOpenGdcFileText(fileId)).rejects.toThrow(
      /Failed to download open GDC file 613b326e-f18c-4474-b169-f10273c1b065: 503 Service Unavailable/,
    );
  });

  test("throws when the downloaded body does not contain any non-whitespace text", async () => {
    const fileId = "307261f2-f88f-4658-b6d1-98ef946148e2";

    mockFetch(async () => new Response(" \n\t  "));

    await expect(downloadOpenGdcFileText(fileId)).rejects.toThrow(
      /Downloaded open GDC file 307261f2-f88f-4658-b6d1-98ef946148e2 must contain non-empty text/,
    );
  });

  test("wraps fetch failures with the pinned file id for easier debugging", async () => {
    const fileId = "cbdfdd9e-23cc-43b9-adcf-1fa92656e061";

    mockFetch(async () => {
      throw new Error("connect ETIMEDOUT");
    });

    await expect(downloadOpenGdcFileText(fileId)).rejects.toThrow(
      /Failed to download open GDC file cbdfdd9e-23cc-43b9-adcf-1fa92656e061: connect ETIMEDOUT/,
    );
  });
});
