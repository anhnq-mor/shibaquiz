import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getLoadingMessages } from "@/i18n/loading-catalogs";

describe("Shiba loading experience", () => {
  const activity = readFileSync("src/components/api-activity.ts", "utf8");

  it("provides one localized running and completion message", () => {
    expect(getLoadingMessages("vi")).toEqual({
      mission: "Shiba nhận nhiệm vụ rồi!",
      done: "Xong rồi nè! 🐾",
    });
    expect(getLoadingMessages("en")).toEqual({
      mission: "Shiba got the mission!",
      done: "All done! 🐾",
    });
    expect(getLoadingMessages("vi").mission).not.toBe(
      getLoadingMessages("en").mission,
    );
  });

  it("shows a completion phase briefly after the final API request", () => {
    expect(activity).toContain('phase = "running"');
    expect(activity).toContain('phase = "done"');
    expect(activity).toContain("API_COMPLETION_DURATION_MS");
    expect(activity).toContain('phase = "idle"');
  });
});
