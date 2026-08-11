import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isAttemptError } from "@/domain/attempts/attempt";
import * as schema from "@/server/db/schema";
import { DrizzleAttemptRepository } from "@/server/repositories/drizzle-attempt-repository";
import { AttemptService } from "@/server/services/attempt-service";

function uid(n: number): string {
  return `60000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

const authorId = uid(1);
const u1 = uid(2);
const u2 = uid(3);
const u4 = uid(4);
const examId = uid(5);
const topicMath = uid(6);
const topicScience = uid(7);
const topicEmpty = uid(8);
const q1 = uid(10);
const q2 = uid(11);
const q3 = uid(12);
const q4 = uid(13);
const q5 = uid(14);
const fixedTestUntimed = uid(40);
const fixedTestTimed = uid(41);
const dynamicTestOk = uid(42);
const dynamicTestInsufficient = uid(43);

const client = new PGlite();
const database = drizzle(client, { schema });
const service = new AttemptService(new DrizzleAttemptRepository(database));

async function questionFixture(
  id: string,
  topicId: string,
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE",
  options: Array<{ id: string; label: string; isCorrect: boolean }>,
) {
  await database.insert(schema.questions).values({
    id,
    examId,
    topicId,
    type,
    status: "PUBLISHED",
    version: 1,
    createdBy: authorId,
    updatedBy: authorId,
  });
  await database.insert(schema.questionTranslations).values([
    {
      questionId: id,
      locale: "vi",
      content: `Câu hỏi ${id}`,
      explanation: "Giải thích.",
    },
    {
      questionId: id,
      locale: "en",
      content: `Question ${id}`,
      explanation: "Explanation.",
    },
  ]);
  await database.insert(schema.questionOptions).values(
    options.map((option, index) => ({
      id: option.id,
      questionId: id,
      label: option.label,
      isCorrect: option.isCorrect,
      displayOrder: index,
    })),
  );
  await database.insert(schema.questionOptionTranslations).values(
    options.flatMap((option) => [
      {
        optionId: option.id,
        locale: "vi" as const,
        content: `${option.label} (vi)`,
      },
      {
        optionId: option.id,
        locale: "en" as const,
        content: `${option.label} (en)`,
      },
    ]),
  );
}

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });

  await database.insert(schema.users).values([
    {
      id: authorId,
      email: "attempt-author@example.com",
      displayName: "Attempt Author",
      passwordHash: "not-a-real-password-hash",
      role: "ADMIN",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
    {
      id: u1,
      email: "attempt-user-1@example.com",
      displayName: "User One",
      passwordHash: "not-a-real-password-hash",
      role: "USER",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
    {
      id: u2,
      email: "attempt-user-2@example.com",
      displayName: "User Two",
      passwordHash: "not-a-real-password-hash",
      role: "USER",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
    {
      id: u4,
      email: "attempt-user-4@example.com",
      displayName: "History User",
      passwordHash: "not-a-real-password-hash",
      role: "USER",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
  ]);

  await database.insert(schema.exams).values({
    id: examId,
    code: "ATTEMPT-EXAM",
    slug: "attempt-exam",
    primaryLocale: "vi",
    enabledLocales: ["vi", "en"],
    status: "PUBLISHED",
  });
  await database.insert(schema.examTranslations).values([
    { examId, locale: "vi", name: "Kỳ thi làm bài", description: "Mô tả." },
    { examId, locale: "en", name: "Attempt exam", description: "Description." },
  ]);

  await database.insert(schema.topics).values([
    {
      id: topicMath,
      examId,
      slug: "math",
      displayOrder: 0,
      status: "PUBLISHED",
    },
    {
      id: topicScience,
      examId,
      slug: "science",
      displayOrder: 1,
      status: "PUBLISHED",
    },
    {
      id: topicEmpty,
      examId,
      slug: "empty",
      displayOrder: 2,
      status: "PUBLISHED",
    },
  ]);
  await database.insert(schema.topicTranslations).values([
    { topicId: topicMath, locale: "vi", name: "Toán", description: "Mô tả." },
    {
      topicId: topicMath,
      locale: "en",
      name: "Math",
      description: "Description.",
    },
    {
      topicId: topicScience,
      locale: "vi",
      name: "Khoa học",
      description: "Mô tả.",
    },
    {
      topicId: topicScience,
      locale: "en",
      name: "Science",
      description: "Description.",
    },
    { topicId: topicEmpty, locale: "vi", name: "Trống", description: "Mô tả." },
    {
      topicId: topicEmpty,
      locale: "en",
      name: "Empty",
      description: "Description.",
    },
  ]);

  await questionFixture(q1, topicMath, "SINGLE_CHOICE", [
    { id: uid(20), label: "A", isCorrect: true },
    { id: uid(21), label: "B", isCorrect: false },
    { id: uid(22), label: "C", isCorrect: false },
    { id: uid(23), label: "D", isCorrect: false },
  ]);
  await questionFixture(q2, topicMath, "SINGLE_CHOICE", [
    { id: uid(24), label: "A", isCorrect: true },
    { id: uid(25), label: "B", isCorrect: false },
    { id: uid(26), label: "C", isCorrect: false },
    { id: uid(27), label: "D", isCorrect: false },
  ]);
  await questionFixture(q3, topicMath, "MULTIPLE_CHOICE", [
    { id: uid(28), label: "A", isCorrect: true },
    { id: uid(29), label: "B", isCorrect: false },
    { id: uid(30), label: "C", isCorrect: true },
    { id: uid(31), label: "D", isCorrect: false },
  ]);
  await questionFixture(q4, topicScience, "SINGLE_CHOICE", [
    { id: uid(32), label: "A", isCorrect: true },
    { id: uid(33), label: "B", isCorrect: false },
    { id: uid(34), label: "C", isCorrect: false },
    { id: uid(35), label: "D", isCorrect: false },
  ]);
  await questionFixture(q5, topicScience, "SINGLE_CHOICE", [
    { id: uid(36), label: "A", isCorrect: true },
    { id: uid(37), label: "B", isCorrect: false },
    { id: uid(38), label: "C", isCorrect: false },
    { id: uid(39), label: "D", isCorrect: false },
  ]);

  await database.insert(schema.quizTests).values([
    {
      id: fixedTestUntimed,
      examId,
      type: "FIXED",
      status: "PUBLISHED",
      questionCount: 2,
      durationMinutes: null,
      passingScorePercent: "50.00",
      shuffleQuestions: false,
      shuffleOptions: false,
    },
    {
      id: fixedTestTimed,
      examId,
      type: "FIXED",
      status: "PUBLISHED",
      questionCount: 2,
      durationMinutes: 5,
      passingScorePercent: "50.00",
      shuffleQuestions: false,
      shuffleOptions: false,
    },
    {
      id: dynamicTestOk,
      examId,
      type: "DYNAMIC",
      status: "PUBLISHED",
      questionCount: 4,
      durationMinutes: null,
      passingScorePercent: "50.00",
      shuffleQuestions: false,
      shuffleOptions: false,
    },
    {
      id: dynamicTestInsufficient,
      examId,
      type: "DYNAMIC",
      status: "PUBLISHED",
      questionCount: 1,
      durationMinutes: null,
      passingScorePercent: "50.00",
      shuffleQuestions: false,
      shuffleOptions: false,
    },
  ]);
  await database.insert(schema.testTranslations).values(
    [
      fixedTestUntimed,
      fixedTestTimed,
      dynamicTestOk,
      dynamicTestInsufficient,
    ].flatMap((testId) => [
      {
        testId,
        locale: "vi" as const,
        name: `Đề ${testId}`,
        description: "Mô tả.",
      },
      {
        testId,
        locale: "en" as const,
        name: `Test ${testId}`,
        description: "Description.",
      },
    ]),
  );
  await database.insert(schema.testQuestions).values([
    { testId: fixedTestUntimed, questionId: q1, displayOrder: 0 },
    { testId: fixedTestUntimed, questionId: q2, displayOrder: 1 },
    { testId: fixedTestTimed, questionId: q1, displayOrder: 0 },
    { testId: fixedTestTimed, questionId: q2, displayOrder: 1 },
  ]);
  await database.insert(schema.testTopicRules).values([
    { testId: dynamicTestOk, topicId: topicMath, percentage: "50.00" },
    { testId: dynamicTestOk, topicId: topicScience, percentage: "50.00" },
    {
      testId: dynamicTestInsufficient,
      topicId: topicEmpty,
      percentage: "100.00",
    },
  ]);
});

afterAll(async () => {
  await client.close();
});

describe("attempt generation and resume", () => {
  it("resumes an existing in-progress attempt instead of creating a duplicate", async () => {
    const now = new Date("2026-08-06T08:00:00.000Z");
    const first = await service.startOrResumeAttempt(
      { examId, scope: "TOPIC", mode: "STUDY", topicId: topicMath },
      u1,
      "vi",
      now,
    );
    expect(first.resumed).toBe(false);

    const second = await service.startOrResumeAttempt(
      { examId, scope: "TOPIC", mode: "STUDY", topicId: topicMath },
      u1,
      "vi",
      now,
    );
    expect(second.resumed).toBe(true);
    expect(second.attemptId).toBe(first.attemptId);
  });

  it("generates every published question in the topic, in STUDY mode revealed immediately", async () => {
    const now = new Date("2026-08-06T08:05:00.000Z");
    const { attemptId } = await service.startOrResumeAttempt(
      { examId, scope: "TOPIC", mode: "STUDY", topicId: topicScience },
      u2,
      "vi",
      now,
    );
    const view = await service.getAttemptForTaking(attemptId, u2, now);
    expect(view.questions).toHaveLength(2);
    expect(view.examSlug).toBe("attempt-exam");
    expect(
      view.questions.every((q) => q.question.disclosure === "REVEALED"),
    ).toBe(true);
  });

  it("splits a dynamic test across topics using the largest-remainder allocation", async () => {
    const now = new Date("2026-08-06T08:10:00.000Z");
    const { attemptId } = await service.startOrResumeAttempt(
      { examId, scope: "FULL_TEST", mode: "STUDY", testId: dynamicTestOk },
      u1,
      "vi",
      now,
    );
    const view = await service.getAttemptForTaking(attemptId, u1, now);
    expect(view.questions).toHaveLength(4);
    const mathCount = view.questions.filter(
      (q) => q.topicId === topicMath,
    ).length;
    const scienceCount = view.questions.filter(
      (q) => q.topicId === topicScience,
    ).length;
    expect(mathCount).toBe(2);
    expect(scienceCount).toBe(2);
    expect(view.questions.find((q) => q.topicId === topicMath)?.topicName).toBe(
      "Toán",
    );
    expect(
      view.questions.find((q) => q.topicId === topicScience)?.topicName,
    ).toBe("Khoa học");
  });

  it("rejects starting an attempt when the bank cannot satisfy the request", async () => {
    const now = new Date("2026-08-06T08:15:00.000Z");
    await expect(
      service.startOrResumeAttempt(
        { examId, scope: "TOPIC", mode: "STUDY", topicId: topicEmpty },
        u1,
        "vi",
        now,
      ),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_QUESTIONS" });

    await expect(
      service.startOrResumeAttempt(
        {
          examId,
          scope: "FULL_TEST",
          mode: "STUDY",
          testId: dynamicTestInsufficient,
        },
        u1,
        "vi",
        now,
      ),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_QUESTIONS" });
  });
});

describe("practice-immediate disclosure and locking", () => {
  it("hides answers until checked, then locks the question", async () => {
    const now = new Date("2026-08-06T09:00:00.000Z");
    const { attemptId } = await service.startOrResumeAttempt(
      { examId, scope: "QUESTION_BANK", mode: "PRACTICE_IMMEDIATE" },
      u1,
      "vi",
      now,
    );
    const view = await service.getAttemptForTaking(attemptId, u1, now);
    const question = view.questions.find((q) => q.topicId === topicMath)!;
    expect(question.question.disclosure).toBe("HIDDEN");

    const correctOptionId = uid(20); // q1 option A is correct
    const saved = await service.saveAnswer(
      attemptId,
      question.attemptQuestionId,
      u1,
      { selectedOptionIds: [correctOptionId] },
      now,
    );
    expect(saved.question.disclosure).toBe("HIDDEN");
    expect(saved.topicName).toBe("Toán");

    const checked = await service.checkAnswer(
      attemptId,
      question.attemptQuestionId,
      u1,
      now,
    );
    expect(checked.question.disclosure).toBe("REVEALED");
    expect(checked.checkedAt).not.toBeNull();
    expect(checked.topicName).toBe("Toán");

    await expect(
      service.saveAnswer(
        attemptId,
        question.attemptQuestionId,
        u1,
        { selectedOptionIds: [] },
        now,
      ),
    ).rejects.toMatchObject({ code: "LOCKED" });
  });
});

describe("deferred exam submission", () => {
  it("hides answers until submit, then scores idempotently", async () => {
    const now = new Date("2026-08-06T10:00:00.000Z");
    const { attemptId } = await service.startOrResumeAttempt(
      {
        examId,
        scope: "FULL_TEST",
        mode: "EXAM_DEFERRED",
        testId: fixedTestUntimed,
      },
      u2,
      "vi",
      now,
    );
    const view = await service.getAttemptForTaking(attemptId, u2, now);
    expect(
      view.questions.every((q) => q.question.disclosure === "HIDDEN"),
    ).toBe(true);

    const [first, second] = view.questions;
    await service.saveAnswer(
      attemptId,
      first!.attemptQuestionId,
      u2,
      { selectedOptionIds: [uid(20)] }, // q1 correct option
      now,
    );
    await service.saveAnswer(
      attemptId,
      second!.attemptQuestionId,
      u2,
      { selectedOptionIds: [uid(25)] }, // q2 incorrect option (B)
      now,
    );

    const result = await service.submitAttempt(attemptId, u2, now);
    expect(result.status).toBe("SUBMITTED");
    expect(result.correctCount).toBe(1);
    expect(result.incorrectCount).toBe(1);
    expect(result.scorePercent).toBe(50);
    expect(result.passed).toBe(true);

    const resubmitted = await service.submitAttempt(attemptId, u2, now);
    expect(resubmitted).toEqual(result);
  });
});

describe("server-authoritative expiry", () => {
  it("auto-expires and scores an attempt once the deadline passes", async () => {
    const startedAt = new Date("2026-08-06T11:00:00.000Z");
    const { attemptId } = await service.startOrResumeAttempt(
      {
        examId,
        scope: "FULL_TEST",
        mode: "EXAM_DEFERRED",
        testId: fixedTestTimed,
      },
      u1,
      "vi",
      startedAt,
    );
    const view = await service.getAttemptForTaking(attemptId, u1, startedAt);
    const [first] = view.questions;
    await service.saveAnswer(
      attemptId,
      first!.attemptQuestionId,
      u1,
      { selectedOptionIds: [uid(20)] },
      new Date("2026-08-06T11:01:00.000Z"),
    );

    const pastExpiry = new Date("2026-08-06T11:06:00.000Z");
    const expiredView = await service.getAttemptForTaking(
      attemptId,
      u1,
      pastExpiry,
    );
    expect(expiredView.status).toBe("EXPIRED");
    expect(
      expiredView.questions.every((q) => q.question.disclosure === "REVEALED"),
    ).toBe(true);

    const result = await service.getAttemptResult(attemptId, u1, pastExpiry);
    expect(result.status).toBe("EXPIRED");
    expect(result.correctCount).toBe(1);
    expect(result.unansweredCount).toBe(1);

    await expect(
      service.saveAnswer(
        attemptId,
        first!.attemptQuestionId,
        u1,
        { selectedOptionIds: [] },
        pastExpiry,
      ),
    ).rejects.toMatchObject({ code: "LOCKED" });
  });
});

describe("ownership and abandonment", () => {
  it("hides another user's attempt behind NOT_FOUND", async () => {
    const now = new Date("2026-08-06T12:00:00.000Z");
    const { attemptId } = await service.startOrResumeAttempt(
      { examId, scope: "TOPIC", mode: "STUDY", topicId: topicScience },
      u4,
      "vi",
      now,
    );

    await expect(
      service.getAttemptForTaking(attemptId, u1, now),
    ).rejects.toSatisfy(
      (error: unknown) => isAttemptError(error) && error.code === "NOT_FOUND",
    );
  });

  it("marks an abandoned attempt as terminal with no result", async () => {
    const now = new Date("2026-08-06T12:30:00.000Z");
    const { attemptId } = await service.startOrResumeAttempt(
      {
        examId,
        scope: "TOPIC",
        mode: "PRACTICE_IMMEDIATE",
        topicId: topicMath,
      },
      u1,
      "vi",
      now,
    );
    await service.abandonAttempt(attemptId, u1, now);

    await expect(
      service.getAttemptResult(attemptId, u1, now),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      service.abandonAttempt(attemptId, u1, now),
    ).rejects.toMatchObject({ code: "LOCKED" });
  });
});

describe("matching and ordering vertical slice", () => {
  it("issues hidden structured DTOs, persists both answer kinds, and scores exactly", async () => {
    const userId = uid(100);
    const structuredExamId = uid(101);
    const structuredTopicId = uid(102);
    const matchingQuestionId = uid(103);
    const orderingQuestionId = uid(104);
    const structuredTestId = uid(105);
    const matchingOptionIds = [uid(110), uid(111)];
    const orderingOptionIds = [uid(112), uid(113), uid(114)];

    await database.insert(schema.users).values({
      id: userId,
      email: "structured-attempt@example.com",
      displayName: "Structured User",
      passwordHash: "not-a-real-password-hash",
      emailVerifiedAt: new Date("2026-08-11T00:00:00.000Z"),
    });
    await database.insert(schema.exams).values({
      id: structuredExamId,
      code: "STRUCTURED",
      slug: "structured",
      primaryLocale: "vi",
      enabledLocales: ["vi", "en"],
      status: "PUBLISHED",
    });
    await database.insert(schema.examTranslations).values([
      {
        examId: structuredExamId,
        locale: "vi",
        name: "Cấu trúc",
        description: "Mô tả",
      },
      {
        examId: structuredExamId,
        locale: "en",
        name: "Structured",
        description: "Description",
      },
    ]);
    await database.insert(schema.topics).values({
      id: structuredTopicId,
      examId: structuredExamId,
      slug: "structured-topic",
      displayOrder: 0,
      status: "PUBLISHED",
    });
    await database.insert(schema.topicTranslations).values([
      {
        topicId: structuredTopicId,
        locale: "vi",
        name: "Cấu trúc",
        description: "Mô tả",
      },
      {
        topicId: structuredTopicId,
        locale: "en",
        name: "Structured",
        description: "Description",
      },
    ]);
    await database.insert(schema.questions).values([
      {
        id: matchingQuestionId,
        examId: structuredExamId,
        topicId: structuredTopicId,
        type: "MATCHING",
        status: "PUBLISHED",
        version: 1,
        createdBy: authorId,
        updatedBy: authorId,
      },
      {
        id: orderingQuestionId,
        examId: structuredExamId,
        topicId: structuredTopicId,
        type: "ORDERING",
        status: "PUBLISHED",
        version: 1,
        createdBy: authorId,
        updatedBy: authorId,
      },
    ]);
    await database.insert(schema.questionTranslations).values(
      [matchingQuestionId, orderingQuestionId].flatMap((questionId) => [
        {
          questionId,
          locale: "vi" as const,
          content: "Câu hỏi",
          explanation: "Giải thích",
        },
        {
          questionId,
          locale: "en" as const,
          content: "Question",
          explanation: "Explanation",
        },
      ]),
    );
    await database.insert(schema.questionOptions).values([
      ...matchingOptionIds.map((id, index) => ({
        id,
        questionId: matchingQuestionId,
        label: String.fromCharCode(65 + index),
        isCorrect: false,
        displayOrder: index,
      })),
      ...orderingOptionIds.map((id, index) => ({
        id,
        questionId: orderingQuestionId,
        label: String.fromCharCode(65 + index),
        isCorrect: false,
        displayOrder: index,
      })),
    ]);
    const storedMatchingOptions = await database
      .select({
        id: schema.questionOptions.id,
        targetId: schema.questionOptions.matchTargetId,
      })
      .from(schema.questionOptions)
      .where(eq(schema.questionOptions.questionId, matchingQuestionId));
    await database.insert(schema.questionOptionTranslations).values([
      ...storedMatchingOptions.flatMap((option, index) => [
        {
          optionId: option.id,
          locale: "vi" as const,
          content: `Trái ${index + 1}`,
          matchTargetContent: `Phải ${index + 1}`,
        },
        {
          optionId: option.id,
          locale: "en" as const,
          content: `Left ${index + 1}`,
          matchTargetContent: `Right ${index + 1}`,
        },
      ]),
      ...orderingOptionIds.flatMap((optionId, index) => [
        { optionId, locale: "vi" as const, content: `Bước ${index + 1}` },
        { optionId, locale: "en" as const, content: `Step ${index + 1}` },
      ]),
    ]);
    await database.insert(schema.quizTests).values({
      id: structuredTestId,
      examId: structuredExamId,
      type: "FIXED",
      status: "PUBLISHED",
      questionCount: 2,
      durationMinutes: null,
      passingScorePercent: "100.00",
      shuffleQuestions: false,
      shuffleOptions: false,
    });
    await database.insert(schema.testTranslations).values([
      {
        testId: structuredTestId,
        locale: "vi",
        name: "Đề",
        description: "Mô tả",
      },
      {
        testId: structuredTestId,
        locale: "en",
        name: "Test",
        description: "Description",
      },
    ]);
    await database.insert(schema.testQuestions).values([
      {
        testId: structuredTestId,
        questionId: matchingQuestionId,
        displayOrder: 0,
      },
      {
        testId: structuredTestId,
        questionId: orderingQuestionId,
        displayOrder: 1,
      },
    ]);

    const now = new Date("2026-08-11T08:00:00.000Z");
    const { attemptId } = await service.startOrResumeAttempt(
      {
        examId: structuredExamId,
        scope: "FULL_TEST",
        mode: "EXAM_DEFERRED",
        testId: structuredTestId,
      },
      userId,
      "vi",
      now,
    );
    const view = await service.getAttemptForTaking(attemptId, userId, now);
    expect(JSON.stringify(view)).not.toContain("correctMatchTargetId");
    expect(JSON.stringify(view)).not.toContain("correctOrder");
    expect(view.questions[0]?.question.matchingTargets).toHaveLength(2);

    await service.saveAnswer(
      attemptId,
      view.questions[0]!.attemptQuestionId,
      userId,
      {
        answer: {
          kind: "MATCHING",
          pairs: storedMatchingOptions.map((option) => ({
            leftOptionId: option.id,
            rightOptionId: option.targetId,
          })),
        },
      },
      now,
    );
    await service.saveAnswer(
      attemptId,
      view.questions[1]!.attemptQuestionId,
      userId,
      {
        answer: {
          kind: "ORDERING",
          orderedOptionIds: orderingOptionIds,
        },
      },
      now,
    );

    const result = await service.submitAttempt(attemptId, userId, now);
    expect(result.correctCount).toBe(2);
    expect(result.scorePercent).toBe(100);
    expect(JSON.stringify(result)).toContain("correctMatchTargetId");
    expect(JSON.stringify(result)).toContain("correctOrder");
  });
});

describe("history", () => {
  it("lists attempts newest first with filters and cursor pagination", async () => {
    const first = await service.startOrResumeAttempt(
      { examId, scope: "TOPIC", mode: "STUDY", topicId: topicMath },
      u4,
      "vi",
      new Date("2026-08-06T13:00:00.000Z"),
    );
    await service.submitAttempt(
      first.attemptId,
      u4,
      new Date("2026-08-06T13:05:00.000Z"),
    );

    const second = await service.startOrResumeAttempt(
      {
        examId,
        scope: "TOPIC",
        mode: "PRACTICE_IMMEDIATE",
        topicId: topicScience,
      },
      u4,
      "vi",
      new Date("2026-08-06T14:00:00.000Z"),
    );

    const all = await service.listHistory(u4, { limit: 20 });
    expect(all.items[0]!.attemptId).toBe(second.attemptId);
    expect(all.items[1]!.attemptId).toBe(first.attemptId);

    const submittedOnly = await service.listHistory(u4, {
      limit: 20,
      status: "SUBMITTED",
    });
    expect(submittedOnly.items.map((item) => item.attemptId)).toEqual([
      first.attemptId,
    ]);

    const page = await service.listHistory(u4, { limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe(second.attemptId);

    const nextPage = await service.listHistory(u4, {
      limit: 1,
      cursor: page.nextCursor!,
    });
    expect(nextPage.items.map((item) => item.attemptId)).toEqual([
      first.attemptId,
    ]);
  });
});
