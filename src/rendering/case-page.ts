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
  const escapeHtml = (value: string): string =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const summaryFields: Array<{ label: string; value: string }> = [
    { label: "Case ID", value: caseMetadata.caseId },
    { label: "GDC Case ID", value: caseMetadata.gdcCaseId },
    { label: "Project", value: caseMetadata.projectId },
    { label: "Primary site", value: caseMetadata.primarySite },
    { label: "Disease type", value: caseMetadata.diseaseType },
    { label: "Primary diagnosis", value: caseMetadata.primaryDiagnosis },
    { label: "Gender", value: caseMetadata.gender },
    { label: "Tumor sample ID", value: caseMetadata.tumorSampleId },
  ];

  const renderedFields = summaryFields
    .map(
      ({ label, value }) =>
        [
          '    <div class="case-summary__item">',
          `      <dt>${label}</dt>`,
          `      <dd>${escapeHtml(value)}</dd>`,
          "    </div>",
        ].join("\n"),
    )
    .join("\n");

  return [
    '<section class="case-summary" aria-labelledby="case-summary-heading">',
    '  <h2 id="case-summary-heading">Case summary</h2>',
    '  <dl class="case-summary__list">',
    renderedFields,
    "  </dl>",
    "</section>",
  ].join("\n");
}

export function renderGenomicSnapshotSection(snapshot: GenomicSnapshot): string {
  throw new Error("not implemented: renderGenomicSnapshotSection");
}

export function renderMutationHighlightsSection(
  highlights: MutationHighlight[],
): string {
  const escapeHtml = (value: string): string =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  if (highlights.length === 0) {
    return [
      '<section class="genomic-panel mutation-highlights">',
      "  <h3>Somatic mutation highlights</h3>",
      '  <p class="empty-state">No somatic mutation highlights available.</p>',
      "</section>",
    ].join("\n");
  }

  const renderedHighlights = highlights
    .map(
      (highlight) =>
        [
          '    <li class="mutation-highlight">',
          `      <strong>${escapeHtml(highlight.geneSymbol)}</strong>`,
          `      <span>${escapeHtml(highlight.proteinChange)}</span>`,
          `      <span>${escapeHtml(highlight.variantClassification)}</span>`,
          `      <span>Impact: ${escapeHtml(highlight.impact)}</span>`,
          "    </li>",
        ].join("\n"),
    )
    .join("\n");

  return [
    '<section class="genomic-panel mutation-highlights">',
    "  <h3>Somatic mutation highlights</h3>",
    '  <ul class="highlight-list mutation-highlight-list">',
    renderedHighlights,
    "  </ul>",
    "</section>",
  ].join("\n");
}

export function renderExpressionHighlightsSection(
  metric: GenomicSnapshot["expressionMetric"],
  highlights: ExpressionHighlight[],
): string {
  const escapeHtml = (value: string): string =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const metricLabel = {
    tpm_unstranded: "TPM (unstranded)",
  }[metric];

  const renderedHighlights =
    highlights.length === 0
      ? '<p class="empty-state">No expression highlights available.</p>'
      : `<ul class="expression-highlight-list">${highlights
          .map(
            (highlight) =>
              `<li><span class="gene-symbol">${escapeHtml(highlight.geneSymbol)}</span><span class="expression-value">${String(highlight.tpmUnstranded)}</span></li>`,
          )
          .join("")}</ul>`;

  return `<section class="genomic-highlights expression-highlights"><h3>Expression highlights</h3><p class="expression-metric" data-expression-metric="${escapeHtml(metric)}">Metric: ${metricLabel}</p>${renderedHighlights}</section>`;
}

export function renderCopyNumberHighlightsSection(
  highlights: CopyNumberHighlight[],
): string {
  const escapeHtml = (value: string): string =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const heading = "Gene-level copy-number highlights";

  if (highlights.length === 0) {
    return [
      '<section class="copy-number-highlights">',
      `<h3>${heading}</h3>`,
      '<p class="empty-state">No copy-number highlights available.</p>',
      "</section>",
    ].join("");
  }

  const items = highlights
    .map(
      (highlight) =>
        `<li><span class="gene-symbol">${escapeHtml(highlight.geneSymbol)}</span>: <span class="copy-number-value">${highlight.copyNumber}</span></li>`,
    )
    .join("");

  return [
    '<section class="copy-number-highlights">',
    `<h3>${heading}</h3>`,
    `<ul>${items}</ul>`,
    "</section>",
  ].join("");
}

export function renderSingleCaseStylesheet(): string {
  return `body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
  color: #1f2933;
  background: #f8fafc;
}

main {
  max-width: 60rem;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

section {
  margin-top: 1.5rem;
  padding: 1rem 1.25rem;
  background: #ffffff;
  border: 1px solid #d9e2ec;
  border-radius: 0.5rem;
}

h1,
h2,
h3 {
  margin: 0 0 0.75rem;
  line-height: 1.25;
}

p,
ul,
dl,
table {
  margin: 0.75rem 0 0;
}

dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.35rem 1rem;
}

dt {
  font-weight: 600;
}

dd {
  margin: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #d9e2ec;
}

a {
  color: #0b69a3;
}

code {
  font-family: "SFMono-Regular", ui-monospace, monospace;
}`;
}
