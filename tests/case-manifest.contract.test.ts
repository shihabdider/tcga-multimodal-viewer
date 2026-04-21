import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";

describe("checked-in CaseManifest artifact", () => {
  test("pins the seed TCGA-BRCA case and diagnostic slide", () => {
    const viewerHandoff = manifest.slides[0].viewerHandoff;

    expect(Object.keys(manifest).sort()).toEqual([
      "case",
      "genomicSnapshot",
      "schemaVersion",
      "slides",
    ]);
    expect(manifest.schemaVersion).toBe("case-manifest/v1");
    expect(manifest.case.caseId).toBe("TCGA-E9-A5FL");
    expect(manifest.case.projectId).toBe("TCGA-BRCA");
    expect(manifest.case.primaryDiagnosis).toBe("Metaplastic carcinoma, NOS");
    expect(manifest.slides).toHaveLength(1);
    expect(manifest.slides[0]).toMatchObject({
      source: "gdc",
      access: "open",
      experimentalStrategy: "Diagnostic Slide",
      fileId: "e5806a73-54c4-43d1-a44b-db5f43c8e832",
      slideSubmitterId: "TCGA-E9-A5FL-01Z-00-DX1",
      viewerHandoff: {
        kind: "external",
        provider: "idc-slim",
        studyInstanceUid: "2.25.75985052631324791295077969115453253333",
        seriesInstanceUid:
          "1.3.6.1.4.1.5962.99.1.1340365369.982525121.1637722937913.2.0",
      },
    });
    expect(viewerHandoff.url).toBe(
      `https://viewer.imaging.datacommons.cancer.gov/slim/studies/${viewerHandoff.studyInstanceUid}/series/${viewerHandoff.seriesInstanceUid}`,
    );
  });

  test("keeps the genomic snapshot bounded and tied to open GDC files", () => {
    expect(manifest.genomicSnapshot.sourceFiles).toMatchObject({
      maskedSomaticMutation: {
        fileId: "1b465f36-4bde-4549-821f-5bc21443fcae",
      },
      geneExpression: {
        fileId: "c1f3f326-e99f-4811-9665-d15d6d8a1c33",
      },
      geneLevelCopyNumber: {
        fileId: "d5b3a491-d625-4526-bb70-a18df651b59a",
      },
    });
    expect(manifest.genomicSnapshot.mutationHighlights).toHaveLength(3);
    expect(manifest.genomicSnapshot.expressionHighlights).toHaveLength(4);
    expect(manifest.genomicSnapshot.copyNumberHighlights).toHaveLength(4);
  });

  test("captures the expected highlight values for the seed case", () => {
    expect(manifest.genomicSnapshot.mutationHighlights).toContainEqual({
      geneSymbol: "TP53",
      proteinChange: "p.H193R",
      variantClassification: "Missense_Mutation",
      impact: "MODERATE",
    });
    expect(manifest.genomicSnapshot.expressionHighlights).toContainEqual({
      geneSymbol: "KRT5",
      tpmUnstranded: 2452.7661,
    });
    expect(manifest.genomicSnapshot.copyNumberHighlights).toContainEqual({
      geneSymbol: "CDKN2A",
      copyNumber: 0,
    });
  });
});
