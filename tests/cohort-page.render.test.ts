import { describe, expect, test } from "bun:test";

import tcga3cAalkManifest from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifest from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import tcgaE9A5flManifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import {
  renderCasePage,
  renderCohortIndexPage,
} from "../src/rendering/case-page";

const tinyCohortCases = [
  tcgaE9A5flManifest,
  tcga3cAalkManifest,
  tcga4hAaakManifest,
];

describe("renderCohortIndexPage", () => {
  test("renders the tiny cohort heading, description, and links for each checked-in case", () => {
    const rendered = renderCohortIndexPage({
      title: "TCGA-BRCA tiny cohort",
      description:
        "Three checked-in public TCGA-BRCA cases linking open GDC genomic snapshots to IDC slide viewer handoffs.",
      cases: tinyCohortCases.map((manifest) => ({
        caseId: manifest.case.caseId,
        href: `cases/${manifest.case.caseId.toLowerCase()}/index.html`,
        primaryDiagnosis: manifest.case.primaryDiagnosis,
        diseaseType: manifest.case.diseaseType,
        tumorSampleId: manifest.case.tumorSampleId,
        mutationHighlightGenes: manifest.genomicSnapshot.mutationHighlights.map(
          (highlight) => highlight.geneSymbol,
        ),
        slideCount: manifest.slides.length,
      })),
    });

    expect(rendered).toStartWith("<!DOCTYPE html>");
    expect(rendered).toContain("TCGA-BRCA tiny cohort");
    expect(rendered).toContain(
      "Three checked-in public TCGA-BRCA cases linking open GDC genomic snapshots to IDC slide viewer handoffs.",
    );

    for (const manifest of tinyCohortCases) {
      expect(rendered).toContain(manifest.case.caseId);
      expect(rendered).toContain(manifest.case.primaryDiagnosis);
      expect(rendered).toContain(`cases/${manifest.case.caseId.toLowerCase()}/index.html`);
      expect(rendered).toContain(
        manifest.genomicSnapshot.mutationHighlights[0].geneSymbol,
      );
    }
  });
});

describe("renderCasePage with cohort navigation", () => {
  test("renders back-to-index and case-to-case navigation links when provided", () => {
    const rendered = renderCasePage(tcga3cAalkManifest, {
      stylesheetHref: "../../styles.css",
      navigation: {
        cohortTitle: "TCGA-BRCA tiny cohort",
        cohortIndexHref: "../../index.html",
        caseLinks: tinyCohortCases.map((manifest) => ({
          caseId: manifest.case.caseId,
          href: `../${manifest.case.caseId.toLowerCase()}/index.html`,
          current: manifest.case.caseId === tcga3cAalkManifest.case.caseId,
        })),
      },
    });

    expect(rendered).toContain('href="../../styles.css"');
    expect(rendered).toContain('aria-label="Cohort navigation"');
    expect(rendered).toContain("Back to TCGA-BRCA tiny cohort");
    expect(rendered).toContain('href="../../index.html"');
    expect(rendered).toContain(
      `href="../${tcgaE9A5flManifest.case.caseId.toLowerCase()}/index.html"`,
    );
    expect(rendered).toContain(
      `href="../${tcga4hAaakManifest.case.caseId.toLowerCase()}/index.html"`,
    );
    expect(rendered).toContain(
      `href="../${tcga3cAalkManifest.case.caseId.toLowerCase()}/index.html" aria-current="page"`,
    );
  });
});
