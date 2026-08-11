import "client-only";

type ApiActivityListener = () => void;

const listeners = new Set<ApiActivityListener>();
let activeRequestCount = 0;

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

export function beginApiActivity() {
  activeRequestCount += 1;
  emitChange();
  let finished = false;

  return () => {
    if (finished) return;
    finished = true;
    activeRequestCount = Math.max(0, activeRequestCount - 1);
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
