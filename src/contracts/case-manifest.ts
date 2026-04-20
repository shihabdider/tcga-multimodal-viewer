export type CaseId = `TCGA-${string}`;

export type MutationImpact = "HIGH" | "MODERATE" | "LOW" | "MODIFIER";

export interface SourceFileReference {
  fileId: string;
  fileName: string;
  dataType: string;
  workflow: string;
}

export interface CaseMetadata {
  caseId: CaseId;
  gdcCaseId: string;
  projectId: "TCGA-BRCA";
  primarySite: string;
  diseaseType: string;
  primaryDiagnosis: string;
  gender: string;
  tumorSampleId: string;
}

export interface MutationHighlight {
  geneSymbol: string;
  proteinChange: string;
  variantClassification: string;
  impact: MutationImpact;
}

export interface ExpressionHighlight {
  geneSymbol: string;
  tpmUnstranded: number;
}

export interface CopyNumberHighlight {
  geneSymbol: string;
  copyNumber: number;
}

export interface GenomicSnapshot {
  sourceFiles: {
    maskedSomaticMutation: SourceFileReference;
    geneExpression: SourceFileReference;
    geneLevelCopyNumber: SourceFileReference;
  };
  mutationHighlights: MutationHighlight[];
  expressionMetric: "tpm_unstranded";
  expressionHighlights: ExpressionHighlight[];
  copyNumberHighlights: CopyNumberHighlight[];
}

export interface SlideReference {
  source: "gdc";
  access: "open";
  fileId: string;
  fileName: string;
  slideSubmitterId: string;
  slideId: string;
  sampleType: string;
  experimentalStrategy: "Diagnostic Slide" | "Tissue Slide";
  publicPageUrl: string;
  publicDownloadUrl: string;
}

export interface CaseManifest {
  schemaVersion: "case-manifest/v1";
  case: CaseMetadata;
  genomicSnapshot: GenomicSnapshot;
  slides: SlideReference[];
}
