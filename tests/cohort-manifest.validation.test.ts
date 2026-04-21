import { describe, expect, test } from "bun:test";

import cohortManifest from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import { validateCohortManifest } from "../src/contracts/cohort-manifest.validation";

describe("validateCohortManifest", () => {
  test("accepts the checked-in tiny cohort manifest", () => {
    expect(validateCohortManifest(cohortManifest)).toEqual(cohortManifest);
  });

  test("rejects manifest JSON with the wrong schema version", () => {
    expect(() =>
      validateCohortManifest({
        ...cohortManifest,
        schemaVersion: "cohort-manifest/v2",
      }),
    ).toThrow(/CohortManifest\.schemaVersion must be "cohort-manifest\/v1"/);
  });

  test("rejects duplicate case manifest paths", () => {
    expect(() =>
      validateCohortManifest({
        ...cohortManifest,
        caseManifestPaths: [
          cohortManifest.caseManifestPaths[0],
          cohortManifest.caseManifestPaths[0],
        ],
      }),
    ).toThrow(/CohortManifest\.caseManifestPaths must be unique/);
  });

  test("rejects fewer than two case manifests", () => {
    expect(() =>
      validateCohortManifest({
        ...cohortManifest,
        caseManifestPaths: [cohortManifest.caseManifestPaths[0]],
      }),
    ).toThrow(
      /CohortManifest\.caseManifestPaths must include at least two case manifests/,
    );
  });
});
