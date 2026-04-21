import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type {
  PublicViewerHandoff,
  SlideReference,
} from "../src/contracts/case-manifest";
import {
  renderSlideListSection,
  renderSlideViewerHandoff,
} from "../src/rendering/case-page";

function makeSlideReference(
  overrides: Partial<SlideReference> = {},
): SlideReference {
  return {
    ...manifest.slides[0],
    ...overrides,
    viewerHandoff: overrides.viewerHandoff ?? manifest.slides[0].viewerHandoff,
  };
}

describe("renderSlideViewerHandoff", () => {
  test("renders a manifest-driven external public handoff link", () => {
    const rendered = renderSlideViewerHandoff(manifest.slides[0].viewerHandoff);

    expect(rendered).toContain(manifest.slides[0].viewerHandoff.url);
    expect(rendered).toContain("Open public slide");
  });

  test("renders the bounded IDC Slim handoff as an external link", () => {
    const rendered = renderSlideViewerHandoff(manifest.slides[0].viewerHandoff);

    expect(rendered).toContain("Open public slide in IDC Slim viewer");
    expect(rendered).toContain('target="_blank"');
    expect(rendered).toContain('rel="noreferrer"');
  });

  test("escapes the handoff url before inserting it into the external link", () => {
    const handoff: PublicViewerHandoff = {
      kind: "external",
      provider: "idc-slim",
      studyInstanceUid: "2.25.1",
      seriesInstanceUid: "1.2.3",
      url: 'https://viewer.example.test/slim?redirect="><script>alert(1)</script>&source=idc-slim',
    };

    const rendered = renderSlideViewerHandoff(handoff);

    expect(rendered).toContain(
      'href="https://viewer.example.test/slim?redirect=&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;source=idc-slim"',
    );
    expect(rendered).not.toContain('href="https://viewer.example.test/slim?redirect="><script>alert(1)</script>&source=idc-slim"');
    expect(rendered).not.toContain("<script>alert(1)</script>");
  });
});

describe("renderSlideListSection", () => {
  test("renders the checked-in slide list with slide context, GDC references, and a clickable public handoff", () => {
    const rendered = renderSlideListSection(manifest.slides);

    expect(rendered).toContain("Slides");
    expect(rendered).toContain(manifest.slides[0].slideSubmitterId);
    expect(rendered).toContain(manifest.slides[0].fileName);
    expect(rendered).toContain(manifest.slides[0].sampleType);
    expect(rendered).toContain(manifest.slides[0].experimentalStrategy);
    expect(rendered).toContain(manifest.slides[0].publicPageUrl);
    expect(rendered).toContain(manifest.slides[0].publicDownloadUrl);
    expect(rendered).toContain(
      renderSlideViewerHandoff(manifest.slides[0].viewerHandoff),
    );
  });

  test("renders one checked-in metadata block and external handoff per slide", () => {
    const secondSlide = makeSlideReference({
      fileId: "11111111-1111-4111-8111-111111111111",
      fileName: "TCGA-E9-A5FL-11Z-00-DX1.secondary.svs",
      slideSubmitterId: "TCGA-E9-A5FL-11Z-00-DX1",
      slideId: "123e4567-e89b-12d3-a456-426614174001",
      sampleType: "Solid Tissue Normal",
      experimentalStrategy: "Tissue Slide",
      publicPageUrl:
        "https://portal.gdc.cancer.gov/files/11111111-1111-4111-8111-111111111111",
      publicDownloadUrl:
        "https://api.gdc.cancer.gov/data/11111111-1111-4111-8111-111111111111",
      viewerHandoff: {
        ...manifest.slides[0].viewerHandoff,
        studyInstanceUid: "2.25.2",
        seriesInstanceUid: "1.2.840.113619.2",
        url: "https://viewer.imaging.datacommons.cancer.gov/slim/studies/2.25.2/series/1.2.840.113619.2",
      },
    });

    const rendered = renderSlideListSection([manifest.slides[0], secondSlide]);

    expect(rendered).toContain(manifest.slides[0].slideSubmitterId);
    expect(rendered).toContain(secondSlide.slideSubmitterId);
    expect(rendered).toContain(secondSlide.sampleType);
    expect(rendered).toContain(secondSlide.publicPageUrl);
    expect(rendered).toContain(renderSlideViewerHandoff(secondSlide.viewerHandoff));
  });

  test("escapes checked-in slide metadata and GDC links before interpolating them into the section", () => {
    const rendered = renderSlideListSection([
      makeSlideReference({
        fileName: 'evil & sample <dx>.svs',
        slideSubmitterId: 'TCGA-XX-0001"><script>alert(1)</script>',
        sampleType: 'Primary Tumor & <Unsafe>',
        publicPageUrl:
          'https://portal.example.test/files?redirect="><script>alert(1)</script>&kind=page',
        publicDownloadUrl:
          'https://api.example.test/data?redirect="><script>alert(1)</script>&kind=download',
      }),
    ]);

    expect(rendered).toContain("evil &amp; sample &lt;dx&gt;.svs");
    expect(rendered).toContain(
      "TCGA-XX-0001&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(rendered).toContain("Primary Tumor &amp; &lt;Unsafe&gt;");
    expect(rendered).toContain(
      'href="https://portal.example.test/files?redirect=&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;kind=page"',
    );
    expect(rendered).toContain(
      'href="https://api.example.test/data?redirect=&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;kind=download"',
    );
    expect(rendered).not.toContain('<script>alert(1)</script>');
  });

  test("renders an empty state when the manifest has no public slides", () => {
    const rendered = renderSlideListSection([]);

    expect(rendered).toContain("Slides");
    expect(rendered).toContain("No public slides available.");
    expect(rendered).not.toContain("Open public slide");
  });
});
