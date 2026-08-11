import { and, eq, inArray, isNull } from "drizzle-orm";

import type { ContentStatus } from "@/domain/admin/content";
import {
  buildImportRowInput,
  ImportError,
  type ImportRepository,
  type ImportRowContext,
  type ImportRowOutcome,
  type ImportSummary,
} from "@/domain/import/import";
import {
  parseSpreadsheet,
  type ImportFormat,
} from "@/domain/import/spreadsheet";
import type { Database } from "@/server/db/client";
import {
  auditLogs,
  exams,
  mediaAssets,
  questionMedia,
  questionOptionTranslations,
  questionOptions,
  questionTranslations,
  questions,
  topics,
} from "@/server/db/schema";

function splitIds(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export class DrizzleImportRepository implements ImportRepository {
  constructor(private readonly database: Database) {}

  private async buildOutcomes(
    buffer: Uint8Array,
    format: ImportFormat,
    examId: string,
  ): Promise<ImportRowOutcome[]> {
    const exam = (
      await this.database
        .select({
          id: exams.id,
          primaryLocale: exams.primaryLocale,
          enabledLocales: exams.enabledLocales,
        })
        .from(exams)
        .where(eq(exams.id, examId))
        .limit(1)
    )[0];
    if (!exam) throw new ImportError("NOT_FOUND", 404, "Exam not found");

    const topicRows = await this.database
      .select({ id: topics.id, slug: topics.slug })
      .from(topics)
      .where(eq(topics.examId, examId));
    const topicIdBySlug = new Map(
      topicRows.map((topic) => [topic.slug, topic.id]),
    );

    const parsed = await parseSpreadsheet(buffer, format);
    const rowRecords = parsed.rows.map((row) =>
      Object.fromEntries(
        parsed.headers.map((header, index) => [header, row[index] ?? ""]),
      ),
    );

    const allMediaIds = new Set<string>();
    for (const raw of rowRecords) {
      if (raw.media_ids)
        splitIds(raw.media_ids).forEach((id) => allMediaIds.add(id));
    }
    const readyRows = allMediaIds.size
      ? await this.database
          .select({ id: mediaAssets.id })
          .from(mediaAssets)
          .where(
            and(
              inArray(mediaAssets.id, [...allMediaIds]),
              eq(mediaAssets.status, "READY"),
              isNull(mediaAssets.deletedAt),
            ),
          )
      : [];
    const readyMediaIds = new Set(readyRows.map((row) => row.id));

    const context: ImportRowContext = {
      examId,
      topicIdBySlug,
      requiredLocales: (status: ContentStatus) =>
        status === "PUBLISHED" ? exam.enabledLocales : [exam.primaryLocale],
      readyMediaIds,
    };

    const outcomes = rowRecords.map((raw, index) =>
      buildImportRowInput(raw, index + 2, context),
    );

    const externalIds = outcomes
      .filter(
        (outcome): outcome is Extract<ImportRowOutcome, { status: "VALID" }> =>
          outcome.status === "VALID" && outcome.externalId !== null,
      )
      .map((outcome) => outcome.externalId as string);
    const existingByExternalId = externalIds.length
      ? new Map(
          (
            await this.database
              .select({
                externalId: questions.externalId,
                deletedAt: questions.deletedAt,
              })
              .from(questions)
              .where(
                and(
                  eq(questions.examId, examId),
                  inArray(questions.externalId, externalIds),
                ),
              )
          ).map((row) => [row.externalId as string, row]),
        )
      : new Map();

    return outcomes.map((outcome) => {
      if (outcome.status !== "VALID" || outcome.externalId === null) {
        return outcome;
      }
      const existing = existingByExternalId.get(outcome.externalId);
      if (existing?.deletedAt) {
        return {
          rowNumber: outcome.rowNumber,
          status: "ERROR",
          errors: [
            `A deleted question already exists with external_id "${outcome.externalId}"`,
          ],
        };
      }
      return outcome;
    });
  }

  async previewImport(
    buffer: Uint8Array,
    format: ImportFormat,
    examId: string,
  ): Promise<ImportSummary> {
    const rows = await this.buildOutcomes(buffer, format, examId);
    const validCount = rows.filter((row) => row.status === "VALID").length;
    return {
      totalRows: rows.length,
      validCount,
      errorCount: rows.length - validCount,
      rows,
    };
  }

  async commitImport(
    buffer: Uint8Array,
    format: ImportFormat,
    examId: string,
    actorUserId: string,
    now: Date,
  ): Promise<{ createdCount: number; updatedCount: number }> {
    const rows = await this.buildOutcomes(buffer, format, examId);
    if (rows.length === 0) {
      throw new ImportError(
        "INVALID_STRUCTURE",
        400,
        "The file has no data rows",
      );
    }
    const errorRows = rows.filter((row) => row.status === "ERROR");
    if (errorRows.length > 0) {
      throw new ImportError(
        "INVALID_STRUCTURE",
        400,
        "Import contains invalid rows; nothing was committed",
        errorRows.map((row) => ({
          rowNumber: row.rowNumber,
          errors: row.errors,
        })),
      );
    }

    let createdCount = 0;
    let updatedCount = 0;

    await this.database.transaction(async (tx) => {
      async function upsertOne(
        outcome: Extract<ImportRowOutcome, { status: "VALID" }>,
      ): Promise<boolean> {
        const input = outcome.input;
        const existing = input.externalId
          ? (
              await tx
                .select()
                .from(questions)
                .where(
                  and(
                    eq(questions.examId, input.examId),
                    eq(questions.externalId, input.externalId),
                  ),
                )
                .limit(1)
            )[0]
          : undefined;

        const id = existing
          ? existing.id
          : (
              await tx
                .insert(questions)
                .values({
                  externalId: input.externalId,
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
          await tx
            .update(questions)
            .set({
              topicId: input.topicId,
              type: input.type,
              status: input.status,
              version: existing.version + 1,
              updatedBy: actorUserId,
              updatedAt: now,
            })
            .where(eq(questions.id, id));
          await tx
            .delete(questionTranslations)
            .where(eq(questionTranslations.questionId, id));
          await tx
            .delete(questionOptions)
            .where(eq(questionOptions.questionId, id));
          await tx
            .delete(questionMedia)
            .where(eq(questionMedia.questionId, id));
        }

        await tx.insert(questionTranslations).values(
          input.translations.map((translation) => ({
            questionId: id,
            ...translation,
            createdAt: now,
            updatedAt: now,
          })),
        );

        for (const option of input.options) {
          const optionId = (
            await tx
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
          await tx.insert(questionOptionTranslations).values(
            option.translations.map((translation) => ({
              optionId,
              ...translation,
              createdAt: now,
              updatedAt: now,
            })),
          );
        }

        if (input.mediaIds.length > 0) {
          await tx.insert(questionMedia).values(
            input.mediaIds.map((mediaAssetId, displayOrder) => ({
              questionId: id,
              mediaAssetId,
              displayOrder,
              createdAt: now,
              updatedAt: now,
            })),
          );
        }

        await tx.insert(auditLogs).values({
          actorUserId,
          action: existing
            ? "CONTENT_QUESTION_UPDATED"
            : "CONTENT_QUESTION_CREATED",
          entityType: "QUESTION",
          entityId: id,
          metadata: {
            examId: input.examId,
            topicId: input.topicId,
            importBatch: true,
            rowNumber: outcome.rowNumber,
          },
          createdAt: now,
        });

        return !existing;
      }

      for (const outcome of rows) {
        if (outcome.status !== "VALID") continue;
        const created = await upsertOne(outcome);
        if (created) createdCount += 1;
        else updatedCount += 1;
      }
    });
    return { createdCount, updatedCount };
  }

  async exportQuestions(examId: string): Promise<string[][]> {
    const rows = await this.database
      .select({
        externalId: questions.externalId,
        topicSlug: topics.slug,
        type: questions.type,
        status: questions.status,
        questionId: questions.id,
      })
      .from(questions)
      .innerJoin(topics, eq(topics.id, questions.topicId))
      .where(and(eq(questions.examId, examId), isNull(questions.deletedAt)));

    const questionIds = rows.map((row) => row.questionId);
    if (questionIds.length === 0) return [];

    const [translationRows, optionRows, optionTranslationRows, mediaRows] =
      await Promise.all([
        this.database
          .select()
          .from(questionTranslations)
          .where(inArray(questionTranslations.questionId, questionIds)),
        this.database
          .select()
          .from(questionOptions)
          .where(inArray(questionOptions.questionId, questionIds)),
        this.database
          .select({
            optionId: questionOptionTranslations.optionId,
            locale: questionOptionTranslations.locale,
            content: questionOptionTranslations.content,
            questionId: questionOptions.questionId,
          })
          .from(questionOptionTranslations)
          .innerJoin(
            questionOptions,
            eq(questionOptions.id, questionOptionTranslations.optionId),
          )
          .where(inArray(questionOptions.questionId, questionIds)),
        this.database
          .select({
            questionId: questionMedia.questionId,
            mediaAssetId: questionMedia.mediaAssetId,
            displayOrder: questionMedia.displayOrder,
          })
          .from(questionMedia)
          .where(inArray(questionMedia.questionId, questionIds))
          .orderBy(questionMedia.displayOrder),
      ]);

    const csvRows: string[][] = [];
    for (const row of rows) {
      const translations = translationRows.filter(
        (translation) => translation.questionId === row.questionId,
      );
      const vi = translations.find(
        (translation) => translation.locale === "vi",
      );
      const en = translations.find(
        (translation) => translation.locale === "en",
      );
      const options = optionRows
        .filter((option) => option.questionId === row.questionId)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .slice(0, 8);
      const mediaIds = mediaRows
        .filter((media) => media.questionId === row.questionId)
        .map((media) => media.mediaAssetId)
        .join(";");

      const optionColumns = Array.from({ length: 8 }, (_, index) => {
        const option = options[index];
        if (!option) return ["", "", "", ""];
        const optionTranslations = optionTranslationRows.filter(
          (translation) => translation.optionId === option.id,
        );
        const optionVi = optionTranslations.find((t) => t.locale === "vi");
        const optionEn = optionTranslations.find((t) => t.locale === "en");
        return [
          option.label,
          optionVi?.content ?? "",
          optionEn?.content ?? "",
          option.isCorrect ? "TRUE" : "FALSE",
        ];
      }).flat();

      csvRows.push([
        row.externalId ?? "",
        row.topicSlug,
        row.type,
        row.status,
        vi?.content ?? "",
        vi?.explanation ?? "",
        en?.content ?? "",
        en?.explanation ?? "",
        mediaIds,
        ...optionColumns,
      ]);
    }
    return csvRows;
  }
}
