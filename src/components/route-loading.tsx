"use client";

import { useParams } from "next/navigation";

import { isLocale } from "@/domain/common/locale";
import { LogoLoading } from "@/components/logo-loading";

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
        <LogoLoading locale={locale} />
      </div>
    </main>
  );
}
