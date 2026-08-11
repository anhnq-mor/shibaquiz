import { describe, expect, it } from "vitest";

import {
  AdminContentError,
  allocateLargestRemainder,
  assertQuestionCorrectness,
  assertUniqueTestStructure,
  type SaveQuestionInput,
  type SaveTestInput,
} from "@/domain/admin/content";

function question(
  overrides: Partial<SaveQuestionInput> = {},
): SaveQuestionInput {
  return {
    id: undefined,
    externalId: null,
    examId: "00000000-0000-4000-8000-000000000001",
    topicId: "00000000-0000-4000-8000-000000000002",
    type: "SINGLE_CHOICE",
    status: "DRAFT",
    translations: [
      { locale: "vi", content: "Câu hỏi?", explanation: "Giải thích." },
    ],
    options: [
      {
        label: "A",
        isCorrect: true,
        displayOrder: 0,
        translations: [{ locale: "vi", content: "A" }],
      },
      {
        label: "B",
        isCorrect: false,
        displayOrder: 1,
        translations: [{ locale: "vi", content: "B" }],
      },
    ],
    mediaIds: [],
    ...overrides,
  };
}

function test(overrides: Partial<SaveTestInput> = {}): SaveTestInput {
  return {
    id: undefined,
    examId: "00000000-0000-4000-8000-000000000001",
    type: "FIXED",
    status: "DRAFT",
    questionCount: 1,
    durationMinutes: null,
    passingScorePercent: 70,
    shuffleQuestions: false,
    shuffleOptions: false,
    translations: [{ locale: "vi", name: "Đề", description: "Mô tả." }],
    fixedQuestions: [
      { questionId: "00000000-0000-4000-8000-000000000003", displayOrder: 0 },
    ],
    dynamicRules: [],
    ...overrides,
  };
}

describe("assertQuestionCorrectness", () => {
  it("accepts a single-choice question with exactly one correct option", () => {
    expect(() => assertQuestionCorrectness(question())).not.toThrow();
  });

  it("rejects a single-choice question with zero correct options", () => {
    expect(() =>
      assertQuestionCorrectness(
        question({
          options: [
            {
              label: "A",
              isCorrect: false,
              displayOrder: 0,
              translations: [{ locale: "vi", content: "A" }],
            },
            {
              label: "B",
              isCorrect: false,
              displayOrder: 1,
              translations: [{ locale: "vi", content: "B" }],
            },
          ],
        }),
      ),
    ).toThrow(AdminContentError);
  });

  it("rejects a single-choice question with two correct options", () => {
    expect(() =>
      assertQuestionCorrectness(
        question({
          options: [
            {
              label: "A",
              isCorrect: true,
              displayOrder: 0,
              translations: [{ locale: "vi", content: "A" }],
            },
            {
              label: "B",
              isCorrect: true,
              displayOrder: 1,
              translations: [{ locale: "vi", content: "B" }],
            },
          ],
        }),
      ),
    ).toThrow(AdminContentError);
  });

  it("accepts a multiple-choice question with two correct and one incorrect option", () => {
    expect(() =>
      assertQuestionCorrectness(
        question({
          type: "MULTIPLE_CHOICE",
          options: [
            {
              label: "A",
              isCorrect: true,
              displayOrder: 0,
              translations: [{ locale: "vi", content: "A" }],
            },
            {
              label: "B",
              isCorrect: true,
              displayOrder: 1,
              translations: [{ locale: "vi", content: "B" }],
            },
            {
              label: "C",
              isCorrect: false,
              displayOrder: 2,
              translations: [{ locale: "vi", content: "C" }],
            },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it("rejects a multiple-choice question with only one correct option", () => {
    expect(() =>
      assertQuestionCorrectness(question({ type: "MULTIPLE_CHOICE" })),
    ).toThrow(AdminContentError);
  });

  it("rejects a multiple-choice question with no incorrect option", () => {
    expect(() =>
      assertQuestionCorrectness(
        question({
          type: "MULTIPLE_CHOICE",
          options: [
            {
              label: "A",
              isCorrect: true,
              displayOrder: 0,
              translations: [{ locale: "vi", content: "A" }],
            },
            {
              label: "B",
              isCorrect: true,
              displayOrder: 1,
              translations: [{ locale: "vi", content: "B" }],
            },
          ],
        }),
      ),
    ).toThrow(AdminContentError);
  });
});

describe("assertUniqueTestStructure", () => {
  it("accepts a fixed test whose question count matches the selected list", () => {
    expect(() => assertUniqueTestStructure(test())).not.toThrow();
  });

  it("rejects a fixed test whose question count does not match the list length", () => {
    expect(() => assertUniqueTestStructure(test({ questionCount: 2 }))).toThrow(
      AdminContentError,
    );
  });

  it("rejects a fixed test with duplicate question ids", () => {
    expect(() =>
      assertUniqueTestStructure(
        test({
          questionCount: 2,
          fixedQuestions: [
            {
              questionId: "00000000-0000-4000-8000-000000000003",
              displayOrder: 0,
            },
            {
              questionId: "00000000-0000-4000-8000-000000000003",
              displayOrder: 1,
            },
          ],
        }),
      ),
    ).toThrow(AdminContentError);
  });

  it("rejects a fixed test that also carries dynamic rules", () => {
    expect(() =>
      assertUniqueTestStructure(
        test({
          dynamicRules: [
            {
              topicId: "00000000-0000-4000-8000-000000000004",
              percentage: 100,
            },
          ],
        }),
      ),
    ).toThrow(AdminContentError);
  });

  it("accepts a dynamic test whose percentages total exactly 100", () => {
    expect(() =>
      assertUniqueTestStructure(
        test({
          type: "DYNAMIC",
          fixedQuestions: [],
          dynamicRules: [
            { topicId: "00000000-0000-4000-8000-000000000004", percentage: 60 },
            { topicId: "00000000-0000-4000-8000-000000000005", percentage: 40 },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it("rejects a dynamic test whose percentages do not total 100", () => {
    expect(() =>
      assertUniqueTestStructure(
        test({
          type: "DYNAMIC",
          fixedQuestions: [],
          dynamicRules: [
            { topicId: "00000000-0000-4000-8000-000000000004", percentage: 60 },
          ],
        }),
      ),
    ).toThrow(AdminContentError);
  });

  it("rejects a dynamic test with duplicate topics", () => {
    expect(() =>
      assertUniqueTestStructure(
        test({
          type: "DYNAMIC",
          fixedQuestions: [],
          dynamicRules: [
            { topicId: "00000000-0000-4000-8000-000000000004", percentage: 50 },
            { topicId: "00000000-0000-4000-8000-000000000004", percentage: 50 },
          ],
        }),
      ),
    ).toThrow(AdminContentError);
  });
});

describe("allocateLargestRemainder", () => {
  it("allocates whole-number counts that sum exactly to the question count", () => {
    const allocation = allocateLargestRemainder(10, [
      { topicId: "a", percentage: 33.33 },
      { topicId: "b", percentage: 33.33 },
      { topicId: "c", percentage: 33.34 },
    ]);
    expect(
      allocation.reduce((total, row) => total + row.questionCount, 0),
    ).toBe(10);
  });

  it("gives the leftover unit to the largest remainder first, ties broken by input order", () => {
    const allocation = allocateLargestRemainder(7, [
      { topicId: "a", percentage: 50 },
      { topicId: "b", percentage: 30 },
      { topicId: "c", percentage: 20 },
    ]);
    expect(allocation).toEqual([
      { topicId: "a", percentage: 50, questionCount: 4 },
      { topicId: "b", percentage: 30, questionCount: 2 },
      { topicId: "c", percentage: 20, questionCount: 1 },
    ]);
  });

  it("returns exact floors when percentages divide evenly", () => {
    const allocation = allocateLargestRemainder(100, [
      { topicId: "a", percentage: 25 },
      { topicId: "b", percentage: 75 },
    ]);
    expect(allocation).toEqual([
      { topicId: "a", percentage: 25, questionCount: 25 },
      { topicId: "b", percentage: 75, questionCount: 75 },
    ]);
  });
});
