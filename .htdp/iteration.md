# Iteration

anchor: 16aaeec951e92153e6be51b6bedd9a42799e0ba4
started: 2026-04-21T18:17:30Z
stubber-mode: data-definition-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Problem

Proceed to Phase 1 Iteration 6 by hardening the existing tiny TCGA-BRCA smoke test so a fresh local setup can validate and run the full thin slice from export recipe through the static viewer, while documenting the local run path plus the current known risks and gaps.

## Data Definition Plan

Keep the existing runtime contracts unchanged (`CaseManifest`, `CohortManifest`, and the tiny export recipe remain the source of truth). Add test-only coverage around the documented CLI entrypoints and the end-to-end `export -> build` thin slice, and add bounded documentation that records prerequisites, run commands, and the current Phase 1 risks/gaps for the tiny BRCA smoke test.
