import { describe, expect, test } from "bun:test";

import manifest from "../manifests/tcga-brca/tcga-e9-a5fl.case-manifest.json";
import { validateSourceFileReference } from "../src/contracts/case-manifest.validation";

const validReference = manifest.genomicSnapshot.sourceFiles.maskedSomaticMutation;

describe("validateSourceFileReference", () => {
  test("returns the checked-in public GDC source-file descriptor", () => {
    expect(validateSourceFileReference(validReference)).toEqual(validReference);
  });

  test("drops unrelated properties outside the bounded contract", () => {
    expect(
      validateSourceFileReference({
        ...validReference,
        size: 12345,
      }),
    ).toEqual(validReference);
  });

  test("throws when the descriptor is not an object", () => {
    for (const invalidValue of [null, "file", 42, []]) {
      expect(() => validateSourceFileReference(invalidValue)).toThrow(
        /SourceFileReference must be an object/,
      );
    }
  });

  test("throws when fileId is missing", () => {
    expect(() =>
      validateSourceFileReference({
        fileName: validReference.fileName,
        dataType: validReference.dataType,
        workflow: validReference.workflow,
      }),
    ).toThrow(/SourceFileReference\.fileId must be a non-empty string/);
  });

  test("throws when required fields are blank or not strings", () => {
    expect(() =>
      validateSourceFileReference({
        ...validReference,
        dataType: "",
      }),
    ).toThrow(/SourceFileReference\.dataType must be a non-empty string/);

    expect(() =>
      validateSourceFileReference({
        ...validReference,
        workflow: 101,
      }),
    ).toThrow(/SourceFileReference\.workflow must be a non-empty string/);
  });
});
