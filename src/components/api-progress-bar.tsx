"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  API_PROGRESS_BAR_DELAY_MS,
  getApiActivityPhase,
  subscribeToApiActivity,
} from "@/components/api-activity";

export function ApiProgressBar() {
  const phase = useSyncExternalStore(
    subscribeToApiActivity,
    getApiActivityPhase,
    () => "idle" as const,
  );
  // Same "don't flash for instant responses" delay already used for route
  // transitions, so the two top-bar triggers feel consistent.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (phase === "running") {
      const timer = setTimeout(
        () => setVisible(true),
        API_PROGRESS_BAR_DELAY_MS,
      );
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

  if (!visible) return null;

  return <div className="route-loading-bar" aria-hidden="true" />;
}
