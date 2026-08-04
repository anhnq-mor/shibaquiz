import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vietnamese typography", () => {
  const stylesheet = readFileSync("src/app/globals.css", "utf8");

  it("uses one Vietnamese-capable glyph source before generic fallbacks", () => {
    expect(stylesheet).toMatch(
      /--font-display:\s*"Times New Roman", "Noto Serif", "Liberation Serif", serif;/,
    );
    expect(stylesheet).not.toContain("Georgia");
  });

  it("keeps the Vietnamese heading as precomposed Unicode", () => {
    const heading = "Nền móng được thiết kế cho sự tin cậy";
    expect(heading).toBe(heading.normalize("NFC"));
  });
});
