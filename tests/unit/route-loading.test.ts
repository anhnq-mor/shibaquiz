import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("route navigation feedback", () => {
  const routeLink = readFileSync("src/components/route-link.tsx", "utf8");
  const loadingFallback = readFileSync(
    "src/components/route-loading.tsx",
    "utf8",
  );
  const adminLoadingFallback = readFileSync(
    "src/components/admin/admin-route-loading.tsx",
    "utf8",
  );
  const adminLoadingBoundary = readFileSync(
    "src/app/[locale]/admin/loading.tsx",
    "utf8",
  );
  const loadingCatalog = readFileSync("src/i18n/loading-catalogs.ts", "utf8");
  const shibaLoading = readFileSync("src/components/shiba-loading.tsx", "utf8");
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
    expect(loadingFallback).toContain("ShibaLoading");
    expect(loadingCatalog).toContain('mission: "Shiba nhận nhiệm vụ rồi!"');
    expect(loadingCatalog).toContain('mission: "Shiba got the mission!"');
    expect(shibaLoading).toContain('aria-hidden="true"');
    expect(loadingFallback).not.toContain("position: fixed");
  });

  it("provides a localized loading boundary inside the admin shell", () => {
    expect(adminLoadingBoundary).toContain("AdminRouteLoading");
    expect(adminLoadingFallback).toContain("ShibaLoading");
    expect(adminLoadingFallback).toContain('role="status"');
    expect(adminLoadingFallback).toContain('aria-live="polite"');
  });

  it("runs Shiba left to right and respects reduced motion", () => {
    expect(stylesheet).toContain("@keyframes shiba-run-across");
    expect(stylesheet).toContain("@keyframes shiba-tail-done");
    expect(stylesheet).toContain("prefers-reduced-motion: reduce");
  });

  it("centers route loading for admin and regular user screens", () => {
    expect(stylesheet).toMatch(
      /\.route-loading-shell,\s*\.admin-route-loading\s*{[^}]*place-items: center;/,
    );
    expect(stylesheet).toMatch(
      /\.route-loading-content\s*{[^}]*justify-self: center;[^}]*margin-inline: auto;/,
    );
  });
});
