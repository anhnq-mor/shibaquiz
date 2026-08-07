import { describe, expect, it } from "vitest";

import {
  localeFromAcceptLanguage,
  localizedPathname,
  resolveLocale,
} from "@/domain/common/locale";
import { formatDateTime, formatNumber, formatPercent } from "@/i18n/format";

describe("locale policy", () => {
  it("resolves profile, cookie, weighted language header, then Vietnamese", () => {
    expect(
      resolveLocale({
        profileLocale: "en",
        cookieLocale: "vi",
        acceptLanguage: "vi;q=1,en;q=0.8",
      }),
    ).toBe("en");
    expect(resolveLocale({ cookieLocale: "en", acceptLanguage: "vi" })).toBe(
      "en",
    );
    expect(resolveLocale({ acceptLanguage: "fr, en-US;q=0.9" })).toBe("en");
    expect(resolveLocale({ acceptLanguage: "fr" })).toBe("vi");
  });

  it("honors quality values and ignores unsupported or disabled languages", () => {
    expect(localeFromAcceptLanguage("en;q=0.4,vi;q=0.9")).toBe("vi");
    expect(localeFromAcceptLanguage("en;q=0,fr;q=1")).toBeUndefined();
  });

  it("changes only the locale path segment", () => {
    expect(localizedPathname("/vi/reset-password", "en")).toBe(
      "/en/reset-password",
    );
    expect(localizedPathname("/account", "vi")).toBe("/vi/account");
  });

  it("formats canonical values with locale-aware conventions", () => {
    expect(formatNumber(1234.5, "vi")).toBe("1.234,5");
    expect(formatNumber(1234.5, "en")).toBe("1,234.5");
    expect(formatPercent(0.875, "vi")).toContain("87,5");
    expect(formatPercent(0.875, "en")).toContain("87.5");
    expect(formatDateTime("2026-08-05T10:30:00Z", "en")).toContain("10:30");
  });
});
