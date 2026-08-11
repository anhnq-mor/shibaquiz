import { and, count, eq, isNull, or, sql } from "drizzle-orm";

import type {
  ContentTranslationRepository,
  EnableExamLocaleResult,
  TranslationCompletenessReport,
} from "@/domain/content/translations";
import type { Database } from "@/server/db/client";
import {
  exams,
  examTranslations,
  mediaAssets,
  mediaTranslations,
  questionMedia,
  questionOptions,
  questionOptionTranslations,
  questions,
  questionTranslations,
  quizTests,
  testTranslations,
  topics,
  topicTranslations,
} from "@/server/db/schema";

export class DrizzleContentTranslationRepository implements ContentTranslationRepository {
  constructor(private readonly database: Database) {}

  async enableExamLocale(
    input: Parameters<ContentTranslationRepository["enableExamLocale"]>[0],
  ): Promise<EnableExamLocaleResult> {
    return this.database.transaction(async (transaction) => {
      const examRows = await transaction
        .select({ enabledLocales: exams.enabledLocales })
        .from(exams)
        .where(eq(exams.id, input.examId))
        .limit(1)
        .for("update");
      const exam = examRows[0];
      if (!exam) return { status: "EXAM_NOT_FOUND" };

      const [examMissingRows, topicMissingRows, questionMissingRows] =
        await Promise.all([
          transaction
            .select({ value: count() })
            .from(exams)
            .leftJoin(
              examTranslations,
              and(
                eq(examTranslations.examId, exams.id),
                eq(examTranslations.locale, input.locale),
              ),
            )
            .where(
              and(
                eq(exams.id, input.examId),
                or(
                  isNull(examTranslations.examId),
                  sql`btrim(${examTranslations.name}) = ''`,
                  sql`btrim(${examTranslations.description}) = ''`,
                ),
              ),
            ),
          transaction
            .select({ value: count() })
            .from(topics)
            .leftJoin(
              topicTranslations,
              and(
                eq(topicTranslations.topicId, topics.id),
                eq(topicTranslations.locale, input.locale),
              ),
            )
            .where(
              and(
                eq(topics.examId, input.examId),
                eq(topics.status, "PUBLISHED"),
                or(
                  isNull(topicTranslations.topicId),
                  sql`btrim(${topicTranslations.name}) = ''`,
                  sql`btrim(${topicTranslations.description}) = ''`,
                ),
              ),
            ),
          transaction
            .select({ value: count() })
            .from(questions)
            .leftJoin(
              questionTranslations,
              and(
                eq(questionTranslations.questionId, questions.id),
                eq(questionTranslations.locale, input.locale),
              ),
            )
            .where(
              and(
                eq(questions.examId, input.examId),
                eq(questions.status, "PUBLISHED"),
                isNull(questions.deletedAt),
                or(
                  isNull(questionTranslations.questionId),
                  sql`btrim(${questionTranslations.content}) = ''`,
                ),
              ),
            ),
        ]);

      const [optionMissingRows, testMissingRows, mediaMissingRows] =
        await Promise.all([
          transaction
            .select({ value: count() })
            .from(questionOptions)
            .innerJoin(questions, eq(questions.id, questionOptions.questionId))
            .leftJoin(
              questionOptionTranslations,
              and(
                eq(questionOptionTranslations.optionId, questionOptions.id),
                eq(questionOptionTranslations.locale, input.locale),
              ),
            )
            .where(
              and(
                eq(questions.examId, input.examId),
                eq(questions.status, "PUBLISHED"),
                isNull(questions.deletedAt),
                or(
                  isNull(questionOptionTranslations.optionId),
                  sql`btrim(${questionOptionTranslations.content}) = ''`,
                  and(
                    eq(questions.type, "MATCHING"),
                    or(
                      isNull(questionOptionTranslations.matchTargetContent),
                      sql`btrim(${questionOptionTranslations.matchTargetContent}) = ''`,
                    ),
                  ),
                ),
              ),
            ),
          transaction
            .select({ value: count() })
            .from(quizTests)
            .leftJoin(
              testTranslations,
              and(
                eq(testTranslations.testId, quizTests.id),
                eq(testTranslations.locale, input.locale),
              ),
            )
            .where(
              and(
                eq(quizTests.examId, input.examId),
                eq(quizTests.status, "PUBLISHED"),
                or(
                  isNull(testTranslations.testId),
                  sql`btrim(${testTranslations.name}) = ''`,
                  sql`btrim(${testTranslations.description}) = ''`,
                ),
              ),
            ),
          transaction
            .select({ value: count() })
            .from(questionMedia)
            .innerJoin(questions, eq(questions.id, questionMedia.questionId))
            .innerJoin(
              mediaAssets,
              eq(mediaAssets.id, questionMedia.mediaAssetId),
            )
            .leftJoin(
              mediaTranslations,
              and(
                eq(mediaTranslations.mediaAssetId, mediaAssets.id),
                eq(mediaTranslations.locale, input.locale),
              ),
            )
            .where(
              and(
                eq(questions.examId, input.examId),
                eq(questions.status, "PUBLISHED"),
                isNull(questions.deletedAt),
                eq(mediaAssets.status, "READY"),
                isNull(mediaAssets.deletedAt),
                or(
                  isNull(mediaTranslations.mediaAssetId),
                  and(
                    eq(mediaAssets.type, "IMAGE"),
                    sql`coalesce(btrim(${mediaTranslations.altText}), '') = ''`,
                  ),
                  and(
                    or(
                      eq(mediaAssets.type, "AUDIO"),
                      eq(mediaAssets.type, "VIDEO"),
                    ),
                    sql`coalesce(btrim(${mediaTranslations.transcript}), '') = ''`,
                  ),
                ),
              ),
            ),
        ]);

      const counts = {
        missingExamTranslations: examMissingRows[0]?.value ?? 0,
        missingTopicTranslations: topicMissingRows[0]?.value ?? 0,
        missingQuestionTranslations: questionMissingRows[0]?.value ?? 0,
        missingOptionTranslations: optionMissingRows[0]?.value ?? 0,
        missingTestTranslations: testMissingRows[0]?.value ?? 0,
        missingMediaAccessibilityTranslations: mediaMissingRows[0]?.value ?? 0,
      };
      const report: TranslationCompletenessReport = {
        complete: Object.values(counts).every((value) => value === 0),
        ...counts,
      };
      if (!report.complete) return { status: "INCOMPLETE", report };
      if (exam.enabledLocales.includes(input.locale))
        return { status: "ALREADY_ENABLED", report };

      await transaction
        .update(exams)
        .set({
          enabledLocales: sql`array_append(${exams.enabledLocales}, ${input.locale}::locale)`,
          updatedAt: input.now,
        })
        .where(eq(exams.id, input.examId));
      return { status: "ENABLED", report };
    });
  }
}
