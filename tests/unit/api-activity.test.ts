import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiFetch,
  API_COMPLETION_DURATION_MS,
  API_OVERLAY_DELAY_MS,
  API_PROGRESS_BAR_DELAY_MS,
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

describe("graduated loading feedback (NN/g response-time thresholds)", () => {
  it("escalates delay by how disruptive the indicator is: bar < blocking overlay", () => {
    expect(API_PROGRESS_BAR_DELAY_MS).toBeLessThan(API_OVERLAY_DELAY_MS);
    expect(API_OVERLAY_DELAY_MS).toBeLessThan(API_COMPLETION_DURATION_MS);
  });

  it("only shows the top progress bar once a request outlasts its delay", () => {
    const source = readFileSync("src/components/api-progress-bar.tsx", "utf8");
    expect(source).toContain("API_PROGRESS_BAR_DELAY_MS");
    expect(source).toContain("() => setVisible(true)");
    expect(source).toContain("if (!visible) return null;");
  });

  it("only shows the blocking overlay once a request outlasts its delay", () => {
    const source = readFileSync(
      "src/components/api-loading-overlay.tsx",
      "utf8",
    );
    expect(source).toContain("API_OVERLAY_DELAY_MS");
    expect(source).toContain("() => setVisible(true)");
    expect(source).toContain("if (!visible) return null;");
    // Regression guard: the className template must keep a leading space
    // before "is-done", otherwise it concatenates into one unmatched class
    // token and the overlay silently loses all of its styling.
    expect(source).toContain('" is-done" : ""');
  });
});
