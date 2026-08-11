import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/server/db/schema";
import { DrizzleContentTranslationRepository } from "@/server/repositories/drizzle-content-translation-repository";
import { ContentTranslationService } from "@/server/services/content-translation-service";

const ids = {
  user: "30000000-0000-4000-8000-000000000001",
  exam: "30000000-0000-4000-8000-000000000002",
  topic: "30000000-0000-4000-8000-000000000003",
  question: "30000000-0000-4000-8000-000000000004",
  optionA: "30000000-0000-4000-8000-000000000005",
  optionB: "30000000-0000-4000-8000-000000000006",
  test: "30000000-0000-4000-8000-000000000007",
  media: "30000000-0000-4000-8000-000000000008",
} as const;

const client = new PGlite();
const database = drizzle(client, { schema });
const service = new ContentTranslationService(
  new DrizzleContentTranslationRepository(database),
  () => new Date("2026-08-05T10:00:00.000Z"),
);

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
  await database.insert(schema.users).values({
    id: ids.user,
    email: "translator@example.com",
    displayName: "Translator",
    passwordHash: "not-a-real-password-hash",
    role: "ADMIN",
    emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
  });
  await database.insert(schema.exams).values({
    id: ids.exam,
    code: "LOCALE-GATE",
    slug: "locale-gate",
    primaryLocale: "vi",
    enabledLocales: ["vi"],
    status: "PUBLISHED",
  });
  await database.insert(schema.examTranslations).values([
    {
      examId: ids.exam,
      locale: "vi",
      name: "Kỳ thi locale",
      description: "Mô tả tiếng Việt",
    },
    {
      examId: ids.exam,
      locale: "en",
      name: "Locale exam",
      description: "English description",
    },
  ]);
  await database.insert(schema.topics).values({
    id: ids.topic,
    examId: ids.exam,
    slug: "topic",
    displayOrder: 0,
    status: "PUBLISHED",
  });
  await database.insert(schema.topicTranslations).values([
    {
      topicId: ids.topic,
      locale: "vi",
      name: "Chủ đề",
      description: "Mô tả chủ đề",
    },
    {
      topicId: ids.topic,
      locale: "en",
      name: "Topic",
      description: "Topic description",
    },
  ]);
  await database.insert(schema.questions).values({
    id: ids.question,
    examId: ids.exam,
    topicId: ids.topic,
    type: "SINGLE_CHOICE",
    status: "PUBLISHED",
    createdBy: ids.user,
    updatedBy: ids.user,
  });
  await database.insert(schema.questionTranslations).values({
    questionId: ids.question,
    locale: "vi",
    content: "Câu hỏi tiếng Việt?",
    explanation: "Giải thích tiếng Việt.",
  });
  await database.insert(schema.questionOptions).values([
    {
      id: ids.optionA,
      questionId: ids.question,
      label: "A",
      isCorrect: true,
      displayOrder: 0,
    },
    {
      id: ids.optionB,
      questionId: ids.question,
      label: "B",
      isCorrect: false,
      displayOrder: 1,
    },
  ]);
  await database.insert(schema.questionOptionTranslations).values([
    {
      optionId: ids.optionA,
      locale: "vi",
      content: "Lựa chọn A",
    },
    {
      optionId: ids.optionB,
      locale: "vi",
      content: "Lựa chọn B",
    },
    {
      optionId: ids.optionA,
      locale: "en",
      content: "Option A",
    },
  ]);
  await database.insert(schema.quizTests).values({
    id: ids.test,
    examId: ids.exam,
    type: "FIXED",
    status: "PUBLISHED",
    questionCount: 1,
    passingScorePercent: "70",
  });
  await database.insert(schema.testTranslations).values({
    testId: ids.test,
    locale: "vi",
    name: "Đề mẫu",
    description: "Mô tả đề mẫu",
  });
  await database.insert(schema.mediaAssets).values({
    id: ids.media,
    type: "IMAGE",
    status: "READY",
    objectKey: "questions/locale-gate/image.png",
    originalFileName: "image.png",
    mimeType: "image/png",
    sizeBytes: 128,
    checksum: "checksum-locale-gate",
    createdBy: ids.user,
    readyAt: new Date("2026-08-05T09:30:00.000Z"),
  });
  await database.insert(schema.mediaTranslations).values({
    mediaAssetId: ids.media,
    locale: "vi",
    altText: "Ảnh minh họa",
  });
  await database.insert(schema.questionMedia).values({
    questionId: ids.question,
    mediaAssetId: ids.media,
    displayOrder: 0,
  });
});

afterAll(async () => {
  await client.close();
});

describe("content translation completeness gate", () => {
  it("reports every missing published translation category without enabling the locale", async () => {
    const result = await service.enableExamLocale(ids.exam, "en");

    expect(result).toEqual({
      status: "INCOMPLETE",
      report: {
        complete: false,
        missingExamTranslations: 0,
        missingTopicTranslations: 0,
        missingQuestionTranslations: 1,
        missingOptionTranslations: 1,
        missingTestTranslations: 1,
        missingMediaAccessibilityTranslations: 1,
      },
    });
    const exam = await client.query<{ enabled_locales: string }>(
      "select enabled_locales from exams where id = $1",
      [ids.exam],
    );
    expect(exam.rows[0]?.enabled_locales).toBe("{vi}");
  });

  it("enables a complete locale once while retaining structural identities", async () => {
    await database.insert(schema.questionTranslations).values({
      questionId: ids.question,
      locale: "en",
      content: "English question?",
      explanation: "",
    });
    await database.insert(schema.questionOptionTranslations).values({
      optionId: ids.optionB,
      locale: "en",
      content: "Option B",
    });
    await database.insert(schema.testTranslations).values({
      testId: ids.test,
      locale: "en",
      name: "Sample test",
      description: "Sample test description",
    });
    await database.insert(schema.mediaTranslations).values({
      mediaAssetId: ids.media,
      locale: "en",
      altText: "Illustration",
    });

    await expect(
      service.enableExamLocale(ids.exam, "en"),
    ).resolves.toMatchObject({ status: "ENABLED", report: { complete: true } });
    await expect(
      service.enableExamLocale(ids.exam, "en"),
    ).resolves.toMatchObject({
      status: "ALREADY_ENABLED",
      report: { complete: true },
    });

    const translations = await client.query<{
      question_id: string;
      locale: string;
    }>(
      `select question_id, locale
       from question_translations
       where question_id = $1
       order by locale`,
      [ids.question],
    );
    expect(translations.rows).toEqual([
      { question_id: ids.question, locale: "vi" },
      { question_id: ids.question, locale: "en" },
    ]);
  });
});
