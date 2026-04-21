import { describe, expect, test } from "bun:test";

import caseManifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import recipe from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import { buildIdcSlimViewerHandoff } from "../src/app/export-tiny-cohort-manifests";
import type { IdcSlimViewerHandoffSeed } from "../src/contracts/tiny-cohort-export";

function buildExpectedSlimViewerHandoff(
  seed: Pick<IdcSlimViewerHandoffSeed, "studyInstanceUid" | "seriesInstanceUid">,
) {
  return {
    kind: "external" as const,
    provider: "idc-slim" as const,
    studyInstanceUid: seed.studyInstanceUid,
    seriesInstanceUid: seed.seriesInstanceUid,
    url: `https://viewer.imaging.datacommons.cancer.gov/slim/studies/${seed.studyInstanceUid}/series/${seed.seriesInstanceUid}`,
  };
}

describe("buildIdcSlimViewerHandoff", () => {
  test("derives the checked-in public IDC Slim handoff for the seed case", () => {
    expect(buildIdcSlimViewerHandoff(recipe.cases[0].viewerHandoffSeed)).toEqual(
      caseManifest.slides[0].viewerHandoff,
    );
  });

  test("derives the canonical external viewer URL for every pinned handoff seed", () => {
    for (const { viewerHandoffSeed } of recipe.cases) {
      expect(buildIdcSlimViewerHandoff(viewerHandoffSeed)).toEqual(
        buildExpectedSlimViewerHandoff(viewerHandoffSeed),
      );
    }
  });

  test("returns only the bounded public handoff fields even when runtime extras are present on the seed", () => {
    const noisySeed = {
      ...recipe.cases[0].viewerHandoffSeed,
      kind: "embedded",
      url: "https://viewer.example.test/slim",
      ignored: true,
    } as unknown as IdcSlimViewerHandoffSeed;

    const handoff = buildIdcSlimViewerHandoff(noisySeed);

    expect(handoff).toEqual(caseManifest.slides[0].viewerHandoff);
    expect(Object.keys(handoff).sort()).toEqual([
      "kind",
      "provider",
      "seriesInstanceUid",
      "studyInstanceUid",
      "url",
    ]);
  });
});
