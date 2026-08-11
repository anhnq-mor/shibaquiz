import { describe, expect, it } from "vitest";

import {
  toQuestionDto,
  type DisclosureContext,
  type StoredQuestionSnapshot,
} from "@/domain/attempts/disclosure";

const snapshot: StoredQuestionSnapshot = {
  schemaVersion: 1,
  locale: "vi",
  sourceQuestionVersion: 3,
  type: "SINGLE_CHOICE",
  content: "2 + 2 bằng bao nhiêu?",
  explanation: "Hai cộng hai bằng bốn.",
  options: [
    { id: "option-a", label: "A", content: "3", isCorrect: false },
    { id: "option-b", label: "B", content: "4", isCorrect: true },
  ],
  media: [
    {
      id: "media-1",
      type: "IMAGE",
      objectKey: "media/private-object-key",
      objectVersion: "version-1",
      mimeType: "image/webp",
      altText: "Minh họa phép cộng",
      caption: null,
      transcript: null,
    },
  ],
};

function context(overrides: Partial<DisclosureContext>): DisclosureContext {
  return {
    mode: "EXAM_DEFERRED",
    attemptStatus: "IN_PROGRESS",
    checkedAt: null,
    ...overrides,
  };
}

describe("question answer disclosure", () => {
  it.each([
    context({ mode: "EXAM_DEFERRED" }),
    context({ mode: "PRACTICE_IMMEDIATE" }),
    context({ mode: "EXAM_DEFERRED", attemptStatus: "ABANDONED" }),
  ])("omits correctness and explanation before disclosure", (state) => {
    const serialized = JSON.stringify(toQuestionDto(snapshot, state));

    expect(serialized).not.toContain("isCorrect");
    expect(serialized).not.toContain("explanation");
    expect(serialized).not.toContain("objectKey");
    expect(serialized).not.toContain("private-object-key");
    expect(serialized).not.toContain("objectVersion");
  });

  it("reveals study answers immediately", () => {
    const result = toQuestionDto(snapshot, context({ mode: "STUDY" }));

    expect(result.disclosure).toBe("REVEALED");
    if (result.disclosure === "REVEALED") {
      expect(result.explanation).toBe(snapshot.explanation);
      expect(result.options[1]?.isCorrect).toBe(true);
    }
  });

  it("reveals an immediate-practice answer only after check", () => {
    const before = toQuestionDto(
      snapshot,
      context({ mode: "PRACTICE_IMMEDIATE" }),
    );
    const after = toQuestionDto(
      snapshot,
      context({
        mode: "PRACTICE_IMMEDIATE",
        checkedAt: new Date("2026-08-04T00:00:00Z"),
      }),
    );

    expect(before.disclosure).toBe("HIDDEN");
    expect(after.disclosure).toBe("REVEALED");
  });

  it.each(["SUBMITTED", "EXPIRED"] as const)(
    "reveals an unchecked immediate-practice answer once the attempt is %s",
    (attemptStatus) => {
      const result = toQuestionDto(
        snapshot,
        context({ mode: "PRACTICE_IMMEDIATE", attemptStatus }),
      );
      expect(result.disclosure).toBe("REVEALED");
    },
  );

  it("keeps an unchecked immediate-practice answer hidden while still in progress", () => {
    const result = toQuestionDto(
      snapshot,
      context({ mode: "PRACTICE_IMMEDIATE", attemptStatus: "IN_PROGRESS" }),
    );
    expect(result.disclosure).toBe("HIDDEN");
  });

  it.each(["SUBMITTED", "EXPIRED"] as const)(
    "reveals deferred answers after %s",
    (attemptStatus) => {
      expect(
        toQuestionDto(snapshot, context({ attemptStatus })).disclosure,
      ).toBe("REVEALED");
    },
  );

  it("keeps the snapshot locale independent from UI locale", () => {
    const result = toQuestionDto(snapshot, context({ mode: "STUDY" }));
    expect(result.locale).toBe("vi");
    expect(result.content).toBe(snapshot.content);
  });

  it("does not disclose matching associations or ordering keys early", () => {
    const structured: StoredQuestionSnapshot = {
      ...snapshot,
      schemaVersion: 2,
      type: "MATCHING",
      options: snapshot.options.map((option, index) => ({
        ...option,
        correctOrder: index,
        matchTargetId: `target-${index}`,
        matchTargetContent: `Target ${index}`,
      })),
      matchingTargetOrder: ["target-1", "target-0"],
    };
    const serialized = JSON.stringify(
      toQuestionDto(structured, context({ mode: "EXAM_DEFERRED" })),
    );
    expect(serialized).not.toContain("correctMatchTargetId");
    expect(serialized).not.toContain("correctOrder");
    expect(serialized).not.toContain("isCorrect");
    expect(serialized).toContain("matchingTargets");
  });
});
