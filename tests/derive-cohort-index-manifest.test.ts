import { describe, expect, test } from "bun:test";

import tcga3cAalkManifest from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifest from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import cohortIndexManifest from "../manifests/tcga-brca/tcga-brca.tiny-cohort-index.json";
import cohortManifest from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import recipe from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import tcgaE9A5flManifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import { deriveCohortIndexManifest } from "../src/app/export-tiny-cohort-manifests";
import type { CaseManifest } from "../src/contracts/case-manifest";
import type { CohortManifest } from "../src/contracts/cohort-manifest";
import type { TinyCohortExportRecipe } from "../src/contracts/tiny-cohort-export";

describe("deriveCohortIndexManifest", () => {
  test("derives the checked-in tiny cohort index manifest in stable recipe order", () => {
    const emittedCaseManifests = [
      tcga4hAaakManifest,
      tcgaE9A5flManifest,
      tcga3cAalkManifest,
    ] as CaseManifest[];

    expect(
      deriveCohortIndexManifest(
        recipe as TinyCohortExportRecipe,
        cohortManifest as CohortManifest,
        emittedCaseManifests,
      ),
    ).toEqual(cohortIndexManifest);
  });

  test("emits empty mutation summaries and zero slide counts when a case has no highlights or slides", () => {
    const sparseFirstCaseManifest = {
      ...tcgaE9A5flManifest,
      genomicSnapshot: {
        ...tcgaE9A5flManifest.genomicSnapshot,
        mutationHighlights: [],
      },
      slides: [],
    } as CaseManifest;

    const derived = deriveCohortIndexManifest(
      recipe as TinyCohortExportRecipe,
      cohortManifest as CohortManifest,
      [
        sparseFirstCaseManifest,
        tcga3cAalkManifest,
        tcga4hAaakManifest,
      ] as CaseManifest[],
    );

    expect(derived.cases[0]).toEqual({
      ...cohortIndexManifest.cases[0],
      mutationHighlightGenes: [],
      slideCount: 0,
    });
  });

  test("throws when cohortManifest.caseManifestPaths do not line up with recipe order", () => {
    const misalignedCohortManifest = {
      ...cohortManifest,
      caseManifestPaths: [
        cohortManifest.caseManifestPaths[1],
        cohortManifest.caseManifestPaths[0],
        cohortManifest.caseManifestPaths[2],
      ],
    } as CohortManifest;

    expect(() =>
      deriveCohortIndexManifest(
        recipe as TinyCohortExportRecipe,
        misalignedCohortManifest,
        [
          tcgaE9A5flManifest,
          tcga3cAalkManifest,
          tcga4hAaakManifest,
        ] as CaseManifest[],
      ),
    ).toThrow(/does not line up with recipe case TCGA-E9-A5FL/);
  });
});
