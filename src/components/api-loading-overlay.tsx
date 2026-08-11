"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  getApiActivityCount,
  subscribeToApiActivity,
} from "@/components/api-activity";

export function ApiLoadingOverlay({ label }: { label: string }) {
  const activeRequestCount = useSyncExternalStore(
    subscribeToApiActivity,
    getApiActivityCount,
    () => 0,
  );
  const visible = activeRequestCount > 0;

  useEffect(() => {
    if (visible) document.body.setAttribute("aria-busy", "true");
    else document.body.removeAttribute("aria-busy");

    return () => document.body.removeAttribute("aria-busy");
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="api-loading-overlay">
      <div className="api-loading-card" role="status" aria-live="polite">
        <span className="api-loading-spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}
