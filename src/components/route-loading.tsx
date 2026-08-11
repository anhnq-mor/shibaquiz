"use client";

import { useParams } from "next/navigation";

import { isLocale } from "@/domain/common/locale";

const labels = {
  vi: "Đang tải trang…",
  en: "Loading page…",
} as const;

export function RouteLoading() {
  const params = useParams<{ locale?: string | string[] }>();
  const candidate = Array.isArray(params.locale)
    ? params.locale[0]
    : params.locale;
  const locale = candidate && isLocale(candidate) ? candidate : "vi";

  return (
    <main className="route-loading-shell" aria-busy="true">
      <div className="route-loading-bar" aria-hidden="true" />
      <div className="page-shell route-loading-content" role="status">
        <div className="route-loading-card">
          <span className="route-loading-spinner" aria-hidden="true" />
          <span>{labels[locale]}</span>
        </div>
        <div className="route-loading-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  );
}
