"use client";

import { useSyncExternalStore } from "react";

import {
  getApiActivityPhase,
  subscribeToApiActivity,
} from "@/components/api-activity";

export function ApiProgressBar() {
  const phase = useSyncExternalStore(
    subscribeToApiActivity,
    getApiActivityPhase,
    () => "idle" as const,
  );

  if (phase === "idle") return null;

  return <div className="route-loading-bar" aria-hidden="true" />;
}
