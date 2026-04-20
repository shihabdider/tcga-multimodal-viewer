import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import type { CaseMetadata } from "../src/contracts/case-manifest";
import { renderCaseMetadataSection } from "../src/rendering/case-page";

describe("renderCaseMetadataSection", () => {
  test("renders a case summary block with TCGA identifiers and diagnosis context", () => {
    const rendered = renderCaseMetadataSection(manifest.case);

    expect(rendered).toContain("<section");
    expect(rendered).toContain("Case summary");
    expect(rendered).toContain("<dt>Case ID</dt>");
    expect(rendered).toContain(`<dd>${manifest.case.caseId}</dd>`);
    expect(rendered).toContain("<dt>GDC Case ID</dt>");
    expect(rendered).toContain(`<dd>${manifest.case.gdcCaseId}</dd>`);
    expect(rendered).toContain("<dt>Project</dt>");
    expect(rendered).toContain(`<dd>${manifest.case.projectId}</dd>`);
    expect(rendered).toContain("<dt>Primary site</dt>");
    expect(rendered).toContain(`<dd>${manifest.case.primarySite}</dd>`);
    expect(rendered).toContain("<dt>Disease type</dt>");
    expect(rendered).toContain(`<dd>${manifest.case.diseaseType}</dd>`);
    expect(rendered).toContain("<dt>Primary diagnosis</dt>");
    expect(rendered).toContain(`<dd>${manifest.case.primaryDiagnosis}</dd>`);
    expect(rendered).toContain("<dt>Gender</dt>");
    expect(rendered).toContain(`<dd>${manifest.case.gender}</dd>`);
    expect(rendered).toContain("<dt>Tumor sample ID</dt>");
    expect(rendered).toContain(`<dd>${manifest.case.tumorSampleId}</dd>`);
  });

  test("escapes metadata text before interpolating it into the HTML summary block", () => {
    const caseMetadata: CaseMetadata = {
      caseId: "TCGA-XX-0001",
      gdcCaseId: "123e4567-e89b-12d3-a456-426614174000",
      projectId: "TCGA-BRCA",
      primarySite: "Breast & chest wall",
      diseaseType: "Complex <Subtype>",
      primaryDiagnosis: "Metaplastic & ductal > lobular",
      gender: "female <reported>",
      tumorSampleId: "TCGA-XX-0001-01A",
    };

    const rendered = renderCaseMetadataSection(caseMetadata);

    expect(rendered).toContain("<dd>TCGA-XX-0001</dd>");
    expect(rendered).toContain(
      "<dd>123e4567-e89b-12d3-a456-426614174000</dd>",
    );
    expect(rendered).toContain("<dd>Breast &amp; chest wall</dd>");
    expect(rendered).toContain("<dd>Complex &lt;Subtype&gt;</dd>");
    expect(rendered).toContain(
      "<dd>Metaplastic &amp; ductal &gt; lobular</dd>",
    );
    expect(rendered).toContain("<dd>female &lt;reported&gt;</dd>");
    expect(rendered).not.toContain("Breast & chest wall</dd>");
    expect(rendered).not.toContain("Complex <Subtype>");
  });
});
