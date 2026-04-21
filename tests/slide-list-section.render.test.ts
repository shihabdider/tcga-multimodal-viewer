import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import {
  renderSlideListSection,
  renderSlideViewerHandoff,
} from "../src/rendering/case-page";

describe("renderSlideViewerHandoff", () => {
  test("renders a manifest-driven external public handoff link", () => {
    const rendered = renderSlideViewerHandoff(manifest.slides[0].viewerHandoff);

    expect(rendered).toContain(manifest.slides[0].viewerHandoff.url);
    expect(rendered).toContain("Open public slide");
  });
});

describe("renderSlideListSection", () => {
  test("renders the checked-in slide list with slide context and a clickable public handoff", () => {
    const rendered = renderSlideListSection(manifest.slides);

    expect(rendered).toContain("Slides");
    expect(rendered).toContain(manifest.slides[0].slideSubmitterId);
    expect(rendered).toContain(manifest.slides[0].sampleType);
    expect(rendered).toContain(manifest.slides[0].experimentalStrategy);
    expect(rendered).toContain(manifest.slides[0].viewerHandoff.url);
  });

  test("renders an empty state when the manifest has no public slides", () => {
    const rendered = renderSlideListSection([]);

    expect(rendered).toContain("Slides");
    expect(rendered).toContain("No public slides available.");
  });
});
