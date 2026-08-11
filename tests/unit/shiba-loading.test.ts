import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getLoadingMessages } from "@/i18n/loading-catalogs";

describe("Shiba loading experience", () => {
  const activity = readFileSync("src/components/api-activity.ts", "utf8");

  it("provides bilingual running and completion copy", () => {
    expect(getLoadingMessages("vi")).toEqual({
      missionPrimary: "Shiba nhận nhiệm vụ rồi! 🐕💨",
      missionSecondary: "Shiba got the mission!",
      donePrimary: "Xong rồi nè! 🐾",
      doneSecondary: "All done!",
    });
    expect(getLoadingMessages("en").missionPrimary).toBe(
      "Shiba got the mission! 🐕💨",
    );
  });

  it("shows a completion phase briefly after the final API request", () => {
    expect(activity).toContain('phase = "running"');
    expect(activity).toContain('phase = "done"');
    expect(activity).toContain("API_COMPLETION_DURATION_MS");
    expect(activity).toContain('phase = "idle"');
  });
});
