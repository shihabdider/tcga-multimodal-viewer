# Project guide

## Read first
- Read `spec.md` completely before making changes.
- Treat `spec.md` as the source of truth for scope, constraints, and milestone order.

## Working principles
- Optimize for the **smallest useful public artifact**.
- Keep the project **open-data only** unless explicitly changed later.
- Prefer **static or static-first** architecture.
- Avoid self-hosting raw WSIs in the first phase.
- Keep the initial scope to **one cohort**.
- Use HPC only for **offline pathology compute** once the data contract is stable.

## Default technical direction
- Default cohort: **TCGA-BRCA**
- Default genomics source: **GDC open data**
- Default slide source: **IDC / public TCGA pathology images**
- Default deployment style: **public static site + small exported assets**

## Constraints
- Do not depend on controlled-access TCGA files for the public artifact.
- Do not widen scope to all of TCGA before one cohort is coherent.
- Do not let the pathology AI layer delay the first useful viewer.

## Checkpoint preference
When finishing a task or hitting a real decision point, keep checkpoints concise and mention what was actually verified.

## UX review
- For frontend or UX review, use the `web-browser` skill.
- Use its isolated Playwright Chromium instance rather than the user's running Chrome so review does not interfere with existing browser windows or profile state.

## HtDP workflow
- htdp.mode: autonomous
- htdp.transparent: true
