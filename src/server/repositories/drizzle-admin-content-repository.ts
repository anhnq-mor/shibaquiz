import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  AdminContentError,
  allocateLargestRemainder,
  isAdminContentError,
  type AdminContentRepository,
  type AdminContentWorkspace,
  type BulkActionResult,
  type ContentStatus,
  type SaveExamInput,
  type SaveQuestionInput,
  type SaveTestInput,
  type SaveTopicInput,
  type TestAllocationPreview,
} from "@/domain/admin/content";
import type { Locale } from "@/domain/common/locale";
import type { Database } from "@/server/db/client";
import {
  auditLogs,
  exams,
  examTranslations,
  mediaAssets,
  questionMedia,
  questionOptions,
  questionOptionTranslations,
  questions,
  questionTranslations,
  quizTests,
  testQuestions,
  testTopicRules,
  testTranslations,
  topics,
  topicTranslations,
} from "@/server/db/schema";

type SelectExecutor = Pick<Database, "select">;

function requiredLocalesPresent(
  translations: Array<{ locale: Locale }>,
  requiredLocales: Locale[],
): boolean {
  const present = new Set(
    translations.map((translation) => translation.locale),
  );
  return requiredLocales.every((locale) => present.has(locale));
}

function assertTranslations(
  translations: Array<{ locale: Locale }>,
  requiredLocales: Locale[],
  field: string,
): void {
  if (!requiredLocalesPresent(translations, requiredLocales)) {
    throw new AdminContentError(
      "INCOMPLETE_TRANSLATION",
      400,
      "Required translations are incomplete",
      { [field]: ["ENABLED_LOCALE_TRANSLATION_REQUIRED"] },
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

function safeConflict(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new AdminContentError(
      "CONFLICT",
      409,
      "A content record with this identifier already exists",
    );
  }
  throw error;
}

function isForeignKeyViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  const code = candidate.code ?? candidate.cause?.code;
  // 23503 = foreign_key_violation, 23001 = restrict_violation (PGlite reports
  // ON DELETE RESTRICT breaches under this code instead of 23503).
  return code === "23503" || code === "23001";
}

type MutableExecutor = Pick<Database, "select" | "insert" | "update" | "delete">;

async function buildTestPreview(
  executor: SelectExecutor,
  input: SaveTestInput,
): Promise<TestAllocationPreview[]> {
  const examRows = await executor
    .select({ id: exams.id })
    .from(exams)
    .where(eq(exams.id, input.examId))
    .limit(1);
  if (!examRows[0]) {
    throw new AdminContentError("NOT_FOUND", 404, "Exam not found");
  }

  if (input.type === "FIXED") {
    const questionIds = input.fixedQuestions.map((item) => item.questionId);
    const sourceRows = await executor
      .select({ id: questions.id, topicId: questions.topicId })
      .from(questions)
      .where(
        and(
          inArray(questions.id, questionIds),
          eq(questions.examId, input.examId),
          eq(questions.status, "PUBLISHED"),
          isNull(questions.deletedAt),
        ),
      );
    if (sourceRows.length !== questionIds.length) {
      throw new AdminContentError(
        "INVALID_STRUCTURE",
        400,
        "Fixed tests may only use published questions from the same exam",
        { fixedQuestions: ["QUESTION_SOURCE_INVALID"] },
      );
    }
    const counts = new Map<string, number>();
    for (const source of sourceRows) {
      counts.set(source.topicId, (counts.get(source.topicId) ?? 0) + 1);
    }
    return [...counts.entries()].map(([topicId, questionCount]) => ({
      topicId,
      percentage: (questionCount / input.questionCount) * 100,
      questionCount,
      availableQuestions: questionCount,
    }));
  }

  const topicIds = input.dynamicRules.map((rule) => rule.topicId);
  const topicRows = await executor
    .select({ id: topics.id })
    .from(topics)
    .where(and(inArray(topics.id, topicIds), eq(topics.examId, input.examId)));
  if (topicRows.length !== topicIds.length) {
    throw new AdminContentError(
      "INVALID_STRUCTURE",
      400,
      "Dynamic test topics must belong to the same exam",
      { dynamicRules: ["TOPIC_SOURCE_INVALID"] },
    );
  }

  const bankRows = await executor
    .select({ topicId: questions.topicId, value: count() })
    .from(questions)
    .where(
      and(
        inArray(questions.topicId, topicIds),
        eq(questions.examId, input.examId),
        eq(questions.status, "PUBLISHED"),
        isNull(questions.deletedAt),
      ),
    )
    .groupBy(questions.topicId);
  const available = new Map(
    bankRows.map((row) => [row.topicId, Number(row.value)]),
  );
  const allocation = allocateLargestRemainder(
    input.questionCount,
    input.dynamicRules,
  ).map((row) => ({
    ...row,
    availableQuestions: available.get(row.topicId) ?? 0,
  }));
  if (allocation.some((row) => row.availableQuestions < row.questionCount)) {
    throw new AdminContentError(
      "PUBLISH_NOT_READY",
      409,
      "The published question bank is insufficient",
      { dynamicRules: ["QUESTION_BANK_INSUFFICIENT"] },
    );
  }
  return allocation;
}

export class DrizzleAdminContentRepository implements AdminContentRepository {
  constructor(private readonly database: Database) {}

  async getWorkspace(): Promise<AdminContentWorkspace> {
    const [
      examRows,
      examTranslationRows,
      topicRows,
      topicTranslationRows,
      questionRows,
      questionTranslationRows,
      optionRows,
      optionTranslationRows,
      testRows,
      testTranslationRows,
      fixedRows,
      ruleRows,
      questionMediaRows,
    ] = await Promise.all([
      this.database.select().from(exams).orderBy(asc(exams.code)),
      this.database.select().from(examTranslations),
      this.database
        .select()
        .from(topics)
        .orderBy(asc(topics.examId), asc(topics.displayOrder)),
      this.database.select().from(topicTranslations),
      this.database.select().from(questions).orderBy(asc(questions.createdAt)),
      this.database.select().from(questionTranslations),
      this.database
        .select()
        .from(questionOptions)
        .orderBy(
          asc(questionOptions.questionId),
          asc(questionOptions.displayOrder),
        ),
      this.database.select().from(questionOptionTranslations),
      this.database.select().from(quizTests).orderBy(asc(quizTests.createdAt)),
      this.database.select().from(testTranslations),
      this.database
        .select()
        .from(testQuestions)
        .orderBy(asc(testQuestions.testId), asc(testQuestions.displayOrder)),
      this.database.select().from(testTopicRules),
      this.database
        .select({
          questionId: questionMedia.questionId,
          mediaAssetId: questionMedia.mediaAssetId,
          displayOrder: questionMedia.displayOrder,
          originalFileName: mediaAssets.originalFileName,
          status: mediaAssets.status,
        })
        .from(questionMedia)
        .innerJoin(mediaAssets, eq(mediaAssets.id, questionMedia.mediaAssetId))
        .orderBy(
          asc(questionMedia.questionId),
          asc(questionMedia.displayOrder),
        ),
    ]);

    return {
      exams: examRows.map((exam) => ({
        id: exam.id,
        code: exam.code,
        slug: exam.slug,
        primaryLocale: exam.primaryLocale,
        enabledLocales: exam.enabledLocales,
        status: exam.status,
        translations: examTranslationRows
          .filter((translation) => translation.examId === exam.id)
          .map(({ locale, name, description }) => ({
            locale,
            name,
            description,
          })),
      })),
      topics: topicRows.map((topic) => ({
        id: topic.id,
        examId: topic.examId,
        slug: topic.slug,
        displayOrder: topic.displayOrder,
        status: topic.status,
        translations: topicTranslationRows
          .filter((translation) => translation.topicId === topic.id)
          .map(({ locale, name, description }) => ({
            locale,
            name,
            description,
          })),
      })),
      questions: questionRows.map((question) => ({
        id: question.id,
        externalId: question.externalId,
        examId: question.examId,
        topicId: question.topicId,
        type: question.type,
        status: question.status,
        version: question.version,
        deletedAt: question.deletedAt?.toISOString() ?? null,
        translations: questionTranslationRows
          .filter((translation) => translation.questionId === question.id)
          .map(({ locale, content, explanation }) => ({
            locale,
            content,
            explanation,
          })),
        options: optionRows
          .filter((option) => option.questionId === question.id)
          .map((option) => ({
            id: option.id,
            label: option.label,
            isCorrect: option.isCorrect,
            displayOrder: option.displayOrder,
            translations: optionTranslationRows
              .filter((translation) => translation.optionId === option.id)
              .map(({ locale, content, matchTargetContent }) => ({
                locale,
                content,
                matchContent: matchTargetContent,
              })),
          })),
        media: questionMediaRows
          .filter((row) => row.questionId === question.id)
          .map((row) => ({
            mediaAssetId: row.mediaAssetId,
            displayOrder: row.displayOrder,
            originalFileName: row.originalFileName,
            status: row.status,
          })),
      })),
      tests: testRows.map((test) => ({
        id: test.id,
        examId: test.examId,
        type: test.type,
        status: test.status,
        questionCount: test.questionCount,
        durationMinutes: test.durationMinutes,
        passingScorePercent: Number(test.passingScorePercent),
        shuffleQuestions: test.shuffleQuestions,
        shuffleOptions: test.shuffleOptions,
        translations: testTranslationRows
          .filter((translation) => translation.testId === test.id)
          .map(({ locale, name, description }) => ({
            locale,
            name,
            description,
          })),
        fixedQuestions: fixedRows
          .filter((item) => item.testId === test.id)
          .map(({ questionId, displayOrder }) => ({
            questionId,
            displayOrder,
          })),
        dynamicRules: ruleRows
          .filter((rule) => rule.testId === test.id)
          .map(({ topicId, percentage }) => ({
            topicId,
            percentage: Number(percentage),
          })),
      })),
    };
  }

  async saveExam(
    input: SaveExamInput,
    actorUserId: string,
    now: Date,
  ): Promise<string> {
    try {
      return await this.database.transaction(async (transaction) => {
        const existing = input.id
          ? (
              await transaction
                .select()
                .from(exams)
                .where(eq(exams.id, input.id))
                .limit(1)
                .for("update")
            )[0]
          : undefined;
        if (input.id && !existing) {
          throw new AdminContentError("NOT_FOUND", 404, "Exam not found");
        }

        const enabledLocales = existing?.enabledLocales ?? [
          input.primaryLocale,
        ];
        if (existing && !enabledLocales.includes(input.primaryLocale)) {
          throw new AdminContentError(
            "INCOMPLETE_TRANSLATION",
            409,
            "Enable the new primary locale before selecting it",
            { primaryLocale: ["PRIMARY_LOCALE_NOT_ENABLED"] },
          );
        }
        assertTranslations(
          input.translations,
          [input.primaryLocale],
          "translations",
        );

        if (input.status === "PUBLISHED") {
          assertTranslations(
            input.translations,
            enabledLocales,
            "translations",
          );
          if (!existing) {
            throw new AdminContentError(
              "PUBLISH_NOT_READY",
              409,
              "Create the exam before publishing its content",
            );
          }
          const [publishedTopics, publishedQuestions] = await Promise.all([
            transaction
              .select({ value: count() })
              .from(topics)
              .where(
                and(
                  eq(topics.examId, existing.id),
                  eq(topics.status, "PUBLISHED"),
                ),
              ),
            transaction
              .select({ value: count() })
              .from(questions)
              .where(
                and(
                  eq(questions.examId, existing.id),
                  eq(questions.status, "PUBLISHED"),
                  isNull(questions.deletedAt),
                ),
              ),
          ]);
          if (
            Number(publishedTopics[0]?.value ?? 0) < 1 ||
            Number(publishedQuestions[0]?.value ?? 0) < 1
          ) {
            throw new AdminContentError(
              "PUBLISH_NOT_READY",
              409,
              "An exam needs a published topic and question",
              { status: ["EXAM_CONTENT_REQUIRED"] },
            );
          }
        }

        const id = existing
          ? existing.id
          : (
              await transaction
                .insert(exams)
                .values({
                  code: input.code,
                  slug: input.slug,
                  primaryLocale: input.primaryLocale,
                  enabledLocales,
                  status: input.status,
                  createdAt: now,
                  updatedAt: now,
                })
                .returning()
            )[0]!.id;

        if (existing) {
          await transaction
            .update(exams)
            .set({
              code: input.code,
              slug: input.slug,
              primaryLocale: input.primaryLocale,
              status: input.status,
              updatedAt: now,
            })
            .where(eq(exams.id, id));
        }
        for (const translation of input.translations) {
          await transaction
            .insert(examTranslations)
            .values({
              examId: id,
              ...translation,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [examTranslations.examId, examTranslations.locale],
              set: {
                name: translation.name,
                description: translation.description,
                updatedAt: now,
              },
            });
        }
        await transaction.insert(auditLogs).values({
          actorUserId,
          action: existing ? "CONTENT_EXAM_UPDATED" : "CONTENT_EXAM_CREATED",
          entityType: "EXAM",
          entityId: id,
          metadata: {
            status: input.status,
            locales: input.translations.map((item) => item.locale),
          },
          createdAt: now,
        });
        return id;
      });
    } catch (error) {
      return safeConflict(error);
    }
  }

  async saveTopic(
    input: SaveTopicInput,
    actorUserId: string,
    now: Date,
  ): Promise<string> {
    try {
      return await this.database.transaction(async (transaction) => {
        const exam = (
          await transaction
            .select({
              id: exams.id,
              primaryLocale: exams.primaryLocale,
              enabledLocales: exams.enabledLocales,
            })
            .from(exams)
            .where(eq(exams.id, input.examId))
            .limit(1)
            .for("update")
        )[0];
        if (!exam)
          throw new AdminContentError("NOT_FOUND", 404, "Exam not found");
        if (input.status === "PUBLISHED") {
          assertTranslations(
            input.translations,
            exam.enabledLocales,
            "translations",
          );
        } else {
          assertTranslations(
            input.translations,
            [exam.primaryLocale],
            "translations",
          );
        }

        const existing = input.id
          ? (
              await transaction
                .select()
                .from(topics)
                .where(eq(topics.id, input.id))
                .limit(1)
                .for("update")
            )[0]
          : undefined;
        if (input.id && !existing)
          throw new AdminContentError("NOT_FOUND", 404, "Topic not found");
        if (existing && existing.examId !== input.examId) {
          throw new AdminContentError(
            "CONFLICT",
            409,
            "A topic cannot move between exams",
          );
        }

        const id = existing
          ? existing.id
          : (
              await transaction
                .insert(topics)
                .values({
                  examId: input.examId,
                  slug: input.slug,
                  displayOrder: input.displayOrder,
                  status: input.status,
                  createdAt: now,
                  updatedAt: now,
                })
                .returning()
            )[0]!.id;
        if (existing) {
          await transaction
            .update(topics)
            .set({
              slug: input.slug,
              displayOrder: input.displayOrder,
              status: input.status,
              updatedAt: now,
            })
            .where(eq(topics.id, id));
        }
        for (const translation of input.translations) {
          await transaction
            .insert(topicTranslations)
            .values({
              topicId: id,
              ...translation,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [topicTranslations.topicId, topicTranslations.locale],
              set: {
                name: translation.name,
                description: translation.description,
                updatedAt: now,
              },
            });
        }
        await transaction.insert(auditLogs).values({
          actorUserId,
          action: existing ? "CONTENT_TOPIC_UPDATED" : "CONTENT_TOPIC_CREATED",
          entityType: "TOPIC",
          entityId: id,
          metadata: { examId: input.examId, status: input.status },
          createdAt: now,
        });
        return id;
      });
    } catch (error) {
      return safeConflict(error);
    }
  }

  async saveQuestion(
    input: SaveQuestionInput,
    actorUserId: string,
    now: Date,
  ): Promise<string> {
    try {
      return await this.database.transaction(async (transaction) => {
        const exam = (
          await transaction
            .select({
              id: exams.id,
              primaryLocale: exams.primaryLocale,
              enabledLocales: exams.enabledLocales,
            })
            .from(exams)
            .where(eq(exams.id, input.examId))
            .limit(1)
            .for("update")
        )[0];
        if (!exam)
          throw new AdminContentError("NOT_FOUND", 404, "Exam not found");
        const topic = (
          await transaction
            .select({ id: topics.id, examId: topics.examId })
            .from(topics)
            .where(eq(topics.id, input.topicId))
            .limit(1)
        )[0];
        if (!topic || topic.examId !== input.examId) {
          throw new AdminContentError(
            "INVALID_STRUCTURE",
            400,
            "Question topic must belong to the selected exam",
            { topicId: ["TOPIC_EXAM_MISMATCH"] },
          );
        }

        const requiredLocales =
          input.status === "PUBLISHED"
            ? exam.enabledLocales
            : [exam.primaryLocale];
        assertTranslations(input.translations, requiredLocales, "translations");
        for (const option of input.options) {
          assertTranslations(option.translations, requiredLocales, "options");
        }

        const existing = input.id
          ? (
              await transaction
                .select()
                .from(questions)
                .where(eq(questions.id, input.id))
                .limit(1)
                .for("update")
            )[0]
          : undefined;
        if (input.id && !existing) {
          throw new AdminContentError("NOT_FOUND", 404, "Question not found");
        }
        if (existing && existing.examId !== input.examId) {
          throw new AdminContentError(
            "CONFLICT",
            409,
            "A question cannot move between exams",
          );
        }
        if (existing?.deletedAt) {
          throw new AdminContentError(
            "CONFLICT",
            409,
            "A deleted question cannot be edited",
          );
        }

        const id = existing
          ? existing.id
          : (
              await transaction
                .insert(questions)
                .values({
                  externalId: input.externalId || null,
                  examId: input.examId,
                  topicId: input.topicId,
                  type: input.type,
                  status: input.status,
                  version: 1,
                  createdBy: actorUserId,
                  updatedBy: actorUserId,
                  createdAt: now,
                  updatedAt: now,
                })
                .returning()
            )[0]!.id;

        if (existing) {
          await transaction
            .update(questions)
            .set({
              externalId: input.externalId || null,
              topicId: input.topicId,
              type: input.type,
              status: input.status,
              version: sql`${questions.version} + 1`,
              updatedBy: actorUserId,
              updatedAt: now,
            })
            .where(eq(questions.id, id));
          await transaction
            .delete(questionTranslations)
            .where(eq(questionTranslations.questionId, id));
          await transaction
            .delete(questionOptions)
            .where(eq(questionOptions.questionId, id));
          await transaction
            .delete(questionMedia)
            .where(eq(questionMedia.questionId, id));
        }

        await transaction.insert(questionTranslations).values(
          input.translations.map((translation) => ({
            questionId: id,
            ...translation,
            createdAt: now,
            updatedAt: now,
          })),
        );
        for (const option of input.options) {
          const optionId = (
            await transaction
              .insert(questionOptions)
              .values({
                questionId: id,
                label: option.label,
                isCorrect: option.isCorrect,
                displayOrder: option.displayOrder,
                createdAt: now,
                updatedAt: now,
              })
              .returning()
          )[0]!.id;
          await transaction.insert(questionOptionTranslations).values(
            option.translations.map((translation) => ({
              optionId,
              locale: translation.locale,
              content: translation.content,
              matchTargetContent: translation.matchContent ?? null,
              createdAt: now,
              updatedAt: now,
            })),
          );
        }
        if (input.mediaIds.length > 0) {
          const readyAssets = await transaction
            .select({ id: mediaAssets.id })
            .from(mediaAssets)
            .where(
              and(
                inArray(mediaAssets.id, input.mediaIds),
                eq(mediaAssets.status, "READY"),
                isNull(mediaAssets.deletedAt),
              ),
            );
          if (readyAssets.length !== input.mediaIds.length) {
            throw new AdminContentError(
              "INVALID_STRUCTURE",
              400,
              "Media references must be READY assets",
              { mediaIds: ["MEDIA_NOT_READY"] },
            );
          }
          await transaction.insert(questionMedia).values(
            input.mediaIds.map((mediaAssetId, displayOrder) => ({
              questionId: id,
              mediaAssetId,
              displayOrder,
              createdAt: now,
              updatedAt: now,
            })),
          );
        }

        await transaction.insert(auditLogs).values({
          actorUserId,
          action: existing
            ? "CONTENT_QUESTION_UPDATED"
            : "CONTENT_QUESTION_CREATED",
          entityType: "QUESTION",
          entityId: id,
          metadata: {
            examId: input.examId,
            topicId: input.topicId,
            type: input.type,
            status: input.status,
            optionCount: input.options.length,
            localeCount: input.translations.length,
            mediaCount: input.mediaIds.length,
          },
          createdAt: now,
        });
        return id;
      });
    } catch (error) {
      return safeConflict(error);
    }
  }

  async deleteQuestion(
    id: string,
    actorUserId: string,
    now: Date,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const question = (
        await transaction
          .select({ id: questions.id, deletedAt: questions.deletedAt })
          .from(questions)
          .where(eq(questions.id, id))
          .limit(1)
          .for("update")
      )[0];
      if (!question) {
        throw new AdminContentError("NOT_FOUND", 404, "Question not found");
      }
      if (question.deletedAt) return;

      const publishedReferences = await transaction
        .select({ value: count() })
        .from(testQuestions)
        .innerJoin(quizTests, eq(quizTests.id, testQuestions.testId))
        .where(
          and(
            eq(testQuestions.questionId, id),
            eq(quizTests.status, "PUBLISHED"),
          ),
        );
      if (Number(publishedReferences[0]?.value ?? 0) > 0) {
        throw new AdminContentError(
          "CONFLICT",
          409,
          "Archive published fixed tests before deleting this question",
        );
      }
      await transaction
        .update(questions)
        .set({
          status: "ARCHIVED",
          deletedAt: now,
          updatedBy: actorUserId,
          updatedAt: now,
        })
        .where(eq(questions.id, id));
      await transaction.insert(auditLogs).values({
        actorUserId,
        action: "CONTENT_QUESTION_SOFT_DELETED",
        entityType: "QUESTION",
        entityId: id,
        metadata: { status: "ARCHIVED" },
        createdAt: now,
      });
    });
  }

  async previewTest(input: SaveTestInput): Promise<TestAllocationPreview[]> {
    return buildTestPreview(this.database, input);
  }

  async saveTest(
    input: SaveTestInput,
    actorUserId: string,
    now: Date,
  ): Promise<{ id: string; preview: TestAllocationPreview[] }> {
    try {
      return await this.database.transaction(async (transaction) => {
        const exam = (
          await transaction
            .select({
              id: exams.id,
              primaryLocale: exams.primaryLocale,
              enabledLocales: exams.enabledLocales,
            })
            .from(exams)
            .where(eq(exams.id, input.examId))
            .limit(1)
            .for("update")
        )[0];
        if (!exam)
          throw new AdminContentError("NOT_FOUND", 404, "Exam not found");

        const requiredLocales =
          input.status === "PUBLISHED"
            ? exam.enabledLocales
            : [exam.primaryLocale];
        assertTranslations(input.translations, requiredLocales, "translations");

        const existing = input.id
          ? (
              await transaction
                .select()
                .from(quizTests)
                .where(eq(quizTests.id, input.id))
                .limit(1)
                .for("update")
            )[0]
          : undefined;
        if (input.id && !existing) {
          throw new AdminContentError("NOT_FOUND", 404, "Test not found");
        }
        if (existing && existing.examId !== input.examId) {
          throw new AdminContentError(
            "CONFLICT",
            409,
            "A test cannot move between exams",
          );
        }

        const preview = await buildTestPreview(transaction, input);

        const id = existing
          ? existing.id
          : (
              await transaction
                .insert(quizTests)
                .values({
                  examId: input.examId,
                  type: input.type,
                  status: input.status,
                  questionCount: input.questionCount,
                  durationMinutes: input.durationMinutes,
                  passingScorePercent: String(input.passingScorePercent),
                  shuffleQuestions: input.shuffleQuestions,
                  shuffleOptions: input.shuffleOptions,
                  createdAt: now,
                  updatedAt: now,
                })
                .returning()
            )[0]!.id;

        if (existing) {
          await transaction
            .update(quizTests)
            .set({
              type: input.type,
              status: input.status,
              questionCount: input.questionCount,
              durationMinutes: input.durationMinutes,
              passingScorePercent: String(input.passingScorePercent),
              shuffleQuestions: input.shuffleQuestions,
              shuffleOptions: input.shuffleOptions,
              updatedAt: now,
            })
            .where(eq(quizTests.id, id));
          await transaction
            .delete(testQuestions)
            .where(eq(testQuestions.testId, id));
          await transaction
            .delete(testTopicRules)
            .where(eq(testTopicRules.testId, id));
        }

        for (const translation of input.translations) {
          await transaction
            .insert(testTranslations)
            .values({
              testId: id,
              ...translation,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [testTranslations.testId, testTranslations.locale],
              set: {
                name: translation.name,
                description: translation.description,
                updatedAt: now,
              },
            });
        }

        if (input.type === "FIXED") {
          await transaction.insert(testQuestions).values(
            input.fixedQuestions.map((question) => ({
              testId: id,
              questionId: question.questionId,
              displayOrder: question.displayOrder,
              createdAt: now,
              updatedAt: now,
            })),
          );
        } else {
          await transaction.insert(testTopicRules).values(
            input.dynamicRules.map((rule) => ({
              testId: id,
              topicId: rule.topicId,
              percentage: String(rule.percentage),
              createdAt: now,
              updatedAt: now,
            })),
          );
        }

        await transaction.insert(auditLogs).values({
          actorUserId,
          action: existing ? "CONTENT_TEST_UPDATED" : "CONTENT_TEST_CREATED",
          entityType: "TEST",
          entityId: id,
          metadata: {
            examId: input.examId,
            type: input.type,
            status: input.status,
            questionCount: input.questionCount,
          },
          createdAt: now,
        });

        return { id, preview };
      });
    } catch (error) {
      return safeConflict(error);
    }
  }

  private async runBulk(
    ids: string[],
    operation: (id: string, tx: MutableExecutor) => Promise<void>,
  ): Promise<BulkActionResult[]> {
    const results: BulkActionResult[] = [];
    for (const id of ids) {
      try {
        await this.database.transaction((tx) => operation(id, tx));
        results.push({ id, ok: true });
      } catch (error) {
        if (isAdminContentError(error)) {
          results.push({
            id,
            ok: false,
            code: error.code,
            message: error.message,
          });
        } else if (isForeignKeyViolation(error)) {
          results.push({
            id,
            ok: false,
            code: "CONFLICT",
            message: "Still referenced by other records",
          });
        } else if (isUniqueViolation(error)) {
          results.push({
            id,
            ok: false,
            code: "CONFLICT",
            message: "Conflicts with an existing record",
          });
        } else {
          throw error;
        }
      }
    }
    return results;
  }

  async bulkSetExamStatus(
    ids: string[],
    status: ContentStatus,
    actorUserId: string,
    now: Date,
  ): Promise<BulkActionResult[]> {
    return this.runBulk(ids, async (id, tx) => {
      const existing = (
        await tx
          .select()
          .from(exams)
          .where(eq(exams.id, id))
          .limit(1)
          .for("update")
      )[0];
      if (!existing) {
        throw new AdminContentError("NOT_FOUND", 404, "Exam not found");
      }
      if (existing.status === status) return;

      if (status === "PUBLISHED") {
        const translations = await tx
          .select({ locale: examTranslations.locale })
          .from(examTranslations)
          .where(eq(examTranslations.examId, id));
        assertTranslations(translations, existing.enabledLocales, "translations");
        const [publishedTopics, publishedQuestions] = await Promise.all([
          tx
            .select({ value: count() })
            .from(topics)
            .where(and(eq(topics.examId, id), eq(topics.status, "PUBLISHED"))),
          tx
            .select({ value: count() })
            .from(questions)
            .where(
              and(
                eq(questions.examId, id),
                eq(questions.status, "PUBLISHED"),
                isNull(questions.deletedAt),
              ),
            ),
        ]);
        if (
          Number(publishedTopics[0]?.value ?? 0) < 1 ||
          Number(publishedQuestions[0]?.value ?? 0) < 1
        ) {
          throw new AdminContentError(
            "PUBLISH_NOT_READY",
            409,
            "An exam needs a published topic and question",
            { status: ["EXAM_CONTENT_REQUIRED"] },
          );
        }
      }

      await tx.update(exams).set({ status, updatedAt: now }).where(eq(exams.id, id));
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "CONTENT_EXAM_STATUS_BULK_UPDATED",
        entityType: "EXAM",
        entityId: id,
        metadata: { from: existing.status, to: status },
        createdAt: now,
      });
    });
  }

  async bulkSetTopicStatus(
    ids: string[],
    status: ContentStatus,
    actorUserId: string,
    now: Date,
  ): Promise<BulkActionResult[]> {
    return this.runBulk(ids, async (id, tx) => {
      const existing = (
        await tx
          .select()
          .from(topics)
          .where(eq(topics.id, id))
          .limit(1)
          .for("update")
      )[0];
      if (!existing) {
        throw new AdminContentError("NOT_FOUND", 404, "Topic not found");
      }
      if (existing.status === status) return;

      if (status === "PUBLISHED") {
        const exam = (
          await tx
            .select({ enabledLocales: exams.enabledLocales })
            .from(exams)
            .where(eq(exams.id, existing.examId))
            .limit(1)
        )[0];
        if (!exam) {
          throw new AdminContentError("NOT_FOUND", 404, "Exam not found");
        }
        const translations = await tx
          .select({ locale: topicTranslations.locale })
          .from(topicTranslations)
          .where(eq(topicTranslations.topicId, id));
        assertTranslations(translations, exam.enabledLocales, "translations");
      }

      await tx
        .update(topics)
        .set({ status, updatedAt: now })
        .where(eq(topics.id, id));
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "CONTENT_TOPIC_STATUS_BULK_UPDATED",
        entityType: "TOPIC",
        entityId: id,
        metadata: { from: existing.status, to: status },
        createdAt: now,
      });
    });
  }

  async bulkSetQuestionStatus(
    ids: string[],
    status: ContentStatus,
    actorUserId: string,
    now: Date,
  ): Promise<BulkActionResult[]> {
    return this.runBulk(ids, async (id, tx) => {
      const existing = (
        await tx
          .select()
          .from(questions)
          .where(eq(questions.id, id))
          .limit(1)
          .for("update")
      )[0];
      if (!existing) {
        throw new AdminContentError("NOT_FOUND", 404, "Question not found");
      }
      if (existing.deletedAt) {
        throw new AdminContentError(
          "CONFLICT",
          409,
          "A deleted question cannot be edited",
        );
      }
      if (existing.status === status) return;

      if (status === "PUBLISHED") {
        const exam = (
          await tx
            .select({ enabledLocales: exams.enabledLocales })
            .from(exams)
            .where(eq(exams.id, existing.examId))
            .limit(1)
        )[0];
        if (!exam) {
          throw new AdminContentError("NOT_FOUND", 404, "Exam not found");
        }
        const translations = await tx
          .select({ locale: questionTranslations.locale })
          .from(questionTranslations)
          .where(eq(questionTranslations.questionId, id));
        assertTranslations(translations, exam.enabledLocales, "translations");

        const optionRows = await tx
          .select({ id: questionOptions.id })
          .from(questionOptions)
          .where(eq(questionOptions.questionId, id));
        const optionIds = optionRows.map((option) => option.id);
        const optionTranslationRows = optionIds.length
          ? await tx
              .select({
                optionId: questionOptionTranslations.optionId,
                locale: questionOptionTranslations.locale,
              })
              .from(questionOptionTranslations)
              .where(inArray(questionOptionTranslations.optionId, optionIds))
          : [];
        for (const optionId of optionIds) {
          const localesForOption = optionTranslationRows.filter(
            (row) => row.optionId === optionId,
          );
          assertTranslations(localesForOption, exam.enabledLocales, "options");
        }
      }

      await tx
        .update(questions)
        .set({ status, updatedBy: actorUserId, updatedAt: now })
        .where(eq(questions.id, id));
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "CONTENT_QUESTION_STATUS_BULK_UPDATED",
        entityType: "QUESTION",
        entityId: id,
        metadata: { from: existing.status, to: status },
        createdAt: now,
      });
    });
  }

  async bulkSetTestStatus(
    ids: string[],
    status: ContentStatus,
    actorUserId: string,
    now: Date,
  ): Promise<BulkActionResult[]> {
    return this.runBulk(ids, async (id, tx) => {
      const existing = (
        await tx
          .select()
          .from(quizTests)
          .where(eq(quizTests.id, id))
          .limit(1)
          .for("update")
      )[0];
      if (!existing) {
        throw new AdminContentError("NOT_FOUND", 404, "Test not found");
      }
      if (existing.status === status) return;

      const exam = (
        await tx
          .select({ enabledLocales: exams.enabledLocales })
          .from(exams)
          .where(eq(exams.id, existing.examId))
          .limit(1)
      )[0];
      if (!exam) {
        throw new AdminContentError("NOT_FOUND", 404, "Exam not found");
      }

      if (status === "PUBLISHED") {
        const translations = await tx
          .select({ locale: testTranslations.locale })
          .from(testTranslations)
          .where(eq(testTranslations.testId, id));
        assertTranslations(translations, exam.enabledLocales, "translations");

        if (existing.type === "FIXED") {
          const fixedRows = await tx
            .select({ questionId: testQuestions.questionId })
            .from(testQuestions)
            .where(eq(testQuestions.testId, id));
          const questionIds = fixedRows.map((row) => row.questionId);
          const availableRows = questionIds.length
            ? await tx
                .select({ id: questions.id })
                .from(questions)
                .where(
                  and(
                    inArray(questions.id, questionIds),
                    eq(questions.status, "PUBLISHED"),
                    isNull(questions.deletedAt),
                  ),
                )
            : [];
          if (availableRows.length !== questionIds.length) {
            throw new AdminContentError(
              "PUBLISH_NOT_READY",
              409,
              "The published question bank is insufficient",
              { fixedQuestions: ["QUESTION_SOURCE_INVALID"] },
            );
          }
        } else {
          const ruleRows = await tx
            .select({
              topicId: testTopicRules.topicId,
              percentage: testTopicRules.percentage,
            })
            .from(testTopicRules)
            .where(eq(testTopicRules.testId, id));
          const topicIds = ruleRows.map((rule) => rule.topicId);
          const bankRows = topicIds.length
            ? await tx
                .select({ topicId: questions.topicId, value: count() })
                .from(questions)
                .where(
                  and(
                    inArray(questions.topicId, topicIds),
                    eq(questions.examId, existing.examId),
                    eq(questions.status, "PUBLISHED"),
                    isNull(questions.deletedAt),
                  ),
                )
                .groupBy(questions.topicId)
            : [];
          const available = new Map(
            bankRows.map((row) => [row.topicId, Number(row.value)]),
          );
          const allocation = allocateLargestRemainder(
            existing.questionCount,
            ruleRows.map((rule) => ({
              topicId: rule.topicId,
              percentage: Number(rule.percentage),
            })),
          );
          if (
            allocation.some(
              (row) => (available.get(row.topicId) ?? 0) < row.questionCount,
            )
          ) {
            throw new AdminContentError(
              "PUBLISH_NOT_READY",
              409,
              "The published question bank is insufficient",
              { dynamicRules: ["QUESTION_BANK_INSUFFICIENT"] },
            );
          }
        }
      }

      await tx
        .update(quizTests)
        .set({ status, updatedAt: now })
        .where(eq(quizTests.id, id));
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "CONTENT_TEST_STATUS_BULK_UPDATED",
        entityType: "TEST",
        entityId: id,
        metadata: { from: existing.status, to: status },
        createdAt: now,
      });
    });
  }

  async bulkDeleteExams(
    ids: string[],
    actorUserId: string,
    now: Date,
  ): Promise<BulkActionResult[]> {
    return this.runBulk(ids, async (id, tx) => {
      const existing = (
        await tx
          .select({ id: exams.id, status: exams.status })
          .from(exams)
          .where(eq(exams.id, id))
          .limit(1)
          .for("update")
      )[0];
      if (!existing) {
        throw new AdminContentError("NOT_FOUND", 404, "Exam not found");
      }
      if (existing.status !== "ARCHIVED") {
        throw new AdminContentError(
          "CONFLICT",
          409,
          "Only archived records can be permanently deleted",
        );
      }
      await tx.delete(exams).where(eq(exams.id, id));
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "CONTENT_EXAM_HARD_DELETED",
        entityType: "EXAM",
        entityId: id,
        metadata: { status: "ARCHIVED" },
        createdAt: now,
      });
    });
  }

  async bulkDeleteTopics(
    ids: string[],
    actorUserId: string,
    now: Date,
  ): Promise<BulkActionResult[]> {
    return this.runBulk(ids, async (id, tx) => {
      const existing = (
        await tx
          .select({ id: topics.id, status: topics.status })
          .from(topics)
          .where(eq(topics.id, id))
          .limit(1)
          .for("update")
      )[0];
      if (!existing) {
        throw new AdminContentError("NOT_FOUND", 404, "Topic not found");
      }
      if (existing.status !== "ARCHIVED") {
        throw new AdminContentError(
          "CONFLICT",
          409,
          "Only archived records can be permanently deleted",
        );
      }
      await tx.delete(topics).where(eq(topics.id, id));
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "CONTENT_TOPIC_HARD_DELETED",
        entityType: "TOPIC",
        entityId: id,
        metadata: { status: "ARCHIVED" },
        createdAt: now,
      });
    });
  }

  async bulkDeleteTests(
    ids: string[],
    actorUserId: string,
    now: Date,
  ): Promise<BulkActionResult[]> {
    return this.runBulk(ids, async (id, tx) => {
      const existing = (
        await tx
          .select({ id: quizTests.id, status: quizTests.status })
          .from(quizTests)
          .where(eq(quizTests.id, id))
          .limit(1)
          .for("update")
      )[0];
      if (!existing) {
        throw new AdminContentError("NOT_FOUND", 404, "Test not found");
      }
      if (existing.status !== "ARCHIVED") {
        throw new AdminContentError(
          "CONFLICT",
          409,
          "Only archived records can be permanently deleted",
        );
      }
      await tx.delete(quizTests).where(eq(quizTests.id, id));
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "CONTENT_TEST_HARD_DELETED",
        entityType: "TEST",
        entityId: id,
        metadata: { status: "ARCHIVED" },
        createdAt: now,
      });
    });
  }

  async bulkDeleteQuestions(
    ids: string[],
    actorUserId: string,
    now: Date,
  ): Promise<BulkActionResult[]> {
    return this.runBulk(ids, async (id, tx) => {
      const existing = (
        await tx
          .select({ id: questions.id, status: questions.status })
          .from(questions)
          .where(eq(questions.id, id))
          .limit(1)
          .for("update")
      )[0];
      if (!existing) {
        throw new AdminContentError("NOT_FOUND", 404, "Question not found");
      }
      if (existing.status !== "ARCHIVED") {
        throw new AdminContentError(
          "CONFLICT",
          409,
          "Only archived records can be permanently deleted",
        );
      }
      await tx.delete(questions).where(eq(questions.id, id));
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "CONTENT_QUESTION_HARD_DELETED",
        entityType: "QUESTION",
        entityId: id,
        metadata: { status: "ARCHIVED" },
        createdAt: now,
      });
    });
  }
}
