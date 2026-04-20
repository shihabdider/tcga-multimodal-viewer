import { describe, expect, test } from "bun:test";

import type { MutationHighlight } from "../src/contracts/case-manifest";
import { renderMutationHighlightsSection } from "../src/rendering/case-page";

const singleHighlight: MutationHighlight = {
  geneSymbol: "TP53",
  proteinChange: "p.H193R",
  variantClassification: "Missense_Mutation",
  impact: "MODERATE",
};

describe("renderMutationHighlightsSection", () => {
  test("renders a single somatic mutation highlight with its key fields", () => {
    const rendered = renderMutationHighlightsSection([singleHighlight]);

    expect(rendered).toContain(singleHighlight.geneSymbol);
    expect(rendered).toContain(singleHighlight.proteinChange);
    expect(rendered).toContain(singleHighlight.variantClassification);
    expect(rendered).toContain(singleHighlight.impact);
  });

  test("renders multiple highlights in input order and surfaces each impact label", () => {
    const highlights: MutationHighlight[] = [
      {
        geneSymbol: "ARID4B",
        proteinChange: "p.S1048*",
        variantClassification: "Nonsense_Mutation",
        impact: "HIGH",
      },
      singleHighlight,
      {
        geneSymbol: "KMT2C",
        proteinChange: "p.P2501L",
        variantClassification: "Missense_Mutation",
        impact: "LOW",
      },
      {
        geneSymbol: "RB1",
        proteinChange: "p.=",
        variantClassification: "Silent",
        impact: "MODIFIER",
      },
    ];

    const rendered = renderMutationHighlightsSection(highlights);
    const genePositions = highlights.map((highlight) =>
      rendered.indexOf(highlight.geneSymbol),
    );

    for (const highlight of highlights) {
      expect(rendered).toContain(highlight.geneSymbol);
      expect(rendered).toContain(highlight.proteinChange);
      expect(rendered).toContain(highlight.variantClassification);
      expect(rendered).toContain(highlight.impact);
    }

    expect(genePositions[0]).toBeLessThan(genePositions[1]);
    expect(genePositions[1]).toBeLessThan(genePositions[2]);
    expect(genePositions[2]).toBeLessThan(genePositions[3]);
  });

  test("renders a readable empty state when the bounded collection is empty", () => {
    const rendered = renderMutationHighlightsSection([]);

    expect(rendered).toMatch(/no .*mutation/i);
    expect(rendered).not.toContain("<li>");
  });
});
