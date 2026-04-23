import type {
  CaseId,
  CaseManifest,
  CaseMetadata,
  CopyNumberHighlight,
  ExpressionHighlight,
  GenomicSnapshot,
  MutationHighlight,
  PublicViewerHandoff,
  SlideReference,
} from "../contracts/case-manifest";
import type { CohortIndexEntry } from "../contracts/cohort-index";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type DefinitionListField = {
  label: string;
  value: string;
};

export interface CasePageNavigationItem {
  caseId: CaseId;
  href: string;
  current?: boolean;
}

export interface CasePageNavigation {
  cohortTitle: string;
  cohortIndexHref: string;
  caseLinks: CasePageNavigationItem[];
}

export interface CasePageRenderOptions {
  stylesheetHref?: string;
  navigation?: CasePageNavigation;
}

export interface CohortIndexPageModel {
  title: string;
  description: string;
  cases: CohortIndexEntry[];
  stylesheetHref?: string;
}

function renderDefinitionListItems(
  fields: DefinitionListField[],
  itemClassName: string,
): string {
  return fields
    .map(
      ({ label, value }) =>
        [
          `<div class="${itemClassName}">`,
          `<dt>${escapeHtml(label)}</dt>`,
          `<dd>${escapeHtml(value)}</dd>`,
          "</div>",
        ].join(""),
    )
    .join("");
}

export function renderCasePage(
  manifest: CaseManifest,
  options: CasePageRenderOptions = {},
): string {
  const renderedCaseMetadataSection = renderCaseMetadataSection(manifest.case);
  const renderedGenomicSnapshotSection = renderGenomicSnapshotSection(
    manifest.genomicSnapshot,
  );
  const renderedSlideListSection = renderSlideListSection(manifest.slides);
  const renderedNavigationSection = options.navigation
    ? renderCaseNavigationSection(options.navigation)
    : "";
  const stylesheetHref = options.stylesheetHref ?? "styles.css";
  const pageTitle = `${manifest.case.caseId} | TCGA multimodal viewer`;

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(pageTitle)}</title>`,
    `  <link rel="stylesheet" href="${escapeHtml(stylesheetHref)}">`,
    "</head>",
    "<body>",
    "  <main>",
    `    <h1>${escapeHtml(manifest.case.caseId)}</h1>`,
    renderedNavigationSection,
    renderedCaseMetadataSection,
    renderedGenomicSnapshotSection,
    renderedSlideListSection,
    "  </main>",
    "</body>",
    "</html>",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function renderCohortIndexPage(model: CohortIndexPageModel): string {
  const stylesheetHref = model.stylesheetHref ?? "styles.css";
  const pageTitle = `${model.title} | TCGA multimodal viewer`;
  const renderedCases =
    model.cases.length === 0
      ? '  <p class="empty-state">No cases available.</p>'
      : [
          '  <ul class="cohort-index__cards">',
          model.cases
            .map((entry) => {
              const summaryFields: DefinitionListField[] = [
                { label: "Primary diagnosis", value: entry.primaryDiagnosis },
                { label: "Disease type", value: entry.diseaseType },
                { label: "Tumor sample ID", value: entry.tumorSampleId },
                { label: "Slides", value: String(entry.slideCount) },
              ];
              const renderedSummary = renderDefinitionListItems(
                summaryFields,
                "cohort-index__summary-item",
              );
              const mutationSummary =
                entry.mutationHighlightGenes.length === 0
                  ? "No mutation highlights pinned"
                  : entry.mutationHighlightGenes.join(", ");

              return [
                '    <li class="cohort-index__card-item">',
                '      <article class="cohort-case-card">',
                `        <h2><a href="${escapeHtml(entry.href)}">${escapeHtml(entry.caseId)}</a></h2>`,
                '        <dl class="cohort-index__summary">',
                renderedSummary,
                "        </dl>",
                `        <p class="cohort-index__mutations"><strong>Mutation highlights:</strong> ${escapeHtml(mutationSummary)}</p>`,
                "      </article>",
                "    </li>",
              ].join("\n");
            })
            .join("\n"),
          "  </ul>",
        ].join("\n");

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(pageTitle)}</title>`,
    `  <link rel="stylesheet" href="${escapeHtml(stylesheetHref)}">`,
    "</head>",
    "<body>",
    "  <main>",
    '    <section class="cohort-index" aria-labelledby="cohort-index-heading">',
    `      <h1 id="cohort-index-heading">${escapeHtml(model.title)}</h1>`,
    `      <p class="cohort-index__description">${escapeHtml(model.description)}</p>`,
    renderedCases,
    "    </section>",
    "  </main>",
    "</body>",
    "</html>",
  ].join("\n");
}

export function renderCaseNavigationSection(
  navigation: CasePageNavigation,
): string {
  const renderedCaseLinks = navigation.caseLinks
    .map((link) => {
      const currentAttribute = link.current ? ' aria-current="page"' : "";

      return [
        '    <li class="cohort-navigation__case-link-item">',
        `      <a href="${escapeHtml(link.href)}"${currentAttribute}>${escapeHtml(link.caseId)}</a>`,
        "    </li>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<nav class="cohort-navigation" aria-label="Cohort navigation">',
    `  <p class="cohort-navigation__index-link"><a href="${escapeHtml(navigation.cohortIndexHref)}">Back to ${escapeHtml(navigation.cohortTitle)}</a></p>`,
    '  <ul class="cohort-navigation__case-links">',
    renderedCaseLinks,
    "  </ul>",
    "</nav>",
  ].join("\n");
}

export function renderCaseMetadataSection(caseMetadata: CaseMetadata): string {
  const summaryFields: DefinitionListField[] = [
    { label: "Case ID", value: caseMetadata.caseId },
    { label: "GDC Case ID", value: caseMetadata.gdcCaseId },
    { label: "Project", value: caseMetadata.projectId },
    { label: "Primary site", value: caseMetadata.primarySite },
    { label: "Disease type", value: caseMetadata.diseaseType },
    { label: "Primary diagnosis", value: caseMetadata.primaryDiagnosis },
    { label: "Gender", value: caseMetadata.gender },
    { label: "Tumor sample ID", value: caseMetadata.tumorSampleId },
  ];

  const renderedFields = renderDefinitionListItems(
    summaryFields,
    "case-summary__item",
  );

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
  const mutationHighlightsSection = renderMutationHighlightsSection(
    snapshot.mutationHighlights,
  );
  const expressionHighlightsSection = renderExpressionHighlightsSection(
    snapshot.expressionMetric,
    snapshot.expressionHighlights,
  );
  const copyNumberHighlightsSection = renderCopyNumberHighlightsSection(
    snapshot.copyNumberHighlights,
  );

  return [
    '<section class="genomic-snapshot" aria-labelledby="genomic-snapshot-heading">',
    '  <h2 id="genomic-snapshot-heading">Genomic snapshot</h2>',
    mutationHighlightsSection,
    expressionHighlightsSection,
    copyNumberHighlightsSection,
    "</section>",
  ].join("\n");
}

export function renderSlideListSection(slides: SlideReference[]): string {
  if (slides.length === 0) {
    return [
      '<section class="slide-list" aria-labelledby="slide-list-heading">',
      '  <h2 id="slide-list-heading">Slides</h2>',
      '  <p class="empty-state">No public slides available.</p>',
      "</section>",
    ].join("\n");
  }

  const renderedSlides = slides
    .map((slide) => {
      const metadataFields: DefinitionListField[] = [
        { label: "Slide submitter ID", value: slide.slideSubmitterId },
        { label: "File name", value: slide.fileName },
        { label: "Sample type", value: slide.sampleType },
        {
          label: "Experimental strategy",
          value: slide.experimentalStrategy,
        },
        { label: "File ID", value: slide.fileId },
        { label: "Slide ID", value: slide.slideId },
        { label: "Source", value: slide.source },
        { label: "Access", value: slide.access },
      ];

      const renderedMetadata = renderDefinitionListItems(
        metadataFields,
        "slide-list__metadata-item",
      );

      return [
        '    <li class="slide-list__item">',
        '      <article class="slide-card">',
        `        <h3>${escapeHtml(slide.slideSubmitterId)}</h3>`,
        '        <dl class="slide-list__metadata">',
        renderedMetadata,
        "        </dl>",
        '        <p class="slide-list__links">',
        `          <a href="${escapeHtml(slide.publicPageUrl)}" target="_blank" rel="noreferrer">GDC file page</a>`,
        '          <span aria-hidden="true"> · </span>',
        `          <a href="${escapeHtml(slide.publicDownloadUrl)}" target="_blank" rel="noreferrer">Public download</a>`,
        "        </p>",
        renderSlideViewerHandoff(slide.viewerHandoff),
        "      </article>",
        "    </li>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<section class="slide-list" aria-labelledby="slide-list-heading">',
    '  <h2 id="slide-list-heading">Slides</h2>',
    '  <ul class="slide-list__items">',
    renderedSlides,
    "  </ul>",
    "</section>",
  ].join("\n");
}

export function renderSlideViewerHandoff(
  handoff: PublicViewerHandoff,
): string {
  const providerLabel = "IDC Slim viewer";

  return [
    '<p class="slide-viewer-handoff">',
    `  <a href="${escapeHtml(handoff.url)}" target="_blank" rel="noreferrer">Open public slide in ${providerLabel}</a>`,
    "</p>",
  ].join("\n");
}

export function renderMutationHighlightsSection(
  highlights: MutationHighlight[],
): string {
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
  const metricLabel = {
    tpm_unstranded: "TPM (unstranded)",
  }[metric];

  const renderedHighlights =
    highlights.length === 0
      ? '<p class="empty-state">No expression highlights available.</p>'
      : `<ul class="expression-highlight-list">${highlights
          .map(
            (highlight) =>
              `<li><span class="gene-symbol">${escapeHtml(highlight.geneSymbol)}</span>: <span class="expression-value">${String(highlight.tpmUnstranded)}</span></li>`,
          )
          .join("")}</ul>`;

  return `<section class="genomic-highlights expression-highlights"><h3>Expression highlights</h3><p class="expression-metric" data-expression-metric="${escapeHtml(metric)}">Metric: ${metricLabel}</p>${renderedHighlights}</section>`;
}

export function renderCopyNumberHighlightsSection(
  highlights: CopyNumberHighlight[],
): string {
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

nav {
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
}

.cohort-navigation__case-links,
.cohort-index__cards,
.slide-list__items {
  list-style: none;
  padding: 0;
}

.cohort-navigation__case-links,
.cohort-index__cards {
  display: grid;
  gap: 0.75rem;
}

.cohort-case-card,
.slide-card {
  display: grid;
  gap: 0.75rem;
}

.cohort-index__description {
  max-width: 48rem;
}

.cohort-index__mutations strong {
  display: inline-block;
  margin-right: 0.25rem;
}
`;
}
