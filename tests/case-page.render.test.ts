import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type { CaseManifest, GenomicSnapshot } from "../src/contracts/case-manifest";
import {
  renderCaseMetadataSection,
  renderCasePage,
  renderGenomicSnapshotSection,
} from "../src/rendering/case-page";

function makeSnapshot(
  overrides: Partial<GenomicSnapshot> = {},
): GenomicSnapshot {
  return {
    ...manifest.genomicSnapshot,
    ...overrides,
  };
}

function makeManifest(overrides: Partial<CaseManifest> = {}): CaseManifest {
  return {
    ...manifest,
    ...overrides,
  };
}

describe("renderCasePage", () => {
  test("renders a full HTML document that composes the manifest-driven case and genomic sections", () => {
    const rendered = renderCasePage(manifest);
    const renderedCaseMetadata = renderCaseMetadataSection(manifest.case);
    const renderedGenomicSnapshot = renderGenomicSnapshotSection(
      manifest.genomicSnapshot,
    );

    expect(rendered).toStartWith("<!DOCTYPE html>");
    expect(rendered).toContain('<html lang="en">');
    expect(rendered).toContain("<head>");
    expect(rendered).toContain('<meta charset="utf-8">');
    expect(rendered).toContain(
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    );
    expect(rendered).toContain(`<title>${manifest.case.caseId}`);
    expect(rendered).toContain(
      '<link rel="stylesheet" href="styles.css">',
    );
    expect(rendered).toContain("<body>");
    expect(rendered).toContain("<main>");
    expect(rendered).toContain(`<h1>${manifest.case.caseId}</h1>`);
    expect(rendered).toContain(renderedCaseMetadata);
    expect(rendered).toContain(renderedGenomicSnapshot);
    expect(rendered).toContain(manifest.case.primaryDiagnosis);
    expect(rendered).toContain(
      manifest.genomicSnapshot.mutationHighlights[0].geneSymbol,
    );
    expect(rendered).toContain(manifest.slides[0].slideSubmitterId);
    expect(rendered).toContain(manifest.slides[0].viewerHandoff.url);

    expect(rendered.indexOf(renderedCaseMetadata)).toBeLessThan(
      rendered.indexOf(renderedGenomicSnapshot),
    );
  });

  test("renders the full document shell even when the genomic highlight collections are empty", () => {
    const manifestWithEmptyHighlights = makeManifest({
      genomicSnapshot: makeSnapshot({
        mutationHighlights: [],
        expressionHighlights: [],
        copyNumberHighlights: [],
      }),
      slides: [],
    });

    const rendered = renderCasePage(manifestWithEmptyHighlights);

    expect(rendered).toStartWith("<!DOCTYPE html>");
    expect(rendered).toContain(`<title>${manifest.case.caseId}`);
    expect(rendered).toContain(
      renderCaseMetadataSection(manifestWithEmptyHighlights.case),
    );
    expect(rendered).toContain(
      renderGenomicSnapshotSection(manifestWithEmptyHighlights.genomicSnapshot),
    );
    expect(rendered).toContain("No somatic mutation highlights available.");
    expect(rendered).toContain("No expression highlights available.");
    expect(rendered).toContain("No copy-number highlights available.");
    expect(rendered).not.toContain("undefined");
  });
});
