import { afterEach, describe, expect, it, vi } from "vitest";

import {
  apiFetch,
  beginApiActivity,
  getApiActivityCount,
  subscribeToApiActivity,
} from "@/components/api-activity";

describe("API activity tracking", () => {
  afterEach(() => vi.unstubAllGlobals());

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
});
