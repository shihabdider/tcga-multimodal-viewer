import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type { GenomicSnapshot } from "../src/contracts/case-manifest";
import { renderGenomicSnapshotSection } from "../src/rendering/case-page";

function makeSnapshot(
  overrides: Partial<GenomicSnapshot> = {},
): GenomicSnapshot {
  return {
    ...manifest.genomicSnapshot,
    ...overrides,
  };
}

describe("renderGenomicSnapshotSection", () => {
  test("renders a genomic snapshot block that composes the bounded mutation, expression, and copy-number panels", () => {
    const rendered = renderGenomicSnapshotSection(manifest.genomicSnapshot);

    expect(rendered).toContain("Genomic snapshot");
    expect(rendered).toContain("Somatic mutation highlights");
    expect(rendered).toContain(
      manifest.genomicSnapshot.mutationHighlights[1].proteinChange,
    );
    expect(rendered).toContain("Expression highlights");
    expect(rendered).toContain('data-expression-metric="tpm_unstranded"');
    expect(rendered).toContain(
      String(manifest.genomicSnapshot.expressionHighlights[0].tpmUnstranded),
    );
    expect(rendered).toContain("Gene-level copy-number highlights");
    expect(rendered).toContain(
      String(manifest.genomicSnapshot.copyNumberHighlights[2].copyNumber),
    );

    expect(rendered.indexOf("Somatic mutation highlights")).toBeLessThan(
      rendered.indexOf("Expression highlights"),
    );
    expect(rendered.indexOf("Expression highlights")).toBeLessThan(
      rendered.indexOf("Gene-level copy-number highlights"),
    );
  });

  test("renders the wrapper plus each child empty state when all bounded highlight collections are empty", () => {
    const rendered = renderGenomicSnapshotSection(
      makeSnapshot({
        mutationHighlights: [],
        expressionHighlights: [],
        copyNumberHighlights: [],
      }),
    );

    expect(rendered).toContain("Genomic snapshot");
    expect(rendered).toContain("No somatic mutation highlights available.");
    expect(rendered).toContain("No expression highlights available.");
    expect(rendered).toContain("No copy-number highlights available.");
    expect(rendered).not.toContain("<li>");
  });
});
