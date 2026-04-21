import { describe, expect, test } from "bun:test";

import tcga3cAalkManifest from "../manifests/tcga-brca/tcga-3c-aalk.case-manifest.json";
import tcga4hAaakManifest from "../manifests/tcga-brca/tcga-4h-aaak.case-manifest.json";
import cohortManifest from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import recipe from "../manifests/tcga-brca/tcga-brca.tiny-export-recipe.json";
import tcgaE9A5flManifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import { deriveCohortManifest } from "../src/app/export-tiny-cohort-manifests";
import type { CaseManifest } from "../src/contracts/case-manifest";
import type { TinyCohortExportRecipe } from "../src/contracts/tiny-cohort-export";

describe("deriveCohortManifest", () => {
  test("derives the checked-in tiny cohort manifest in stable recipe order", () => {
    const emittedCaseManifests = [
      tcga4hAaakManifest,
      tcgaE9A5flManifest,
      tcga3cAalkManifest,
    ] as CaseManifest[];

    expect(
      deriveCohortManifest(recipe as TinyCohortExportRecipe, emittedCaseManifests),
    ).toEqual(cohortManifest);
  });

  test("throws when an emitted case manifest is missing for a pinned recipe case", () => {
    // Assumption: the cohort manifest cannot be derived if a recipe case has no emitted case manifest.
    expect(() =>
      deriveCohortManifest(recipe as TinyCohortExportRecipe, [
        tcgaE9A5flManifest,
        tcga4hAaakManifest,
      ] as CaseManifest[]),
    ).toThrow(/Missing case manifest for recipe case TCGA-3C-AALK/);
  });

  test("throws when an emitted case manifest does not belong to the recipe", () => {
    const unexpectedCaseManifest = {
      ...tcgaE9A5flManifest,
      case: {
        ...tcgaE9A5flManifest.case,
        caseId: "TCGA-ZZ-9999",
        tumorSampleId: "TCGA-ZZ-9999-01A",
      },
    } as CaseManifest;

    expect(() =>
      deriveCohortManifest(recipe as TinyCohortExportRecipe, [
        tcgaE9A5flManifest,
        tcga3cAalkManifest,
        tcga4hAaakManifest,
        unexpectedCaseManifest,
      ]),
    ).toThrow(/Unexpected case manifest for non-recipe case TCGA-ZZ-9999/);
  });
});
