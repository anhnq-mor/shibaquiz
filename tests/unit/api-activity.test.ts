import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiFetch,
  API_COMPLETION_DURATION_MS,
  beginApiActivity,
  getApiActivityCount,
  getApiActivityPhase,
  subscribeToApiActivity,
} from "@/components/api-activity";

describe("API activity tracking", () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps the loading state active until every concurrent request finishes", () => {
    const snapshots: number[] = [];
    const unsubscribe = subscribeToApiActivity(() =>
      snapshots.push(getApiActivityCount()),
    );
    const finishFirst = beginApiActivity();
    const finishSecond = beginApiActivity();

    finishFirst();
    expect(getApiActivityCount()).toBe(1);
    finishSecond();
    unsubscribe();

    expect(getApiActivityCount()).toBe(0);
    expect(snapshots).toEqual([1, 2, 1, 0]);
  });

  it("clears the loading state when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(apiFetch("/api/example")).rejects.toThrow("offline");
    expect(getApiActivityCount()).toBe(0);
  });

  it("briefly exposes a completion phase after the final request", () => {
    const finish = beginApiActivity();
    expect(getApiActivityPhase()).toBe("running");

    finish();
    expect(getApiActivityPhase()).toBe("done");

    vi.advanceTimersByTime(API_COMPLETION_DURATION_MS);
    expect(getApiActivityPhase()).toBe("idle");
  });
});
