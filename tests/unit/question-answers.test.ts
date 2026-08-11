import { describe, expect, it } from "vitest";

import {
  isAttemptAnswerCorrect,
  validateAnswerForSnapshot,
} from "@/domain/attempts/answer";
import type { StoredQuestionSnapshot } from "@/domain/attempts/disclosure";

const ids = {
  leftA: "10000000-0000-4000-8000-000000000001",
  leftB: "10000000-0000-4000-8000-000000000002",
  rightA: "20000000-0000-4000-8000-000000000001",
  rightB: "20000000-0000-4000-8000-000000000002",
};

function snapshot(type: "MATCHING" | "ORDERING"): StoredQuestionSnapshot {
  return {
    schemaVersion: 2,
    locale: "vi",
    sourceQuestionVersion: 1,
    type,
    content: "Question",
    explanation: "Explanation",
    options: [
      {
        id: ids.leftA,
        label: "A",
        content: "Alpha",
        isCorrect: false,
        correctOrder: 0,
        matchTargetId: ids.rightA,
        matchTargetContent: "One",
      },
      {
        id: ids.leftB,
        label: "B",
        content: "Beta",
        isCorrect: false,
        correctOrder: 1,
        matchTargetId: ids.rightB,
        matchTargetContent: "Two",
      },
    ],
    matchingTargetOrder: [ids.rightB, ids.rightA],
    media: [],
  };
}

describe("structured question answers", () => {
  it("scores matching only when the complete bijection is exact", () => {
    const source = snapshot("MATCHING");
    expect(
      isAttemptAnswerCorrect(
        {
          kind: "MATCHING",
          pairs: [
            { leftOptionId: ids.leftA, rightOptionId: ids.rightA },
            { leftOptionId: ids.leftB, rightOptionId: ids.rightB },
          ],
        },
        source,
      ),
    ).toBe(true);
    expect(
      isAttemptAnswerCorrect(
        {
          kind: "MATCHING",
          pairs: [{ leftOptionId: ids.leftA, rightOptionId: ids.rightA }],
        },
        source,
      ),
    ).toBe(false);
  });

  it("scores ordering by the canonical order, not presentation order", () => {
    const source = snapshot("ORDERING");
    source.options.reverse();
    expect(
      isAttemptAnswerCorrect(
        { kind: "ORDERING", orderedOptionIds: [ids.leftA, ids.leftB] },
        source,
      ),
    ).toBe(true);
    expect(
      isAttemptAnswerCorrect(
        { kind: "ORDERING", orderedOptionIds: [ids.leftB, ids.leftA] },
        source,
      ),
    ).toBe(false);
  });

  it("rejects duplicate or foreign matching targets", () => {
    const source = snapshot("MATCHING");
    expect(
      validateAnswerForSnapshot(
        {
          kind: "MATCHING",
          pairs: [
            { leftOptionId: ids.leftA, rightOptionId: ids.rightA },
            { leftOptionId: ids.leftB, rightOptionId: ids.rightA },
          ],
        },
        source,
      ),
    ).toBe(false);
  });
});
