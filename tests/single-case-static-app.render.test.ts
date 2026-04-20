import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type { ExpressionHighlight } from "../src/contracts/case-manifest";
import {
  buildSingleCaseStaticApp,
  DEFAULT_OUTPUT_DIRECTORY,
  DEFAULT_SEED_MANIFEST_PATH,
} from "../src/app/build-single-case-static-app";
import {
  renderCasePage,
  renderExpressionHighlightsSection,
  renderGenomicSnapshotSection,
} from "../src/rendering/case-page";

describe("single-case static app rendering", () => {
  test.skip("renderCasePage surfaces manifest-driven case metadata and genomic values", () => {
    const rendered = renderCasePage(manifest);

    expect(rendered).toContain(manifest.case.caseId);
    expect(rendered).toContain(manifest.case.primaryDiagnosis);
    expect(rendered).toContain(manifest.case.tumorSampleId);
    expect(rendered).toContain(
      manifest.genomicSnapshot.mutationHighlights[0].geneSymbol,
    );
    expect(rendered).toContain(
      manifest.genomicSnapshot.expressionHighlights[3].geneSymbol,
    );
    expect(rendered).toContain(
      manifest.genomicSnapshot.copyNumberHighlights[1].geneSymbol,
    );
  });

  test.skip("renderGenomicSnapshotSection keeps each bounded highlight collection manifest-driven", () => {
    const rendered = renderGenomicSnapshotSection(manifest.genomicSnapshot);

    expect(rendered).toContain(manifest.genomicSnapshot.expressionMetric);
    expect(rendered).toContain(
      manifest.genomicSnapshot.mutationHighlights[1].proteinChange,
    );
    expect(rendered).toContain(
      String(manifest.genomicSnapshot.expressionHighlights[0].tpmUnstranded),
    );
    expect(rendered).toContain(
      String(manifest.genomicSnapshot.copyNumberHighlights[2].copyNumber),
    );
  });
});

describe("renderExpressionHighlightsSection", () => {
  test("renders the expression metric label plus each highlight value", () => {
    const highlights: ExpressionHighlight[] = [
      {
        geneSymbol: "ERBB2",
        tpmUnstranded: 27.7342,
      },
      {
        geneSymbol: "KRT5",
        tpmUnstranded: 2452.7661,
      },
    ];

    const rendered = renderExpressionHighlightsSection(
      "tpm_unstranded",
      highlights,
    );

    expect(rendered).toContain("Expression highlights");
    expect(rendered).toContain("TPM (unstranded)");
    expect(rendered).toContain('data-expression-metric="tpm_unstranded"');
    expect(rendered).toContain("ERBB2");
    expect(rendered).toContain("27.7342");
    expect(rendered).toContain("KRT5");
    expect(rendered).toContain("2452.7661");
    expect(rendered).not.toContain("No expression highlights available.");
  });

  test("renders zero-valued highlights without dropping the numeric value", () => {
    const rendered = renderExpressionHighlightsSection("tpm_unstranded", [
      {
        geneSymbol: "PGR",
        tpmUnstranded: 0,
      },
    ]);

    expect(rendered).toContain("PGR");
    expect(rendered).toContain(">0<");
  });

  test("renders a readable empty state when no expression highlights are present", () => {
    const rendered = renderExpressionHighlightsSection("tpm_unstranded", []);

    expect(rendered).toContain("Expression highlights");
    expect(rendered).toContain("TPM (unstranded)");
    expect(rendered).toContain('data-expression-metric="tpm_unstranded"');
    expect(rendered).toContain("No expression highlights available.");
  });
});

describe("buildSingleCaseStaticApp", () => {
  test.skip("loads the checked-in manifest and emits index.html plus a minimal companion asset", async () => {
    const build = await buildSingleCaseStaticApp({
      manifestPath: DEFAULT_SEED_MANIFEST_PATH,
      outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
    });

    expect(build.caseId).toBe(manifest.case.caseId);
    expect(build.outputDirectory).toBe(DEFAULT_OUTPUT_DIRECTORY);
    expect(build.assets.map((asset) => asset.outputPath).sort()).toEqual([
      "index.html",
      "styles.css",
    ]);
    expect(
      build.assets.find((asset) => asset.outputPath === "index.html")?.content,
    ).toContain(manifest.case.caseId);
    expect(
      build.assets.find((asset) => asset.outputPath === "index.html")?.content,
    ).toContain(manifest.case.primaryDiagnosis);
  });
});
