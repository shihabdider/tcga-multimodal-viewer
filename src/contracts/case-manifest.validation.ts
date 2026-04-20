import type {
  CaseManifest,
  CaseMetadata,
  CopyNumberHighlight,
  ExpressionHighlight,
  GenomicSnapshot,
  MutationHighlight,
  SlideReference,
  SourceFileReference,
} from "./case-manifest";

export function validateSourceFileReference(value: unknown): SourceFileReference {
  throw new Error("not implemented: validateSourceFileReference");
}

export function validateCaseMetadata(value: unknown): CaseMetadata {
  throw new Error("not implemented: validateCaseMetadata");
}

export function validateMutationHighlight(value: unknown): MutationHighlight {
  throw new Error("not implemented: validateMutationHighlight");
}

export function validateExpressionHighlight(value: unknown): ExpressionHighlight {
  throw new Error("not implemented: validateExpressionHighlight");
}

export function validateCopyNumberHighlight(value: unknown): CopyNumberHighlight {
  throw new Error("not implemented: validateCopyNumberHighlight");
}

export function validateGenomicSnapshot(value: unknown): GenomicSnapshot {
  throw new Error("not implemented: validateGenomicSnapshot");
}

export function validateSlideReference(value: unknown): SlideReference {
  throw new Error("not implemented: validateSlideReference");
}

export function validateCaseManifest(value: unknown): CaseManifest {
  throw new Error("not implemented: validateCaseManifest");
}
