import type {
  CaseManifest,
  CaseMetadata,
  CopyNumberHighlight,
  ExpressionHighlight,
  GenomicSnapshot,
  MutationHighlight,
} from "../contracts/case-manifest";

export function renderCasePage(manifest: CaseManifest): string {
  throw new Error("not implemented: renderCasePage");
}

export function renderCaseMetadataSection(caseMetadata: CaseMetadata): string {
  throw new Error("not implemented: renderCaseMetadataSection");
}

export function renderGenomicSnapshotSection(snapshot: GenomicSnapshot): string {
  throw new Error("not implemented: renderGenomicSnapshotSection");
}

export function renderMutationHighlightsSection(
  highlights: MutationHighlight[],
): string {
  throw new Error("not implemented: renderMutationHighlightsSection");
}

export function renderExpressionHighlightsSection(
  metric: GenomicSnapshot["expressionMetric"],
  highlights: ExpressionHighlight[],
): string {
  throw new Error("not implemented: renderExpressionHighlightsSection");
}

export function renderCopyNumberHighlightsSection(
  highlights: CopyNumberHighlight[],
): string {
  throw new Error("not implemented: renderCopyNumberHighlightsSection");
}

export function renderSingleCaseStylesheet(): string {
  throw new Error("not implemented: renderSingleCaseStylesheet");
}
