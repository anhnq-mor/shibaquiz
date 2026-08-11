import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("route navigation feedback", () => {
  const routeLink = readFileSync("src/components/route-link.tsx", "utf8");
  const loadingFallback = readFileSync(
    "src/components/route-loading.tsx",
    "utf8",
  );
  const stylesheet = readFileSync("src/app/globals.css", "utf8");

  it("uses Next link status and exposes the busy state", () => {
    expect(routeLink).toContain("useLinkStatus");
    expect(routeLink).toContain('setAttribute("aria-busy", "true")');
  });

  it("delays route feedback to avoid flashing on fast navigation", () => {
    expect(stylesheet).toMatch(/route-loading-progress[\s\S]*120ms forwards/);
    expect(stylesheet).toMatch(
      /route-loading-reveal 180ms ease 120ms forwards/,
    );
  });

  it("provides localized status text without blocking the page", () => {
    expect(loadingFallback).toContain('vi: "Đang tải trang…"');
    expect(loadingFallback).toContain('en: "Loading page…"');
    expect(loadingFallback).not.toContain("position: fixed");
  });
});
