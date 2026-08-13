"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  API_OVERLAY_DELAY_MS,
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
  // A request only earns the blocking overlay once it has been running
  // longer than API_OVERLAY_DELAY_MS — fast requests resolve before the
  // timer fires and never show it, keeping quick actions distraction-free.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (phase === "running") {
      const timer = setTimeout(() => setVisible(true), API_OVERLAY_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (phase === "idle") {
      // Deferred rather than called synchronously in the effect body, so
      // this stays a reaction to the external store instead of a same-commit
      // cascading render.
      const timer = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (visible) document.body.setAttribute("aria-busy", "true");
    else document.body.removeAttribute("aria-busy");

    return () => document.body.removeAttribute("aria-busy");
  }, [visible]);

  if (!visible) return null;

  const displayPhase = phase === "done" ? "done" : "running";

  return (
    <div className={`api-loading-overlay${displayPhase === "done" ? " is-done" : ""}`}>
      <div className="api-loading-card" role="status" aria-live="polite">
        <ShibaLoading locale={locale} phase={displayPhase} />
      </div>
    </div>
  );
}
