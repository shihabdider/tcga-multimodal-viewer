import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import {
  buildSingleCaseStaticApp,
  DEFAULT_OUTPUT_DIRECTORY,
  DEFAULT_SEED_MANIFEST_PATH,
} from "../src/app/build-single-case-static-app";
import {
  renderCasePage,
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
