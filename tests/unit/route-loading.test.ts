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
  const logoLoading = readFileSync("src/components/logo-loading.tsx", "utf8");
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

  it("shows only the brand logo, with a screen-reader label, while a route renders", () => {
    expect(loadingFallback).toContain("LogoLoading");
    expect(loadingCatalog).toContain('loading: "Đang tải…"');
    expect(loadingCatalog).toContain('loading: "Loading…"');
    expect(logoLoading).toContain("BrandMark");
    expect(logoLoading).toContain('aria-hidden="true"');
    expect(logoLoading).toContain("sr-only");
    expect(loadingFallback).not.toContain("position: fixed");
  });

  it("provides a localized loading boundary inside the admin shell", () => {
    expect(adminLoadingBoundary).toContain("AdminRouteLoading");
    expect(adminLoadingFallback).toContain("LogoLoading");
    expect(adminLoadingFallback).toContain('role="status"');
    expect(adminLoadingFallback).toContain('aria-live="polite"');
  });

  it("pulses the logo gently and respects reduced motion", () => {
    expect(stylesheet).toContain("@keyframes logo-loading-pulse");
    expect(stylesheet).toMatch(
      /\.logo-loading-mark\s*{[^}]*animation: logo-loading-pulse/,
    );
    expect(stylesheet).toMatch(
      /prefers-reduced-motion: reduce\)\s*{[\s\S]*\.logo-loading-mark\s*{\s*animation: none;/,
    );
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
