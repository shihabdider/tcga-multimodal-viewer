import { describe, expect, test } from "bun:test";

import tcga3cAalkManifest from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifest from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import cohortIndexManifest from "../manifests/tcga-brca/tcga-brca.tiny-cohort-index.json";
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
    const rendered = renderCohortIndexPage(cohortIndexManifest);

    expect(rendered).toStartWith("<!DOCTYPE html>");
    expect(rendered).toContain(cohortIndexManifest.title);
    expect(rendered).toContain(cohortIndexManifest.description);

    for (const entry of cohortIndexManifest.cases) {
      expect(rendered).toContain(entry.caseId);
      expect(rendered).toContain(entry.primaryDiagnosis);
      expect(rendered).toContain(entry.href);
      expect(rendered).toContain(entry.mutationHighlightGenes[0]);
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
