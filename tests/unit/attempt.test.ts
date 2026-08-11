import { describe, expect, it } from "vitest";

import {
  computeAttemptExpiry,
  computeAttemptResult,
  isAnswerCorrect,
  isAttemptExpired,
  shuffle,
} from "@/domain/attempts/attempt";

describe("isAnswerCorrect", () => {
  it("matches an exact single-choice selection", () => {
    expect(isAnswerCorrect(["b"], ["b"])).toBe(true);
    expect(isAnswerCorrect(["a"], ["b"])).toBe(false);
  });

  it("requires the full correct set for multiple-choice, no more and no less", () => {
    expect(isAnswerCorrect(["a", "c"], ["a", "c"])).toBe(true);
    expect(isAnswerCorrect(["a"], ["a", "c"])).toBe(false);
    expect(isAnswerCorrect(["a", "c", "d"], ["a", "c"])).toBe(false);
  });

  it("ignores selection order and duplicate ids", () => {
    expect(isAnswerCorrect(["c", "a"], ["a", "c"])).toBe(true);
    expect(isAnswerCorrect(["a", "a"], ["a"])).toBe(true);
  });

  it("treats an empty selection as incorrect unless nothing is correct", () => {
    expect(isAnswerCorrect([], ["a"])).toBe(false);
    expect(isAnswerCorrect([], [])).toBe(true);
  });
});

describe("computeAttemptExpiry / isAttemptExpired", () => {
  const startedAt = new Date("2026-08-05T10:00:00.000Z");

  it("returns null when a test has no duration", () => {
    expect(computeAttemptExpiry(startedAt, null)).toBeNull();
  });

  it("adds the duration in minutes to the start time", () => {
    const expiresAt = computeAttemptExpiry(startedAt, 30);
    expect(expiresAt?.toISOString()).toBe("2026-08-05T10:30:00.000Z");
  });

  it("is never expired when there is no expiry", () => {
    expect(isAttemptExpired(new Date("2099-01-01"), null)).toBe(false);
  });

  it("compares now against the expiry timestamp", () => {
    const expiresAt = new Date("2026-08-05T10:30:00.000Z");
    expect(
      isAttemptExpired(new Date("2026-08-05T10:29:59.000Z"), expiresAt),
    ).toBe(false);
    expect(
      isAttemptExpired(new Date("2026-08-05T10:30:01.000Z"), expiresAt),
    ).toBe(true);
  });
});

describe("shuffle", () => {
  it("returns a permutation of the same items without mutating the input", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, () => 0.999999);
    expect(result).not.toBe(input);
    expect([...result].sort()).toEqual([...input].sort());
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it("is deterministic for a fixed random source", () => {
    const first = shuffle([1, 2, 3, 4], () => 0.5);
    const second = shuffle([1, 2, 3, 4], () => 0.5);
    expect(first).toEqual(second);
  });
});

describe("computeAttemptResult", () => {
  it("scores correct, incorrect, and unanswered questions per topic", () => {
    const result = computeAttemptResult([
      { topicId: "t1", selectedOptionIds: ["a"], correctOptionIds: ["a"] },
      { topicId: "t1", selectedOptionIds: ["b"], correctOptionIds: ["a"] },
      { topicId: "t2", selectedOptionIds: [], correctOptionIds: ["a"] },
      {
        topicId: "t2",
        selectedOptionIds: ["a", "b"],
        correctOptionIds: ["a", "b"],
      },
    ]);

    expect(result.correctCount).toBe(2);
    expect(result.incorrectCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
    expect(result.scorePercent).toBe(50);

    const t1 = result.topicBreakdown.find((topic) => topic.topicId === "t1")!;
    expect(t1).toMatchObject({
      correctCount: 1,
      incorrectCount: 1,
      unansweredCount: 0,
      totalCount: 2,
    });
    const t2 = result.topicBreakdown.find((topic) => topic.topicId === "t2")!;
    expect(t2).toMatchObject({
      correctCount: 1,
      incorrectCount: 0,
      unansweredCount: 1,
      totalCount: 2,
    });
  });

  it("rounds the score to two decimal places", () => {
    const result = computeAttemptResult([
      { topicId: "t1", selectedOptionIds: ["a"], correctOptionIds: ["a"] },
      { topicId: "t1", selectedOptionIds: [], correctOptionIds: ["a"] },
      { topicId: "t1", selectedOptionIds: [], correctOptionIds: ["a"] },
    ]);
    expect(result.scorePercent).toBe(33.33);
  });

  it("returns a zero score for an empty question set", () => {
    expect(computeAttemptResult([]).scorePercent).toBe(0);
  });
});
