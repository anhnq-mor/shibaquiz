import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/server/db/schema";
import { DrizzleDiscoveryRepository } from "@/server/repositories/drizzle-discovery-repository";
import { DiscoveryService } from "@/server/services/discovery-service";

const client = new PGlite();
const database = drizzle(client, { schema });
const service = new DiscoveryService(new DrizzleDiscoveryRepository(database));

const authorId = "50000000-0000-4000-8000-000000000001";
const publishedExamId = "50000000-0000-4000-8000-000000000002";
const draftExamId = "50000000-0000-4000-8000-000000000003";
const viOnlyExamId = "50000000-0000-4000-8000-000000000004";
const topicId = "50000000-0000-4000-8000-000000000005";
const questionId = "50000000-0000-4000-8000-000000000006";
const optionAId = "50000000-0000-4000-8000-000000000007";
const optionBId = "50000000-0000-4000-8000-000000000008";
const testId = "50000000-0000-4000-8000-000000000009";
const viOnlyTopicId = "50000000-0000-4000-8000-000000000010";

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
  await database.insert(schema.users).values({
    id: authorId,
    email: "discovery-author@example.com",
    displayName: "Discovery Author",
    passwordHash: "not-a-real-password-hash",
    role: "ADMIN",
    emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
  });

  await database.insert(schema.exams).values([
    {
      id: publishedExamId,
      code: "DISC-PUB",
      slug: "discovery-published",
      primaryLocale: "vi",
      enabledLocales: ["vi", "en"],
      status: "PUBLISHED",
    },
    {
      id: draftExamId,
      code: "DISC-DRAFT",
      slug: "discovery-draft",
      primaryLocale: "vi",
      enabledLocales: ["vi"],
      status: "DRAFT",
    },
    {
      id: viOnlyExamId,
      code: "DISC-VI",
      slug: "discovery-vi-only",
      primaryLocale: "vi",
      enabledLocales: ["vi"],
      status: "PUBLISHED",
    },
  ]);
  await database.insert(schema.examTranslations).values([
    {
      examId: publishedExamId,
      locale: "vi",
      name: "Kỳ thi khám phá",
      description: "Mô tả kỳ thi khám phá.",
    },
    {
      examId: publishedExamId,
      locale: "en",
      name: "Discovery exam",
      description: "Discovery exam description.",
    },
    {
      examId: draftExamId,
      locale: "vi",
      name: "Kỳ thi nháp",
      description: "Chưa publish.",
    },
    {
      examId: viOnlyExamId,
      locale: "vi",
      name: "Kỳ thi chỉ tiếng Việt",
      description: "Chưa bật tiếng Anh.",
    },
  ]);

  await database.insert(schema.topics).values([
    {
      id: topicId,
      examId: publishedExamId,
      slug: "topic-a",
      displayOrder: 0,
      status: "PUBLISHED",
    },
    {
      id: viOnlyTopicId,
      examId: viOnlyExamId,
      slug: "topic-vi",
      displayOrder: 0,
      status: "PUBLISHED",
    },
  ]);
  await database.insert(schema.topicTranslations).values([
    { topicId, locale: "vi", name: "Chủ đề A", description: "Mô tả chủ đề A." },
    {
      topicId,
      locale: "en",
      name: "Topic A",
      description: "Topic A description.",
    },
    {
      topicId: viOnlyTopicId,
      locale: "vi",
      name: "Chủ đề tiếng Việt",
      description: "Chưa dịch.",
    },
  ]);

  await database.insert(schema.questions).values({
    id: questionId,
    examId: publishedExamId,
    topicId,
    type: "SINGLE_CHOICE",
    status: "PUBLISHED",
    version: 1,
    createdBy: authorId,
    updatedBy: authorId,
  });
  await database.insert(schema.questionTranslations).values([
    {
      questionId,
      locale: "vi",
      content: "Câu hỏi mẫu?",
      explanation: "Giải thích.",
    },
    {
      questionId,
      locale: "en",
      content: "Sample question?",
      explanation: "Explanation.",
    },
  ]);
  await database.insert(schema.questionOptions).values([
    { id: optionAId, questionId, label: "A", isCorrect: true, displayOrder: 0 },
    {
      id: optionBId,
      questionId,
      label: "B",
      isCorrect: false,
      displayOrder: 1,
    },
  ]);
  await database.insert(schema.questionOptionTranslations).values([
    { optionId: optionAId, locale: "vi", content: "Lựa chọn A" },
    { optionId: optionAId, locale: "en", content: "Option A" },
    { optionId: optionBId, locale: "vi", content: "Lựa chọn B" },
    { optionId: optionBId, locale: "en", content: "Option B" },
  ]);

  await database.insert(schema.quizTests).values({
    id: testId,
    examId: publishedExamId,
    type: "FIXED",
    status: "PUBLISHED",
    questionCount: 1,
    durationMinutes: 20,
    passingScorePercent: "70.00",
    shuffleQuestions: false,
    shuffleOptions: false,
  });
  await database.insert(schema.testTranslations).values([
    { testId, locale: "vi", name: "Đề mẫu", description: "Mô tả đề mẫu." },
    {
      testId,
      locale: "en",
      name: "Sample test",
      description: "Sample test description.",
    },
  ]);
  await database.insert(schema.testQuestions).values({
    testId,
    questionId,
    displayOrder: 0,
  });
});

afterAll(async () => {
  await client.close();
});

describe("published exam discovery", () => {
  it("only lists published exams", async () => {
    const { items } = await service.listPublishedExams({ limit: 20 }, "vi");
    const codes = items.map((item) => item.code);
    expect(codes).toContain("DISC-PUB");
    expect(codes).toContain("DISC-VI");
    expect(codes).not.toContain("DISC-DRAFT");
  });

  it("searches by code and by localized name", async () => {
    const byCode = await service.listPublishedExams(
      { limit: 20, query: "disc-pub" },
      "vi",
    );
    expect(byCode.items.map((item) => item.id)).toEqual([publishedExamId]);

    const byName = await service.listPublishedExams(
      { limit: 20, query: "discovery exam" },
      "en",
    );
    expect(byName.items.map((item) => item.id)).toEqual([publishedExamId]);
  });

  it("returns topic and test details with published question counts", async () => {
    const detail = await service.getPublishedExamDetail(
      "discovery-published",
      "en",
    );
    expect(detail).not.toBeNull();
    expect(detail?.locale).toBe("en");
    expect(detail?.localeFallback).toBe(false);
    expect(detail?.topics).toEqual([
      expect.objectContaining({
        id: topicId,
        name: "Topic A",
        publishedQuestionCount: 1,
      }),
    ]);
    expect(detail?.tests).toEqual([
      expect.objectContaining({
        id: testId,
        name: "Sample test",
        questionCount: 1,
      }),
    ]);
  });

  it("falls back to the primary locale when the requested locale isn't enabled", async () => {
    const detail = await service.getPublishedExamDetail(
      "discovery-vi-only",
      "en",
    );
    expect(detail).not.toBeNull();
    expect(detail?.locale).toBe("vi");
    expect(detail?.localeFallback).toBe(true);
    expect(detail?.name).toBe("Kỳ thi chỉ tiếng Việt");
  });

  it("returns null for a draft or unknown exam", async () => {
    expect(
      await service.getPublishedExamDetail("discovery-draft", "vi"),
    ).toBeNull();
    expect(
      await service.getPublishedExamDetail("does-not-exist", "vi"),
    ).toBeNull();
  });
});
