import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getQuizMessages } from "@/i18n/quiz-catalogs";

describe("click feedback on public exam/attempt flows", () => {
  it("provides a localized 'searching'/'starting' label distinct from the idle label", () => {
    const vi = getQuizMessages("vi");
    const en = getQuizMessages("en");
    expect(vi.exams.searching).toBe("Đang tìm…");
    expect(en.exams.searching).toBe("Searching…");
    expect(vi.exams.searching).not.toBe(vi.exams.searchAction);
    expect(en.exams.searching).not.toBe(en.exams.searchAction);
  });

  it("routes exam search through the Next.js router (not a native GET reload) with a pending state", () => {
    const source = readFileSync(
      "src/components/app/exam-search-form.tsx",
      "utf8",
    );
    expect(source).toContain('"use client"');
    expect(source).toContain("useTransition");
    expect(source).toContain("router.push");
    expect(source).toContain("disabled={isPending}");
    // The page itself no longer submits a plain GET form.
    const page = readFileSync("src/app/[locale]/exams/page.tsx", "utf8");
    expect(page).not.toContain('method="GET"');
    expect(page).toContain("ExamSearchForm");
  });

  it("shows a spinning icon (not just text) on pending submit buttons", () => {
    const startForm = readFileSync(
      "src/components/app/start-attempt-form.tsx",
      "utf8",
    );
    expect(startForm).toContain("icon-spin");
    expect(startForm).toContain("Loader2");

    const searchForm = readFileSync(
      "src/components/app/exam-search-form.tsx",
      "utf8",
    );
    expect(searchForm).toContain("icon-spin");
    expect(searchForm).toContain("Loader2");

    const stylesheet = readFileSync("src/app/globals.css", "utf8");
    expect(stylesheet).toContain("@keyframes icon-spin");
    expect(stylesheet).toMatch(
      /prefers-reduced-motion: reduce\)\s*{[\s\S]*\.icon-spin\s*{\s*animation: none;/,
    );
  });

  it("gives every RouteLink an immediate, visible pending cue while navigating", () => {
    const stylesheet = readFileSync("src/app/globals.css", "utf8");
    expect(stylesheet).toMatch(
      /\.route-aware-link\[aria-busy="true"\]\s*{[^}]*opacity: 0\.55;/,
    );
    expect(stylesheet).toMatch(
      /\.route-aware-link\s*{\s*transition: opacity 120ms ease;/,
    );
  });
});
