import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import checkedInCaseManifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import checkedInCohortManifest from "../manifests/tcga-brca/tcga-brca.tiny-cohort-manifest.json";
import { serializeNormalizedManifestJson } from "../src/app/export-tiny-cohort-manifests";
import type {
  CaseManifest,
  CopyNumberHighlight,
  ExpressionHighlight,
  MutationHighlight,
  PublicViewerHandoff,
  SlideReference,
  SourceFileReference,
} from "../src/contracts/case-manifest";
import type { CohortManifest } from "../src/contracts/cohort-manifest";

const repoRoot = join(import.meta.dir, "..");
const checkedInCaseManifestPath = join(
  repoRoot,
  "manifests",
  "tcga-brca",
  "tcga-e9-a5fl.case-manifest.json",
);
const checkedInCohortManifestPath = join(
  repoRoot,
  "manifests",
  "tcga-brca",
  "tcga-brca.tiny-cohort-manifest.json",
);

function reverseSourceFileReferenceOrder(
  reference: SourceFileReference,
): SourceFileReference {
  return {
    workflow: reference.workflow,
    dataType: reference.dataType,
    fileName: reference.fileName,
    fileId: reference.fileId,
  };
}

function reverseMutationHighlightOrder(
  highlight: MutationHighlight,
): MutationHighlight {
  return {
    impact: highlight.impact,
    variantClassification: highlight.variantClassification,
    proteinChange: highlight.proteinChange,
    geneSymbol: highlight.geneSymbol,
  };
}

function reverseExpressionHighlightOrder(
  highlight: ExpressionHighlight,
): ExpressionHighlight {
  return {
    tpmUnstranded: highlight.tpmUnstranded,
    geneSymbol: highlight.geneSymbol,
  };
}

function reverseCopyNumberHighlightOrder(
  highlight: CopyNumberHighlight,
): CopyNumberHighlight {
  return {
    copyNumber: highlight.copyNumber,
    geneSymbol: highlight.geneSymbol,
  };
}

function reverseViewerHandoffOrder(
  viewerHandoff: PublicViewerHandoff,
): PublicViewerHandoff {
  return {
    url: viewerHandoff.url,
    seriesInstanceUid: viewerHandoff.seriesInstanceUid,
    studyInstanceUid: viewerHandoff.studyInstanceUid,
    provider: viewerHandoff.provider,
    kind: viewerHandoff.kind,
  };
}

function reverseSlideReferenceOrder(slide: SlideReference): SlideReference {
  return {
    viewerHandoff: reverseViewerHandoffOrder(slide.viewerHandoff),
    publicDownloadUrl: slide.publicDownloadUrl,
    publicPageUrl: slide.publicPageUrl,
    experimentalStrategy: slide.experimentalStrategy,
    sampleType: slide.sampleType,
    slideId: slide.slideId,
    slideSubmitterId: slide.slideSubmitterId,
    fileName: slide.fileName,
    fileId: slide.fileId,
    access: slide.access,
    source: slide.source,
  };
}

function buildUnstableCaseManifest(manifest: CaseManifest): CaseManifest {
  return {
    slides: manifest.slides.map(reverseSlideReferenceOrder),
    genomicSnapshot: {
      copyNumberHighlights: manifest.genomicSnapshot.copyNumberHighlights.map(
        reverseCopyNumberHighlightOrder,
      ),
      expressionHighlights: manifest.genomicSnapshot.expressionHighlights.map(
        reverseExpressionHighlightOrder,
      ),
      expressionMetric: manifest.genomicSnapshot.expressionMetric,
      mutationHighlights: manifest.genomicSnapshot.mutationHighlights.map(
        reverseMutationHighlightOrder,
      ),
      sourceFiles: {
        geneLevelCopyNumber: reverseSourceFileReferenceOrder(
          manifest.genomicSnapshot.sourceFiles.geneLevelCopyNumber,
        ),
        geneExpression: reverseSourceFileReferenceOrder(
          manifest.genomicSnapshot.sourceFiles.geneExpression,
        ),
        maskedSomaticMutation: reverseSourceFileReferenceOrder(
          manifest.genomicSnapshot.sourceFiles.maskedSomaticMutation,
        ),
      },
    },
    case: {
      tumorSampleId: manifest.case.tumorSampleId,
      gender: manifest.case.gender,
      primaryDiagnosis: manifest.case.primaryDiagnosis,
      diseaseType: manifest.case.diseaseType,
      primarySite: manifest.case.primarySite,
      projectId: manifest.case.projectId,
      gdcCaseId: manifest.case.gdcCaseId,
      caseId: manifest.case.caseId,
    },
    schemaVersion: manifest.schemaVersion,
  };
}

function buildUnstableCohortManifest(
  manifest: CohortManifest,
): CohortManifest {
  return {
    caseManifestPaths: [...manifest.caseManifestPaths],
    cohortIndexPath: manifest.cohortIndexPath,
    description: manifest.description,
    title: manifest.title,
    projectId: manifest.projectId,
    cohortId: manifest.cohortId,
    schemaVersion: manifest.schemaVersion,
  };
}

describe("serializeNormalizedManifestJson", () => {
  test("matches the checked-in case manifest source text", async () => {
    const expected = await readFile(checkedInCaseManifestPath, "utf8");

    expect(
      serializeNormalizedManifestJson(checkedInCaseManifest as CaseManifest),
    ).toBe(expected);
  });

  test("normalizes nested key ordering for case manifests and keeps a trailing newline", async () => {
    const expected = await readFile(checkedInCaseManifestPath, "utf8");
    const unstableManifest = buildUnstableCaseManifest(
      checkedInCaseManifest as CaseManifest,
    );
    const serialized = serializeNormalizedManifestJson(unstableManifest);

    expect(serialized).toBe(expected);
    expect(serialized.endsWith("\n")).toBe(true);
  });

  test("matches the checked-in cohort manifest source text", async () => {
    const expected = await readFile(checkedInCohortManifestPath, "utf8");

    expect(
      serializeNormalizedManifestJson(checkedInCohortManifest as CohortManifest),
    ).toBe(expected);
  });

  test("normalizes cohort manifest key ordering", async () => {
    const expected = await readFile(checkedInCohortManifestPath, "utf8");
    const unstableManifest = buildUnstableCohortManifest(
      checkedInCohortManifest as CohortManifest,
    );

    expect(serializeNormalizedManifestJson(unstableManifest)).toBe(expected);
  });
});
