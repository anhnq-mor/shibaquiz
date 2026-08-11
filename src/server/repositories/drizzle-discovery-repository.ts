import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";

import type {
  DiscoveryRepository,
  PublishedExamDetail,
  PublishedExamListItem,
  PublishedTestSummary,
  PublishedTopicSummary,
} from "@/domain/discovery/discovery";
import type { Locale } from "@/domain/common/locale";
import type { Database } from "@/server/db/client";
import {
  exams,
  examTranslations,
  questions,
  quizTests,
  testTranslations,
  topics,
  topicTranslations,
} from "@/server/db/schema";

function effectiveLocale(
  requested: Locale,
  primaryLocale: Locale,
  enabledLocales: Locale[],
): Locale {
  return enabledLocales.includes(requested) ? requested : primaryLocale;
}

export class DrizzleDiscoveryRepository implements DiscoveryRepository {
  constructor(private readonly database: Database) {}

  async listPublishedExams(
    input: Parameters<DiscoveryRepository["listPublishedExams"]>[0],
  ): Promise<{ items: PublishedExamListItem[]; nextCursor: string | null }> {
    const examRows = await this.database
      .select({
        id: exams.id,
        code: exams.code,
        slug: exams.slug,
        primaryLocale: exams.primaryLocale,
        enabledLocales: exams.enabledLocales,
        createdAt: exams.createdAt,
      })
      .from(exams)
      .where(eq(exams.status, "PUBLISHED"))
      .orderBy(asc(exams.createdAt), asc(exams.id));

    if (examRows.length === 0) return { items: [], nextCursor: null };

    const examIds = examRows.map((row) => row.id);
    const localeByExamId = new Map(
      examRows.map((row) => [
        row.id,
        effectiveLocale(input.locale, row.primaryLocale, row.enabledLocales),
      ]),
    );

    const [translationRows, topicCountRows, questionCountRows] =
      await Promise.all([
        this.database
          .select({
            examId: examTranslations.examId,
            locale: examTranslations.locale,
            name: examTranslations.name,
            description: examTranslations.description,
          })
          .from(examTranslations)
          .where(inArray(examTranslations.examId, examIds)),
        this.database
          .select({ examId: topics.examId, value: count() })
          .from(topics)
          .where(
            and(
              inArray(topics.examId, examIds),
              eq(topics.status, "PUBLISHED"),
            ),
          )
          .groupBy(topics.examId),
        this.database
          .select({ examId: questions.examId, value: count() })
          .from(questions)
          .where(
            and(
              inArray(questions.examId, examIds),
              eq(questions.status, "PUBLISHED"),
              isNull(questions.deletedAt),
            ),
          )
          .groupBy(questions.examId),
      ]);

    const translationByKey = new Map(
      translationRows.map((row) => [`${row.examId}:${row.locale}`, row]),
    );
    const topicCountByExamId = new Map(
      topicCountRows.map((row) => [row.examId, Number(row.value)]),
    );
    const questionCountByExamId = new Map(
      questionCountRows.map((row) => [row.examId, Number(row.value)]),
    );

    const query = input.query?.trim().toLowerCase();
    const items: PublishedExamListItem[] = [];
    for (const row of examRows) {
      const locale = localeByExamId.get(row.id)!;
      const translation = translationByKey.get(`${row.id}:${locale}`);
      if (!translation) continue;
      if (
        query &&
        !row.code.toLowerCase().includes(query) &&
        !translation.name.toLowerCase().includes(query)
      ) {
        continue;
      }
      items.push({
        id: row.id,
        code: row.code,
        slug: row.slug,
        name: translation.name,
        description: translation.description,
        topicCount: topicCountByExamId.get(row.id) ?? 0,
        publishedQuestionCount: questionCountByExamId.get(row.id) ?? 0,
      });
    }

    const startIndex = input.cursor
      ? items.findIndex((item) => item.id === input.cursor) + 1
      : 0;
    const page = items.slice(startIndex, startIndex + input.limit);
    const nextCursor =
      startIndex + input.limit < items.length
        ? (page.at(-1)?.id ?? null)
        : null;
    return { items: page, nextCursor };
  }

  async getPublishedExamDetail(
    input: Parameters<DiscoveryRepository["getPublishedExamDetail"]>[0],
  ): Promise<PublishedExamDetail | null> {
    const examRow = (
      await this.database
        .select({
          id: exams.id,
          code: exams.code,
          slug: exams.slug,
          primaryLocale: exams.primaryLocale,
          enabledLocales: exams.enabledLocales,
        })
        .from(exams)
        .where(and(eq(exams.slug, input.slug), eq(exams.status, "PUBLISHED")))
        .limit(1)
    )[0];
    if (!examRow) return null;

    const locale = effectiveLocale(
      input.locale,
      examRow.primaryLocale,
      examRow.enabledLocales,
    );
    const localeFallback = locale !== input.locale;

    const examTranslation = (
      await this.database
        .select({
          name: examTranslations.name,
          description: examTranslations.description,
        })
        .from(examTranslations)
        .where(
          and(
            eq(examTranslations.examId, examRow.id),
            eq(examTranslations.locale, locale),
          ),
        )
        .limit(1)
    )[0];
    if (!examTranslation) return null;

    const [topicRows, questionCountRows, testRows] = await Promise.all([
      this.database
        .select({
          id: topics.id,
          slug: topics.slug,
          displayOrder: topics.displayOrder,
          name: topicTranslations.name,
          description: topicTranslations.description,
        })
        .from(topics)
        .innerJoin(
          topicTranslations,
          and(
            eq(topicTranslations.topicId, topics.id),
            eq(topicTranslations.locale, locale),
          ),
        )
        .where(
          and(eq(topics.examId, examRow.id), eq(topics.status, "PUBLISHED")),
        )
        .orderBy(asc(topics.displayOrder)),
      this.database
        .select({ topicId: questions.topicId, value: count() })
        .from(questions)
        .where(
          and(
            eq(questions.examId, examRow.id),
            eq(questions.status, "PUBLISHED"),
            isNull(questions.deletedAt),
          ),
        )
        .groupBy(questions.topicId),
      this.database
        .select({
          id: quizTests.id,
          type: quizTests.type,
          questionCount: quizTests.questionCount,
          durationMinutes: quizTests.durationMinutes,
          passingScorePercent: quizTests.passingScorePercent,
          name: testTranslations.name,
          description: testTranslations.description,
        })
        .from(quizTests)
        .innerJoin(
          testTranslations,
          and(
            eq(testTranslations.testId, quizTests.id),
            eq(testTranslations.locale, locale),
          ),
        )
        .where(
          and(
            eq(quizTests.examId, examRow.id),
            eq(quizTests.status, "PUBLISHED"),
          ),
        ),
    ]);

    const questionCountByTopicId = new Map(
      questionCountRows.map((row) => [row.topicId, Number(row.value)]),
    );
    const topicSummaries: PublishedTopicSummary[] = topicRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      publishedQuestionCount: questionCountByTopicId.get(row.id) ?? 0,
    }));
    const testSummaries: PublishedTestSummary[] = testRows.map((row) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      questionCount: row.questionCount,
      durationMinutes: row.durationMinutes,
      passingScorePercent: Number(row.passingScorePercent),
    }));
    const publishedQuestionCount = [...questionCountByTopicId.values()].reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      id: examRow.id,
      code: examRow.code,
      slug: examRow.slug,
      name: examTranslation.name,
      description: examTranslation.description,
      topicCount: topicSummaries.length,
      publishedQuestionCount,
      locale,
      localeFallback,
      topics: topicSummaries,
      tests: testSummaries,
    };
  }
}
