import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { allocateLargestRemainder } from "@/domain/admin/content";
import {
  AttemptError,
  computeAttemptExpiry,
  computeAttemptResult,
  isAnswerCorrect,
  isAttemptExpired,
  shuffle,
  type AttemptHistoryItem,
  type AttemptQuestionOutcome,
  type AttemptQuestionState,
  type AttemptRepository,
  type AttemptResultView,
  type AttemptTakingView,
  type HistoryFilterInput,
  type SaveAnswerInput,
  type StartAttemptInput,
  type TopicBreakdown,
} from "@/domain/attempts/attempt";
import {
  toQuestionDto,
  type StoredMediaReference,
  type StoredQuestionOption,
  type StoredQuestionSnapshot,
} from "@/domain/attempts/disclosure";
import type { Locale } from "@/domain/common/locale";
import type { Database } from "@/server/db/client";
import {
  attemptQuestions,
  attempts,
  examTranslations,
  exams,
  mediaAssets,
  mediaTranslations,
  questionMedia,
  questionOptionTranslations,
  questionOptions,
  questionTranslations,
  questions,
  quizTests,
  testQuestions,
  testTopicRules,
  testTranslations,
  topicTranslations,
  topics,
} from "@/server/db/schema";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

interface QuestionSource {
  topicId: string;
  version: number;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  snapshot: StoredQuestionSnapshot;
}

async function loadQuestionSources(
  transaction: Transaction,
  questionIds: string[],
  locale: Locale,
): Promise<Map<string, QuestionSource>> {
  if (questionIds.length === 0) return new Map();

  const [questionRows, translationRows, optionRows, mediaLinkRows] =
    await Promise.all([
      transaction
        .select({
          id: questions.id,
          topicId: questions.topicId,
          version: questions.version,
          type: questions.type,
        })
        .from(questions)
        .where(inArray(questions.id, questionIds)),
      transaction
        .select({
          questionId: questionTranslations.questionId,
          content: questionTranslations.content,
          explanation: questionTranslations.explanation,
        })
        .from(questionTranslations)
        .where(
          and(
            inArray(questionTranslations.questionId, questionIds),
            eq(questionTranslations.locale, locale),
          ),
        ),
      transaction
        .select({
          id: questionOptions.id,
          questionId: questionOptions.questionId,
          label: questionOptions.label,
          isCorrect: questionOptions.isCorrect,
          displayOrder: questionOptions.displayOrder,
        })
        .from(questionOptions)
        .where(inArray(questionOptions.questionId, questionIds))
        .orderBy(asc(questionOptions.displayOrder)),
      transaction
        .select({
          questionId: questionMedia.questionId,
          mediaAssetId: questionMedia.mediaAssetId,
          displayOrder: questionMedia.displayOrder,
          type: mediaAssets.type,
          objectKey: mediaAssets.objectKey,
          objectVersion: mediaAssets.objectVersion,
          mimeType: mediaAssets.mimeType,
        })
        .from(questionMedia)
        .innerJoin(
          mediaAssets,
          and(
            eq(mediaAssets.id, questionMedia.mediaAssetId),
            eq(mediaAssets.status, "READY"),
            isNull(mediaAssets.deletedAt),
          ),
        )
        .where(inArray(questionMedia.questionId, questionIds))
        .orderBy(asc(questionMedia.displayOrder)),
    ]);

  const optionIds = optionRows.map((row) => row.id);
  const mediaAssetIds = mediaLinkRows.map((row) => row.mediaAssetId);
  const [optionTranslationRows, mediaTranslationRows] = await Promise.all([
    optionIds.length
      ? transaction
          .select({
            optionId: questionOptionTranslations.optionId,
            content: questionOptionTranslations.content,
          })
          .from(questionOptionTranslations)
          .where(
            and(
              inArray(questionOptionTranslations.optionId, optionIds),
              eq(questionOptionTranslations.locale, locale),
            ),
          )
      : Promise.resolve([]),
    mediaAssetIds.length
      ? transaction
          .select({
            mediaAssetId: mediaTranslations.mediaAssetId,
            altText: mediaTranslations.altText,
            caption: mediaTranslations.caption,
            transcript: mediaTranslations.transcript,
          })
          .from(mediaTranslations)
          .where(
            and(
              inArray(mediaTranslations.mediaAssetId, mediaAssetIds),
              eq(mediaTranslations.locale, locale),
            ),
          )
      : Promise.resolve([]),
  ]);

  const translationByQuestionId = new Map(
    translationRows.map((row) => [row.questionId, row]),
  );
  const optionTranslationByOptionId = new Map(
    optionTranslationRows.map((row) => [row.optionId, row.content]),
  );
  const mediaTranslationByAssetId = new Map(
    mediaTranslationRows.map((row) => [row.mediaAssetId, row]),
  );

  const optionsByQuestionId = new Map<string, StoredQuestionOption[]>();
  for (const option of optionRows) {
    const list = optionsByQuestionId.get(option.questionId) ?? [];
    list.push({
      id: option.id,
      label: option.label,
      content: optionTranslationByOptionId.get(option.id) ?? "",
      isCorrect: option.isCorrect,
    });
    optionsByQuestionId.set(option.questionId, list);
  }

  const mediaByQuestionId = new Map<string, StoredMediaReference[]>();
  for (const link of mediaLinkRows) {
    const translation = mediaTranslationByAssetId.get(link.mediaAssetId);
    const list = mediaByQuestionId.get(link.questionId) ?? [];
    list.push({
      id: link.mediaAssetId,
      type: link.type,
      objectKey: link.objectKey,
      objectVersion: link.objectVersion,
      mimeType: link.mimeType,
      altText: translation?.altText ?? null,
      caption: translation?.caption ?? null,
      transcript: translation?.transcript ?? null,
    });
    mediaByQuestionId.set(link.questionId, list);
  }

  const result = new Map<string, QuestionSource>();
  for (const row of questionRows) {
    const translation = translationByQuestionId.get(row.id);
    if (!translation) continue;
    result.set(row.id, {
      topicId: row.topicId,
      version: row.version,
      type: row.type,
      snapshot: {
        schemaVersion: 1,
        locale,
        sourceQuestionVersion: row.version,
        type: row.type,
        content: translation.content,
        explanation: translation.explanation,
        options: optionsByQuestionId.get(row.id) ?? [],
        media: mediaByQuestionId.get(row.id) ?? [],
      },
    });
  }
  return result;
}

function correctOptionIds(snapshot: StoredQuestionSnapshot): string[] {
  return snapshot.options
    .filter((option) => option.isCorrect)
    .map((option) => option.id);
}

function attemptQuestionRowToState(
  row: {
    id: string;
    displayOrder: number;
    topicId: string;
    selectedOptionIds: string[];
    isFlagged: boolean;
    checkedAt: Date | null;
    questionSnapshot: StoredQuestionSnapshot;
  },
  topicName: string,
  mode: AttemptTakingView["mode"],
  attemptStatus: AttemptTakingView["status"],
): AttemptQuestionState {
  return {
    attemptQuestionId: row.id,
    displayOrder: row.displayOrder,
    topicId: row.topicId,
    topicName,
    type: row.questionSnapshot.type,
    selectedOptionIds: row.selectedOptionIds,
    isFlagged: row.isFlagged,
    checkedAt: row.checkedAt ? row.checkedAt.toISOString() : null,
    question: toQuestionDto(row.questionSnapshot, {
      mode,
      attemptStatus,
      checkedAt: row.checkedAt,
    }),
  };
}

async function loadTopicNames(
  executor: Transaction,
  topicIds: string[],
  locale: Locale,
): Promise<Map<string, string>> {
  if (topicIds.length === 0) return new Map();
  const rows = await executor
    .select({
      topicId: topicTranslations.topicId,
      name: topicTranslations.name,
    })
    .from(topicTranslations)
    .where(
      and(
        inArray(topicTranslations.topicId, [...new Set(topicIds)]),
        eq(topicTranslations.locale, locale),
      ),
    );
  return new Map(rows.map((row) => [row.topicId, row.name]));
}

export class DrizzleAttemptRepository implements AttemptRepository {
  constructor(private readonly database: Database) {}

  async startOrResumeAttempt(
    input: StartAttemptInput,
    userId: string,
    locale: Locale,
    now: Date,
  ): Promise<{ attemptId: string; resumed: boolean }> {
    return this.database.transaction(async (transaction) => {
      const exam = (
        await transaction
          .select({
            id: exams.id,
            primaryLocale: exams.primaryLocale,
            enabledLocales: exams.enabledLocales,
            status: exams.status,
          })
          .from(exams)
          .where(eq(exams.id, input.examId))
          .limit(1)
      )[0];
      if (!exam || exam.status !== "PUBLISHED") {
        throw new AttemptError("NOT_FOUND", 404, "Exam not found");
      }
      const effectiveLocale = exam.enabledLocales.includes(locale)
        ? locale
        : exam.primaryLocale;

      const dedupConditions = [
        eq(attempts.userId, userId),
        eq(attempts.examId, input.examId),
        eq(attempts.scope, input.scope),
        eq(attempts.mode, input.mode),
        eq(attempts.status, "IN_PROGRESS"),
      ];
      if (input.scope === "FULL_TEST") {
        dedupConditions.push(eq(attempts.testId, input.testId!));
      }
      if (input.scope === "TOPIC") {
        dedupConditions.push(
          sql`${attempts.generationConfigSnapshot}->>'topicId' = ${input.topicId}`,
        );
      }
      const existing = (
        await transaction
          .select({ id: attempts.id })
          .from(attempts)
          .where(and(...dedupConditions))
          .limit(1)
          .for("update")
      )[0];
      if (existing) return { attemptId: existing.id, resumed: true };

      let questionIds: string[] = [];
      let testId: string | null = null;
      let durationMinutes: number | null = null;
      let shuffleOptions = false;
      let generationConfigSnapshot: Record<string, unknown> = {};

      if (input.scope === "TOPIC") {
        const topic = (
          await transaction
            .select({ id: topics.id })
            .from(topics)
            .where(
              and(
                eq(topics.id, input.topicId!),
                eq(topics.examId, input.examId),
                eq(topics.status, "PUBLISHED"),
              ),
            )
            .limit(1)
        )[0];
        if (!topic) {
          throw new AttemptError("NOT_FOUND", 404, "Topic not found");
        }
        const rows = await transaction
          .select({ id: questions.id })
          .from(questions)
          .where(
            and(
              eq(questions.topicId, input.topicId!),
              eq(questions.status, "PUBLISHED"),
              isNull(questions.deletedAt),
            ),
          )
          .orderBy(asc(questions.id));
        questionIds = rows.map((row) => row.id);
        generationConfigSnapshot = { topicId: input.topicId };
      } else if (input.scope === "QUESTION_BANK") {
        const rows = await transaction
          .select({ id: questions.id })
          .from(questions)
          .where(
            and(
              eq(questions.examId, input.examId),
              eq(questions.status, "PUBLISHED"),
              isNull(questions.deletedAt),
            ),
          )
          .orderBy(asc(questions.id));
        questionIds = rows.map((row) => row.id);
      } else {
        const test = (
          await transaction
            .select({
              id: quizTests.id,
              type: quizTests.type,
              questionCount: quizTests.questionCount,
              durationMinutes: quizTests.durationMinutes,
              shuffleQuestions: quizTests.shuffleQuestions,
              shuffleOptions: quizTests.shuffleOptions,
            })
            .from(quizTests)
            .where(
              and(
                eq(quizTests.id, input.testId!),
                eq(quizTests.examId, input.examId),
                eq(quizTests.status, "PUBLISHED"),
              ),
            )
            .limit(1)
        )[0];
        if (!test) {
          throw new AttemptError("NOT_FOUND", 404, "Test not found");
        }
        testId = test.id;
        durationMinutes = test.durationMinutes;
        shuffleOptions = test.shuffleOptions;

        if (test.type === "FIXED") {
          const fixedRows = await transaction
            .select({
              questionId: testQuestions.questionId,
              displayOrder: testQuestions.displayOrder,
            })
            .from(testQuestions)
            .where(eq(testQuestions.testId, test.id))
            .orderBy(asc(testQuestions.displayOrder));
          const candidateIds = fixedRows.map((row) => row.questionId);
          const validRows = candidateIds.length
            ? await transaction
                .select({ id: questions.id })
                .from(questions)
                .where(
                  and(
                    inArray(questions.id, candidateIds),
                    eq(questions.status, "PUBLISHED"),
                    isNull(questions.deletedAt),
                  ),
                )
            : [];
          if (validRows.length !== candidateIds.length) {
            throw new AttemptError(
              "INSUFFICIENT_QUESTIONS",
              409,
              "One or more fixed test questions are no longer published",
            );
          }
          questionIds = test.shuffleQuestions
            ? shuffle(candidateIds)
            : candidateIds;
        } else {
          const rules = await transaction
            .select({
              topicId: testTopicRules.topicId,
              percentage: testTopicRules.percentage,
            })
            .from(testTopicRules)
            .where(eq(testTopicRules.testId, test.id));
          const topicIds = rules.map((rule) => rule.topicId);
          const bankRows = topicIds.length
            ? await transaction
                .select({ topicId: questions.topicId, id: questions.id })
                .from(questions)
                .where(
                  and(
                    inArray(questions.topicId, topicIds),
                    eq(questions.status, "PUBLISHED"),
                    isNull(questions.deletedAt),
                  ),
                )
            : [];
          const bankByTopic = new Map<string, string[]>();
          for (const row of bankRows) {
            const list = bankByTopic.get(row.topicId) ?? [];
            list.push(row.id);
            bankByTopic.set(row.topicId, list);
          }
          const allocation = allocateLargestRemainder(
            test.questionCount,
            rules.map((rule) => ({
              topicId: rule.topicId,
              percentage: Number(rule.percentage),
            })),
          );
          const selected: string[] = [];
          for (const rule of allocation) {
            const bank = bankByTopic.get(rule.topicId) ?? [];
            if (bank.length < rule.questionCount) {
              throw new AttemptError(
                "INSUFFICIENT_QUESTIONS",
                409,
                "The published question bank is insufficient for this test",
              );
            }
            selected.push(...shuffle(bank).slice(0, rule.questionCount));
          }
          questionIds = test.shuffleQuestions ? shuffle(selected) : selected;
        }
      }

      if (questionIds.length === 0) {
        throw new AttemptError(
          "INSUFFICIENT_QUESTIONS",
          409,
          "No published questions are available for this selection",
        );
      }

      const sources = await loadQuestionSources(
        transaction,
        questionIds,
        effectiveLocale,
      );
      const startedAt = now;
      const expiresAt = computeAttemptExpiry(startedAt, durationMinutes);

      const [inserted] = await transaction
        .insert(attempts)
        .values({
          userId,
          examId: input.examId,
          testId,
          scope: input.scope,
          mode: input.mode,
          status: "IN_PROGRESS",
          locale: effectiveLocale,
          startedAt,
          expiresAt,
          lastActivityAt: now,
          generationConfigSnapshot,
        })
        .returning();
      const attemptId = inserted!.id;

      await transaction.insert(attemptQuestions).values(
        questionIds.map((questionId, index) => {
          const source = sources.get(questionId)!;
          const snapshot: StoredQuestionSnapshot = shuffleOptions
            ? { ...source.snapshot, options: shuffle(source.snapshot.options) }
            : source.snapshot;
          return {
            attemptId,
            sourceQuestionId: questionId,
            topicId: source.topicId,
            displayOrder: index,
            questionSnapshot: snapshot,
            selectedOptionIds: [],
            isFlagged: false,
          };
        }),
      );

      return { attemptId, resumed: false };
    });
  }

  private async loadOwnedAttempt(
    executor: Transaction | Database,
    attemptId: string,
    userId: string,
  ) {
    const row = (
      await executor
        .select()
        .from(attempts)
        .where(and(eq(attempts.id, attemptId), eq(attempts.userId, userId)))
        .limit(1)
    )[0];
    if (!row) {
      throw new AttemptError("NOT_FOUND", 404, "Attempt not found");
    }
    return row;
  }

  private async finalizeAttempt(
    transaction: Transaction,
    attempt: { id: string; expiresAt: Date | null },
    now: Date,
  ) {
    const rows = await transaction
      .select()
      .from(attemptQuestions)
      .where(eq(attemptQuestions.attemptId, attempt.id));

    const outcomes: AttemptQuestionOutcome[] = rows.map((row) => ({
      topicId: row.topicId,
      selectedOptionIds: row.selectedOptionIds,
      correctOptionIds: correctOptionIds(row.questionSnapshot),
    }));
    const summary = computeAttemptResult(outcomes);
    const status = isAttemptExpired(now, attempt.expiresAt)
      ? "EXPIRED"
      : "SUBMITTED";

    await Promise.all(
      rows.map((row) => {
        const isCorrect =
          row.selectedOptionIds.length === 0
            ? null
            : isAnswerCorrect(
                row.selectedOptionIds,
                correctOptionIds(row.questionSnapshot),
              );
        return transaction
          .update(attemptQuestions)
          .set({ isCorrect, updatedAt: now })
          .where(eq(attemptQuestions.id, row.id));
      }),
    );

    const [updated] = await transaction
      .update(attempts)
      .set({
        status,
        scorePercent: summary.scorePercent.toFixed(2),
        correctCount: summary.correctCount,
        incorrectCount: summary.incorrectCount,
        unansweredCount: summary.unansweredCount,
        submittedAt: now,
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(eq(attempts.id, attempt.id))
      .returning();
    return updated!;
  }

  private async ensureNotExpired(
    transaction: Transaction,
    attempt: Awaited<ReturnType<DrizzleAttemptRepository["loadOwnedAttempt"]>>,
    now: Date,
  ) {
    if (
      attempt.status === "IN_PROGRESS" &&
      isAttemptExpired(now, attempt.expiresAt)
    ) {
      return this.finalizeAttempt(transaction, attempt, now);
    }
    return attempt;
  }

  async getAttemptForTaking(
    attemptId: string,
    userId: string,
    now: Date,
  ): Promise<AttemptTakingView> {
    return this.database.transaction(async (transaction) => {
      const loaded = await this.loadOwnedAttempt(
        transaction,
        attemptId,
        userId,
      );
      const attempt = await this.ensureNotExpired(transaction, loaded, now);
      const exam = (
        await transaction
          .select({ name: examTranslations.name, slug: exams.slug })
          .from(examTranslations)
          .innerJoin(exams, eq(exams.id, examTranslations.examId))
          .where(
            and(
              eq(examTranslations.examId, attempt.examId),
              eq(examTranslations.locale, attempt.locale),
            ),
          )
          .limit(1)
      )[0];
      const questionRows = await transaction
        .select()
        .from(attemptQuestions)
        .where(eq(attemptQuestions.attemptId, attempt.id))
        .orderBy(asc(attemptQuestions.displayOrder));
      const topicNames = await loadTopicNames(
        transaction,
        questionRows.map((row) => row.topicId),
        attempt.locale,
      );

      return {
        attemptId: attempt.id,
        examId: attempt.examId,
        examName: exam?.name ?? "",
        examSlug: exam?.slug ?? "",
        scope: attempt.scope,
        mode: attempt.mode,
        status: attempt.status,
        locale: attempt.locale,
        startedAt: attempt.startedAt.toISOString(),
        expiresAt: attempt.expiresAt ? attempt.expiresAt.toISOString() : null,
        serverNow: now.toISOString(),
        questions: questionRows.map((row) =>
          attemptQuestionRowToState(
            row,
            topicNames.get(row.topicId) ?? "",
            attempt.mode,
            attempt.status,
          ),
        ),
      };
    });
  }

  async saveAnswer(
    attemptId: string,
    attemptQuestionId: string,
    userId: string,
    input: SaveAnswerInput,
    now: Date,
  ): Promise<AttemptQuestionState> {
    return this.database.transaction(async (transaction) => {
      const loaded = await this.loadOwnedAttempt(
        transaction,
        attemptId,
        userId,
      );
      const attempt = await this.ensureNotExpired(transaction, loaded, now);
      if (attempt.status !== "IN_PROGRESS") {
        throw new AttemptError(
          "LOCKED",
          409,
          "This attempt no longer accepts changes",
        );
      }
      const row = (
        await transaction
          .select()
          .from(attemptQuestions)
          .where(
            and(
              eq(attemptQuestions.id, attemptQuestionId),
              eq(attemptQuestions.attemptId, attempt.id),
            ),
          )
          .limit(1)
      )[0];
      if (!row) {
        throw new AttemptError("NOT_FOUND", 404, "Question not found");
      }
      if (row.checkedAt) {
        throw new AttemptError(
          "LOCKED",
          409,
          "This question was already checked",
        );
      }
      const validOptionIds = new Set(
        row.questionSnapshot.options.map((option) => option.id),
      );
      if (!input.selectedOptionIds.every((id) => validOptionIds.has(id))) {
        throw new AttemptError(
          "INVALID_STRUCTURE",
          400,
          "Selected options do not belong to this question",
        );
      }

      const [updated] = await transaction
        .update(attemptQuestions)
        .set({
          selectedOptionIds: input.selectedOptionIds,
          isFlagged: input.isFlagged ?? row.isFlagged,
          answeredAt: input.selectedOptionIds.length > 0 ? now : null,
          updatedAt: now,
        })
        .where(eq(attemptQuestions.id, row.id))
        .returning();
      await transaction
        .update(attempts)
        .set({ lastActivityAt: now, updatedAt: now })
        .where(eq(attempts.id, attempt.id));

      const topicNames = await loadTopicNames(
        transaction,
        [updated!.topicId],
        attempt.locale,
      );
      return attemptQuestionRowToState(
        updated!,
        topicNames.get(updated!.topicId) ?? "",
        attempt.mode,
        attempt.status,
      );
    });
  }

  async checkAnswer(
    attemptId: string,
    attemptQuestionId: string,
    userId: string,
    now: Date,
  ): Promise<AttemptQuestionState> {
    return this.database.transaction(async (transaction) => {
      const loaded = await this.loadOwnedAttempt(
        transaction,
        attemptId,
        userId,
      );
      const attempt = await this.ensureNotExpired(transaction, loaded, now);
      if (attempt.status !== "IN_PROGRESS") {
        throw new AttemptError(
          "LOCKED",
          409,
          "This attempt no longer accepts changes",
        );
      }
      if (attempt.mode !== "PRACTICE_IMMEDIATE") {
        throw new AttemptError(
          "FORBIDDEN",
          403,
          "Checking answers is only available in practice-immediate mode",
        );
      }
      const row = (
        await transaction
          .select()
          .from(attemptQuestions)
          .where(
            and(
              eq(attemptQuestions.id, attemptQuestionId),
              eq(attemptQuestions.attemptId, attempt.id),
            ),
          )
          .limit(1)
      )[0];
      if (!row) {
        throw new AttemptError("NOT_FOUND", 404, "Question not found");
      }
      const topicNames = await loadTopicNames(
        transaction,
        [row.topicId],
        attempt.locale,
      );
      const topicName = topicNames.get(row.topicId) ?? "";
      if (row.checkedAt) {
        return attemptQuestionRowToState(
          row,
          topicName,
          attempt.mode,
          attempt.status,
        );
      }

      const isCorrect = isAnswerCorrect(
        row.selectedOptionIds,
        correctOptionIds(row.questionSnapshot),
      );
      const [updated] = await transaction
        .update(attemptQuestions)
        .set({ checkedAt: now, isCorrect, updatedAt: now })
        .where(eq(attemptQuestions.id, row.id))
        .returning();
      await transaction
        .update(attempts)
        .set({ lastActivityAt: now, updatedAt: now })
        .where(eq(attempts.id, attempt.id));

      return attemptQuestionRowToState(
        updated!,
        topicName,
        attempt.mode,
        attempt.status,
      );
    });
  }

  async submitAttempt(
    attemptId: string,
    userId: string,
    now: Date,
  ): Promise<AttemptResultView> {
    return this.database.transaction(async (transaction) => {
      const loaded = await this.loadOwnedAttempt(
        transaction,
        attemptId,
        userId,
      );
      if (loaded.status === "ABANDONED") {
        throw new AttemptError(
          "LOCKED",
          409,
          "An abandoned attempt cannot be submitted",
        );
      }
      const attempt =
        loaded.status === "IN_PROGRESS"
          ? await this.finalizeAttempt(transaction, loaded, now)
          : loaded;
      return this.buildResultView(transaction, attempt);
    });
  }

  async abandonAttempt(
    attemptId: string,
    userId: string,
    now: Date,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const attempt = await this.loadOwnedAttempt(
        transaction,
        attemptId,
        userId,
      );
      if (attempt.status !== "IN_PROGRESS") {
        throw new AttemptError(
          "LOCKED",
          409,
          "Only an in-progress attempt can be abandoned",
        );
      }
      await transaction
        .update(attempts)
        .set({ status: "ABANDONED", updatedAt: now })
        .where(eq(attempts.id, attempt.id));
    });
  }

  async getAttemptResult(
    attemptId: string,
    userId: string,
    now: Date,
  ): Promise<AttemptResultView> {
    return this.database.transaction(async (transaction) => {
      const loaded = await this.loadOwnedAttempt(
        transaction,
        attemptId,
        userId,
      );
      const attempt = await this.ensureNotExpired(transaction, loaded, now);
      if (attempt.status === "IN_PROGRESS") {
        throw new AttemptError(
          "LOCKED",
          409,
          "This attempt has not been submitted yet",
        );
      }
      if (attempt.status === "ABANDONED") {
        throw new AttemptError(
          "NOT_FOUND",
          404,
          "This attempt was abandoned and has no result",
        );
      }
      return this.buildResultView(transaction, attempt);
    });
  }

  private async buildResultView(
    transaction: Transaction,
    attempt: typeof attempts.$inferSelect,
  ): Promise<AttemptResultView> {
    const [examRow, questionRows, test] = await Promise.all([
      transaction
        .select({ name: examTranslations.name })
        .from(examTranslations)
        .where(
          and(
            eq(examTranslations.examId, attempt.examId),
            eq(examTranslations.locale, attempt.locale),
          ),
        )
        .limit(1),
      transaction
        .select()
        .from(attemptQuestions)
        .where(eq(attemptQuestions.attemptId, attempt.id))
        .orderBy(asc(attemptQuestions.displayOrder)),
      attempt.testId
        ? transaction
            .select({ passingScorePercent: quizTests.passingScorePercent })
            .from(quizTests)
            .where(eq(quizTests.id, attempt.testId))
            .limit(1)
        : Promise.resolve([]),
    ]);

    const topicIds = [...new Set(questionRows.map((row) => row.topicId))];
    const topicNameRows = topicIds.length
      ? await transaction
          .select({
            topicId: topicTranslations.topicId,
            name: topicTranslations.name,
          })
          .from(topicTranslations)
          .where(
            and(
              inArray(topicTranslations.topicId, topicIds),
              eq(topicTranslations.locale, attempt.locale),
            ),
          )
      : [];
    const topicNameById = new Map(
      topicNameRows.map((row) => [row.topicId, row.name]),
    );

    const outcomes: AttemptQuestionOutcome[] = questionRows.map((row) => ({
      topicId: row.topicId,
      selectedOptionIds: row.selectedOptionIds,
      correctOptionIds: correctOptionIds(row.questionSnapshot),
    }));
    const summary = computeAttemptResult(outcomes);
    const topicBreakdown: Array<TopicBreakdown & { topicName: string }> =
      summary.topicBreakdown.map((breakdown) => ({
        ...breakdown,
        topicName: topicNameById.get(breakdown.topicId) ?? "",
      }));

    const passingScorePercent = test[0]
      ? Number(test[0].passingScorePercent)
      : null;
    const durationSeconds =
      attempt.submittedAt && attempt.startedAt
        ? Math.round(
            (attempt.submittedAt.getTime() - attempt.startedAt.getTime()) /
              1000,
          )
        : null;

    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      examName: examRow[0]?.name ?? "",
      scope: attempt.scope,
      mode: attempt.mode,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt
        ? attempt.submittedAt.toISOString()
        : null,
      durationSeconds,
      scorePercent: Number(attempt.scorePercent ?? 0),
      correctCount: attempt.correctCount ?? 0,
      incorrectCount: attempt.incorrectCount ?? 0,
      unansweredCount: attempt.unansweredCount ?? 0,
      passingScorePercent,
      passed:
        passingScorePercent === null
          ? null
          : Number(attempt.scorePercent ?? 0) >= passingScorePercent,
      topicBreakdown,
      questions: questionRows.map((row) => ({
        attemptQuestionId: row.id,
        sourceQuestionId: row.sourceQuestionId,
        displayOrder: row.displayOrder,
        topicId: row.topicId,
        selectedOptionIds: row.selectedOptionIds,
        isCorrect: row.isCorrect,
        question: toQuestionDto(row.questionSnapshot, {
          mode: attempt.mode,
          attemptStatus: attempt.status,
          checkedAt: row.checkedAt,
        }),
      })),
    };
  }

  async listHistory(
    userId: string,
    filters: HistoryFilterInput,
  ): Promise<{ items: AttemptHistoryItem[]; nextCursor: string | null }> {
    const conditions = [eq(attempts.userId, userId)];
    if (filters.examId) conditions.push(eq(attempts.examId, filters.examId));
    if (filters.mode) conditions.push(eq(attempts.mode, filters.mode));
    if (filters.status) conditions.push(eq(attempts.status, filters.status));
    if (filters.from)
      conditions.push(sql`${attempts.startedAt} >= ${filters.from}`);
    if (filters.to)
      conditions.push(sql`${attempts.startedAt} <= ${filters.to}`);

    if (filters.cursor) {
      const cursorRow = (
        await this.database
          .select({ startedAt: attempts.startedAt })
          .from(attempts)
          .where(
            and(eq(attempts.id, filters.cursor), eq(attempts.userId, userId)),
          )
          .limit(1)
      )[0];
      if (cursorRow) {
        conditions.push(
          sql`(${attempts.startedAt}, ${attempts.id}) < (${cursorRow.startedAt}, ${filters.cursor})`,
        );
      }
    }

    const rows = await this.database
      .select()
      .from(attempts)
      .where(and(...conditions))
      .orderBy(desc(attempts.startedAt), desc(attempts.id))
      .limit(filters.limit + 1);

    const page = rows.slice(0, filters.limit);
    const nextCursor = rows.length > filters.limit ? page.at(-1)!.id : null;

    if (page.length === 0) return { items: [], nextCursor: null };

    const examIds = [...new Set(page.map((row) => row.examId))];
    const testIds = [
      ...new Set(page.flatMap((row) => (row.testId ? [row.testId] : []))),
    ];
    const [examNameRows, testNameRows] = await Promise.all([
      this.database
        .select({
          examId: examTranslations.examId,
          locale: examTranslations.locale,
          name: examTranslations.name,
        })
        .from(examTranslations)
        .where(inArray(examTranslations.examId, examIds)),
      testIds.length
        ? this.database
            .select({
              testId: testTranslations.testId,
              locale: testTranslations.locale,
              name: testTranslations.name,
            })
            .from(testTranslations)
            .where(inArray(testTranslations.testId, testIds))
        : Promise.resolve([]),
    ]);
    const examNameByKey = new Map(
      examNameRows.map((row) => [`${row.examId}:${row.locale}`, row.name]),
    );
    const testNameByKey = new Map(
      testNameRows.map((row) => [`${row.testId}:${row.locale}`, row.name]),
    );

    const items: AttemptHistoryItem[] = page.map((row) => ({
      attemptId: row.id,
      examName: examNameByKey.get(`${row.examId}:${row.locale}`) ?? "",
      testName: row.testId
        ? (testNameByKey.get(`${row.testId}:${row.locale}`) ?? null)
        : null,
      scope: row.scope,
      mode: row.mode,
      status: row.status,
      startedAt: row.startedAt.toISOString(),
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      scorePercent: row.scorePercent === null ? null : Number(row.scorePercent),
      durationSeconds:
        row.submittedAt && row.startedAt
          ? Math.round(
              (row.submittedAt.getTime() - row.startedAt.getTime()) / 1000,
            )
          : null,
    }));

    return { items, nextCursor };
  }
}
