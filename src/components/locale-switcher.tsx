"use client";

import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";

import { apiFetch } from "@/components/api-activity";
import { localizedPathname, type Locale } from "@/domain/common/locale";

export function LocaleSwitcher({
  locale,
  navigationLabel,
  vietnameseLabel,
  englishLabel,
  className,
  fallbackSearch = "",
}: {
  locale: Locale;
  navigationLabel: string;
  vietnameseLabel: string;
  englishLabel: string;
  className?: string;
  fallbackSearch?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);

  async function selectLocale(
    event: MouseEvent<HTMLAnchorElement>,
    nextLocale: Locale,
  ) {
    if (nextLocale === locale) return;
    event.preventDefault();
    setPendingLocale(nextLocale);
    const target = `${localizedPathname(pathname, nextLocale)}${window.location.search}${window.location.hash}`;
    try {
      await apiFetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
        signal: AbortSignal.timeout(3_000),
      });
    } catch {
      // Locale navigation remains available when preference persistence fails.
    } finally {
      router.push(target as Route);
      router.refresh();
    }
  }

  return (
    <nav
      className={["locale-toggle", className].filter(Boolean).join(" ")}
      data-locale={locale}
      data-pending={pendingLocale !== null ? "true" : "false"}
      aria-label={navigationLabel}
      aria-busy={pendingLocale !== null}
    >
      <Link
        href={`${localizedPathname(pathname, "vi")}${fallbackSearch}` as Route}
        hrefLang="vi"
        lang="vi"
        aria-current={locale === "vi" ? "page" : undefined}
        aria-label={vietnameseLabel}
        onClick={(event) => void selectLocale(event, "vi")}
      >
        VI
      </Link>
      <Link
        href={`${localizedPathname(pathname, "en")}${fallbackSearch}` as Route}
        hrefLang="en"
        lang="en"
        aria-current={locale === "en" ? "page" : undefined}
        aria-label={englishLabel}
        onClick={(event) => void selectLocale(event, "en")}
      >
        EN
      </Link>
      {pendingLocale && (
        <span className="sr-only" role="status">
          {pendingLocale === "vi" ? vietnameseLabel : englishLabel}
        </span>
      )}
    </nav>
  );
}
