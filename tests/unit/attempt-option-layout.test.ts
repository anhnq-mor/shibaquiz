import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("attempt question/option layout on narrow phones", () => {
  const stylesheet = readFileSync("src/app/globals.css", "utf8");

  it("tightens question panel and option padding under the narrow-phone breakpoint", () => {
    // Regression test: on an iPhone-width viewport the desktop-sized padding
    // on .attempt-question-panel/.option-list li plus the radio+letter-badge
    // gap ate ~35% of the row before any question/answer text started,
    // leaving a visible empty gap on the right of every wrapped line
    // (reported on iPhone 13 Pro Max Safari).
    expect(stylesheet).toMatch(
      /@media \(max-width: 40rem\) \{[\s\S]*?\.attempt-question-panel\s*{\s*padding: 1rem;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 40rem\) \{[\s\S]*?\.option-list li\s*{\s*padding: 0\.65rem 0\.75rem;/,
    );
  });

  it("keeps the narrow-phone override after the base rule so equal-specificity cascade order doesn't silently undo it", () => {
    // Regression test: a media-query rule does not "win" over a later,
    // equal-specificity unscoped rule just because it's conditional — source
    // order still decides. The fix was declared before the base
    // .option-list li rule, so the base rule always won and the override had
    // zero effect at any viewport width. Guard the fix's position instead of
    // just its existence.
    const baseIndex = stylesheet.indexOf(".option-list li {");
    const overrideIndex = stylesheet.search(
      /@media \(max-width: 40rem\) \{\s*\.attempt-question-panel \{\s*padding: 1rem;/,
    );
    expect(baseIndex).toBeGreaterThan(-1);
    expect(overrideIndex).toBeGreaterThan(-1);
    expect(overrideIndex).toBeGreaterThan(baseIndex);
  });
});
