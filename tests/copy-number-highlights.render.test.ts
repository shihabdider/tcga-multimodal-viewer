import { describe, expect, test } from "bun:test";

import type { CopyNumberHighlight } from "../src/contracts/case-manifest";
import { renderCopyNumberHighlightsSection } from "../src/rendering/case-page";

const typicalHighlights: CopyNumberHighlight[] = [
  { geneSymbol: "PIK3CA", copyNumber: 5 },
  { geneSymbol: "CDKN2A", copyNumber: 0 },
  { geneSymbol: "ERBB2", copyNumber: 4 },
];

describe("renderCopyNumberHighlightsSection", () => {
  test("renders a labeled gene-level copy-number highlight section with each gene and value", () => {
    const rendered = renderCopyNumberHighlightsSection(typicalHighlights);

    expect(rendered).toContain("Gene-level copy-number highlights");

    for (const highlight of typicalHighlights) {
      expect(rendered).toContain(highlight.geneSymbol);
      expect(rendered).toContain(String(highlight.copyNumber));
    }
  });

  test("renders a zero absolute copy-number value instead of treating it as absent", () => {
    const rendered = renderCopyNumberHighlightsSection([
      { geneSymbol: "CDKN2A", copyNumber: 0 },
    ]);

    expect(rendered).toContain("CDKN2A");
    expect(rendered).toContain("0");
    expect(rendered).not.toContain("No copy-number highlights available.");
  });

  test("renders an empty state when the collection is empty", () => {
    const rendered = renderCopyNumberHighlightsSection([]);

    expect(rendered).toContain("Gene-level copy-number highlights");
    expect(rendered).toContain("No copy-number highlights available.");
  });
});
