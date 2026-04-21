import { describe, expect, test } from "bun:test";

import cohortManifest from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";

describe("checked-in CohortManifest artifact", () => {
  test("pins a three-case TCGA-BRCA tiny cohort", () => {
    expect(Object.keys(cohortManifest).sort()).toEqual([
      "caseManifestPaths",
      "cohortId",
      "description",
      "projectId",
      "schemaVersion",
      "title",
    ]);
    expect(cohortManifest.schemaVersion).toBe("cohort-manifest/v1");
    expect(cohortManifest.cohortId).toBe("tcga-brca-tiny-cohort");
    expect(cohortManifest.projectId).toBe("TCGA-BRCA");
    expect(cohortManifest.caseManifestPaths).toEqual([
      "tcga-e9-a5fl.case-manifest.json",
      "tcga-3c-aalk.case-manifest.json",
      "tcga-4h-aaak.case-manifest.json",
    ]);
  });
});
