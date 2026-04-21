import { afterEach, describe, expect, test } from "bun:test";

import {
  checkedTinyBrcaManifestByCaseId,
  checkedTinyBrcaRecipe,
  expectCheckedTinyBrcaGdcRequestCounts,
  installCheckedTinyBrcaFetchMock,
  restoreCheckedTinyBrcaFetchMock,
} from "./helpers/checked-tiny-brca-fixture";
import { deriveCaseManifest } from "../src/app/export-tiny-cohort-manifests";
import type { TinyCaseExportRecipe } from "../src/contracts/tiny-cohort-export";

afterEach(() => {
  restoreCheckedTinyBrcaFetchMock();
});

describe("deriveCaseManifest", () => {
  test("reproduces every checked-in case manifest from public case metadata, bounded genomics, and the pinned public slide reference", async () => {
    const requestedUrls: string[] = [];
    const requestedCaseIds: string[] = [];

    installCheckedTinyBrcaFetchMock({ requestedUrls, requestedCaseIds });

    for (const caseRecipe of checkedTinyBrcaRecipe.cases) {
      const expectedManifest = checkedTinyBrcaManifestByCaseId.get(caseRecipe.caseId);

      if (!expectedManifest) {
        throw new Error(`Missing checked-in case manifest for ${caseRecipe.caseId}`);
      }

      await expect(
        deriveCaseManifest(
          caseRecipe,
          checkedTinyBrcaRecipe.expressionGenePanel,
          checkedTinyBrcaRecipe.copyNumberGenePanel,
        ),
      ).resolves.toEqual(expectedManifest);
    }

    expect(requestedCaseIds.sort()).toEqual(
      checkedTinyBrcaRecipe.cases.map(({ caseId }) => caseId).sort(),
    );
    expectCheckedTinyBrcaGdcRequestCounts(requestedUrls);
  });

  test("returns a valid manifest with empty genomic highlight collections when the bounded panels and selectors are empty", async () => {
    const caseRecipe: TinyCaseExportRecipe = {
      ...checkedTinyBrcaRecipe.cases[0],
      mutationSelectors: [],
    };
    const expectedManifest = checkedTinyBrcaManifestByCaseId.get(caseRecipe.caseId);
    const requestedUrls: string[] = [];

    if (!expectedManifest) {
      throw new Error(`Missing checked-in case manifest for ${caseRecipe.caseId}`);
    }

    installCheckedTinyBrcaFetchMock({ requestedUrls });

    await expect(deriveCaseManifest(caseRecipe, [], [])).resolves.toEqual({
      ...expectedManifest,
      genomicSnapshot: {
        ...expectedManifest.genomicSnapshot,
        mutationHighlights: [],
        expressionHighlights: [],
        copyNumberHighlights: [],
      },
    });

    expect(requestedUrls.filter((url) => url.includes("/data/"))).toHaveLength(0);
  });

  test("rejects when the derived manifest fails bounded slide handoff validation", async () => {
    const caseRecipe: TinyCaseExportRecipe = {
      ...checkedTinyBrcaRecipe.cases[0],
      viewerHandoffSeed: {
        ...checkedTinyBrcaRecipe.cases[0].viewerHandoffSeed,
        studyInstanceUid: "not-a-dicom-uid",
      },
    };

    installCheckedTinyBrcaFetchMock();

    await expect(
      deriveCaseManifest(
        caseRecipe,
        checkedTinyBrcaRecipe.expressionGenePanel,
        checkedTinyBrcaRecipe.copyNumberGenePanel,
      ),
    ).rejects.toThrow(/PublicViewerHandoff\.studyInstanceUid must be a DICOM UID string/);
  });
});
