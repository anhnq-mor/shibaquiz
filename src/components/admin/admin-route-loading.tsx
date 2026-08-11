"use client";

import { useParams } from "next/navigation";

import { isLocale } from "@/domain/common/locale";
import { ShibaLoading } from "@/components/shiba-loading";

export function AdminRouteLoading() {
  const params = useParams<{ locale?: string | string[] }>();
  const candidate = Array.isArray(params.locale)
    ? params.locale[0]
    : params.locale;
  const locale = candidate && isLocale(candidate) ? candidate : "vi";

  return (
    <section className="admin-route-loading" aria-busy="true">
      <div className="route-loading-bar" aria-hidden="true" />
      <div className="route-loading-content" role="status" aria-live="polite">
        <ShibaLoading locale={locale} phase="running" />
      </div>
    </section>
  );
}
