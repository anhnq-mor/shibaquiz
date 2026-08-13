import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("attempt mode choice-card layout", () => {
  const stylesheet = readFileSync("src/app/globals.css", "utf8");

  it("pins the radio input to a fixed size so it cannot claim the row's width", () => {
    // Regression test: an unstyled <input type="radio"> in a flex row has no
    // intrinsic width in WebKit/Safari, so flex-basis:auto let it balloon to
    // ~90% of the row, leaving the label text almost no room and forcing it
    // to wrap one word per line (reported on iPhone Safari).
    expect(stylesheet).toMatch(
      /\.choice-card input\s*{[^}]*flex: 0 0 auto;[^}]*width: 1\.15rem;/,
    );
  });

  it("lets the label text grow to fill the remaining row width", () => {
    expect(stylesheet).toMatch(
      /\.choice-card-body\s*{[^}]*flex: 1 1 auto;[^}]*min-width: 0;/,
    );
  });
});
