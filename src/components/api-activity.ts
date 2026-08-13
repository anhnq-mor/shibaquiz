import "client-only";

type ApiActivityListener = () => void;
export type ApiActivityPhase = "idle" | "running" | "done";

export const API_COMPLETION_DURATION_MS = 720;

// Nielsen Norman Group response-time thresholds: sub-second actions only need
// a light, non-blocking cue; the disruptive full-screen overlay should wait
// long enough that the user would otherwise wonder if the app is frozen.
export const API_PROGRESS_BAR_DELAY_MS = 120;
export const API_OVERLAY_DELAY_MS = 500;

const listeners = new Set<ApiActivityListener>();
let activeRequestCount = 0;
let phase: ApiActivityPhase = "idle";
let completionTimer: ReturnType<typeof setTimeout> | null = null;

function emitChange() {
  for (const listener of listeners) listener();
}

export function subscribeToApiActivity(listener: ApiActivityListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getApiActivityCount() {
  return activeRequestCount;
}

export function getApiActivityPhase() {
  return phase;
}

export function beginApiActivity() {
  if (completionTimer !== null) {
    clearTimeout(completionTimer);
    completionTimer = null;
  }
  activeRequestCount += 1;
  phase = "running";
  emitChange();
  let finished = false;

  return () => {
    if (finished) return;
    finished = true;
    activeRequestCount = Math.max(0, activeRequestCount - 1);
    if (activeRequestCount === 0) {
      phase = "done";
      completionTimer = setTimeout(() => {
        phase = "idle";
        completionTimer = null;
        emitChange();
      }, API_COMPLETION_DURATION_MS);
    }
    emitChange();
  };
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const finish = beginApiActivity();
  try {
    return await fetch(input, init);
  } finally {
    finish();
  }
}
