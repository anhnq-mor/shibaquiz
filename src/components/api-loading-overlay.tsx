"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  getApiActivityPhase,
  subscribeToApiActivity,
} from "@/components/api-activity";
import { ShibaLoading } from "@/components/shiba-loading";
import type { Locale } from "@/domain/common/locale";

export function ApiLoadingOverlay({ locale }: { locale: Locale }) {
  const phase = useSyncExternalStore(
    subscribeToApiActivity,
    getApiActivityPhase,
    () => "idle" as const,
  );
  const busy = phase === "running";

  useEffect(() => {
    if (busy) document.body.setAttribute("aria-busy", "true");
    else document.body.removeAttribute("aria-busy");

    return () => document.body.removeAttribute("aria-busy");
  }, [busy]);

  if (phase === "idle") return null;

  return (
    <div className={`api-loading-overlay${phase === "done" ? "is-done" : ""}`}>
      <div className="api-loading-card" role="status" aria-live="polite">
        <ShibaLoading locale={locale} phase={phase} />
      </div>
    </div>
  );
}
