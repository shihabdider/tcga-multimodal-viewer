# TCGA Multimodal Viewer — Spec

_Created: 2026-04-20._

## Goal

Build a **public, open-data, portfolio-quality TCGA multimodal atlas** that combines:
- a **case-level genomic snapshot** from **open GDC data**
- an interactive **whole-slide image (WSI) viewer** over **public IDC/TCGA pathology images**
- a later **pathology-derived layer** such as overlays or slide-level summaries

This project is intentionally framed as a **product / systems / AI-frontend artifact**, not as a methods-first modeling paper.

The long-term career relevance is to build the product, data, and pathology-platform instincts needed for future institutional **slide -> function** work. The repo itself remains a **bounded public open-data project**.

## Final MVP framing

The target artifact is a **3-phase MVP**.

### Phase 1 — open-data multimodal smoke test
- choose one initial cohort, default **TCGA-BRCA**
- verify joins across:
  - **GDC open case-level genomics / clinical data**
  - **IDC / TCGA slide metadata and slide access**
- build a small exported manifest for a **tiny subset** of cases and slides
- prove that one public case page can show:
  - case metadata
  - a genomic snapshot
  - a linked slide list
  - a working remote slide-viewing path

### Phase 2 — public cohort viewer
- build a static or static-first public frontend for one cohort
- support:
  - cohort search / filtering
  - case pages
  - genomic summary panels
  - slide selection and deep-zoom viewing
- keep the site **open-data only** and **public-hostable on a personal account**

### Phase 3 — pathology intelligence layer
- add one bounded pathology-derived layer, for example:
  - tissue / compartment summaries
  - immune / stromal / epithelial / proliferation overlays
  - slide-level pathology summary features
- compute this layer offline, ideally on HPC for scale
- export only the small derived artifacts needed by the public frontend

This MVP should yield:
- a **real multimodal public atlas** for one TCGA cohort
- one **genomics + slide** integration path that is smoother than jumping across multiple portals
- one **pathology-derived differentiator** beyond existing public resources

## Immediate next milestone

The next immediate milestone is **Phase 1**: a small open-data multimodal smoke test on **TCGA-BRCA**.

Phase 1 is complete when all of the following are true:
- one small cohort subset is selected and documented
- a reproducible join exists between:
  - GDC case identifiers
  - slide metadata / image identifiers
  - the public viewer manifest format
- one case page can show a usable genomic snapshot from open data
- one slide can be opened through the chosen remote viewing path
- the resulting artifact is static or static-first and can be run locally

## Why this order

This sequencing is intentional:
- it produces a **useful portfolio artifact before heavy AI work**
- it keeps the first win **public, honest, and open-data only**
- it makes the genomics + slide integration real before spending time on model training
- it allows most product work to happen **locally on a laptop**
- it postpones HPC needs until they are clearly justified by the pathology layer

## Data roles

## 1. GDC open TCGA data: genomics and case metadata
Treat GDC as the source for the **public genomic snapshot**.

Default public/open modalities to use:
- **Masked Somatic Mutation**
- **Gene Expression Quantification**
- **Gene Level Copy Number**
- **Copy Number Segment**
- **Allele-specific Copy Number Segment**
- **Methylation Beta Value**
- public clinical / biospecimen metadata as needed

Important constraint:
- do **not** depend on controlled-access inputs such as BAMs, germline data, or other low-level files for the public artifact

## 2. IDC / public TCGA pathology images: slide layer
Treat IDC as the default source for the **public slide layer**.

Default use:
- remote deep-zoom / slide access for low-traffic portfolio use
- metadata linkage between public TCGA images and case identifiers

Important caveat:
- the IDC public DICOMweb proxy has **undisclosed per-IP and global daily quotas**
- it is acceptable for low-traffic portfolio/demo use
- it should not be treated as guaranteed production infrastructure

## 3. Offline derived pathology artifacts: differentiator layer
Treat all pathology-derived outputs as **offline-produced artifacts**.

Examples:
- small overlay tiles / summaries
- slide-level pathology features
- thumbnails / previews
- compact retrieval or region summaries if they stay small

These should be exported in a frontend-friendly form and hosted separately from the raw WSIs.

## Corrected conceptual model

The first useful multimodal atlas should **not** be framed as:
- `all TCGA files in one frontend`

The first useful atlas should be framed as:
- `curated public genomic summary + slide viewer + one pathology-derived layer`

The project is therefore about **opinionated integration**, not raw file exposure.

## Core product concept

## Cohort view
For one public TCGA cohort, the viewer should support:
- filtering and searching cases
- cohort summaries over selected public genomics fields
- eventual pathology-derived summaries usable as cohort filters

## Case view
For one case, the viewer should support:
- case metadata and subtype context
- a compact genomic snapshot
- a list of associated slides
- links between case-level molecular context and slide exploration

## Slide view
For one slide, the viewer should support:
- deep zoom over the public slide image
- optional thumbnails / previews
- optional pathology-derived overlays or summaries
- a linked panel back to case-level genomics

## Recommended first disease scope

Start with **breast cancer**.

### Why breast first
- strong public TCGA presence via **TCGA-BRCA**
- intuitive genomics context and subtype framing
- continuity with earlier breast-focused spatial pathology thinking
- large enough to feel real, still bounded enough for a first cohort

### Default initial cohort
- **TCGA-BRCA**

### Default initial snapshot fields
Start with a bounded set that is useful and public:
- receptor / subtype context if publicly available through chosen tables
- key somatic mutations
- expression-derived module or signature summaries
- copy-number summaries
- methylation summaries if they stay cheap and interpretable

## Technical workflow

## Phase 1: small local smoke test
Goal:
- prove the public multimodal join and one working case page

Work:
- select a small BRCA subset
- ingest open GDC case-level data
- ingest or query slide metadata
- verify a remote slide viewing path
- export a tiny local manifest for the frontend

Deliverable:
- one local-running multimodal smoke test over a small subset

## Phase 2: full one-cohort public atlas
Goal:
- make a genuinely useful public TCGA cohort viewer

Work:
- expand manifests from a tiny subset to a full chosen cohort
- build cohort and case views
- build genomic summary panels
- keep deployment static or static-first when possible

Deliverable:
- a public open-data TCGA cohort viewer

## Phase 3: pathology-derived layer
Goal:
- add one differentiating pathology layer that existing portals do not already provide cleanly

Work:
- choose a bounded pathology output
- compute it offline on a bounded subset first
- scale on HPC only after the contract is stable
- export small frontend-ready artifacts

Deliverable:
- one public pathology-derived layer integrated into the cohort and slide views

## Local-first vs HPC partition

## Laptop-friendly work
The following should stay local by default:
- product / frontend development
- manifest design
- genomics data integration and summarization
- cohort / case / slide routing
- small-slice slide integration tests
- work on a tiny subset of cases and slides

## HPC-friendly work
The following should move to HPC only when needed:
- bulk WSI download / storage
- cohort-scale tiling / patch extraction
- pathology foundation-model embedding extraction
- overlay generation at scale
- training or evaluating serious pathology models

This partition is a core constraint: **most development should be possible on a laptop until the pathology layer justifies scale-out**.

## Constraints

- **open-data only** for the public artifact
- **public-hostable on a personal account**
- **do not depend on controlled-access TCGA files**
- **do not self-host the full raw WSI corpus** in the first phase
- prefer **static or static-first** architecture
- optimize for the **smallest useful portfolio artifact**
- use HPC only for offline, scale-justified pathology compute
- keep the initial scope to **one cohort**

## Success criteria

The MVP is successful when it can:
- present one real TCGA cohort in a coherent public interface
- show a useful case-level genomic snapshot from open data
- open associated public pathology slides in a workable viewer path
- provide at least one pathology-derived differentiator
- remain understandable, affordable to host, and runnable from exported artifacts

## Cost target

Target the default hosting model to fit within **low tens of dollars per month or less** on a personal account.

That implies:
- avoid hosting raw WSIs
- prefer small exported assets
- keep the frontend static or mostly static
- treat IDC as the default live slide backend for the early public artifact

## Risks

## Product risk
- without a real pathology-derived differentiator, the project may feel redundant with GDC + IDC + cBioPortal used separately

## Infrastructure risk
- IDC public DICOMweb proxy quotas are undisclosed and may change

## Data risk
- public open TCGA data is useful but incomplete relative to full controlled-access multimodality
- true raw-genomics-style views are out of scope for the public version

## Scope risk
- attempting to support all TCGA or too many modalities too early will likely stall the project

## Non-goals

- reproducing full gOS functionality
- depending on BAMs, germline data, or controlled-access files
- self-hosting the entire TCGA pathology image corpus in v1
- building a general-purpose TCGA repository browser
- methods-first novelty claims around pathology -> biology modeling
- starting with more than one cohort before the first cohort is coherent

## Practical starting recommendation

The best immediate move is:
1. create a tiny **TCGA-BRCA** open-data subset manifest
2. prove the **case -> genomics snapshot -> slide viewer** path locally
3. build a thin public-facing cohort/case frontend around that contract
4. only then choose the first pathology-derived layer

## Source context

This project was spun out of:
- `/Users/diders01/projects/pcam-foundation/docs/open_multimodal_archive_proposal.md`
- follow-up design discussion around a **public TCGA multimodal viewer**
- a shift away from a methods-first / GHIST-centered framing toward a **portfolio-quality multimodal atlas**
