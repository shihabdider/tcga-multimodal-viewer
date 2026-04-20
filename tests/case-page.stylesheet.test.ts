import { describe, expect, test } from "bun:test";

import { renderSingleCaseStylesheet } from "../src/rendering/case-page";

describe("renderSingleCaseStylesheet", () => {
  test("returns raw CSS with baseline typography and layout for a readable local page", () => {
    const css = renderSingleCaseStylesheet();

    expect(css.trim().length).toBeGreaterThan(0);
    expect(css).not.toContain("<style");
    expect(css).toMatch(/body\s*\{[^}]*font-family:/s);
    expect(css).toMatch(/body\s*\{[^}]*line-height:/s);
    expect(css).toMatch(/main\s*\{[^}]*max-width:/s);
    expect(css).toMatch(/section\s*\{[^}]*padding:/s);
  });

  test("styles manifest-like tabular content without depending on remote assets", () => {
    const css = renderSingleCaseStylesheet();

    expect(css).toMatch(/table\s*\{[^}]*border-collapse:/s);
    expect(css).toMatch(/th,\s*td\s*\{[^}]*padding:/s);
    expect(css).toMatch(/a\s*\{[^}]*color:/s);
    expect(css).not.toMatch(/@import/i);
    expect(css).not.toMatch(/url\((['"])?https?:/i);
  });
});
