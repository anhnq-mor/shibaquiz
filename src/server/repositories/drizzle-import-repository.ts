import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import type { ContentStatus } from "@/domain/admin/content";
import {
  buildImportRowInput,
  ImportError,
  isImportError,
  type ImportJobDto,
  type ImportJobLogDto,
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
  importJobLogs,
  importJobRows,
  importJobs,
  mediaAssets,
  questionMedia,
  questionOptionTranslations,
  questionOptions,
  questionTranslations,
  questions,
  topics,
} from "@/server/db/schema";

type StagedImportRow = typeof importJobRows.$inferSelect;
type MutableExecutor = Pick<Database, "select" | "insert" | "update" | "delete">;

export const IMPORT_COMMIT_CHUNK_SIZE = 50;

function toIso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function mapJobLog(row: typeof importJobLogs.$inferSelect): ImportJobLogDto {
  return {
    id: row.id,
    level: row.level === "ERROR" ? "ERROR" : "INFO",
    event: row.event,
    message: row.message,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

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
          externalId: outcome.externalId,
          errors: [
            `A deleted question already exists with external_id "${outcome.externalId}"`,
          ],
        };
      }
      return outcome;
    });
  }

  private async attachLogs(
    jobRows: Array<typeof importJobs.$inferSelect>,
  ): Promise<ImportJobDto[]> {
    if (jobRows.length === 0) return [];
    const logs = await this.database
      .select()
      .from(importJobLogs)
      .where(
        inArray(
          importJobLogs.jobId,
          jobRows.map((job) => job.id),
        ),
      )
      .orderBy(asc(importJobLogs.createdAt));
    const logsByJob = new Map<string, ImportJobLogDto[]>();
    for (const log of logs) {
      const current = logsByJob.get(log.jobId) ?? [];
      current.push(mapJobLog(log));
      logsByJob.set(log.jobId, current);
    }
    return jobRows.map((job) => ({
      id: job.id,
      fileName: job.fileName,
      examId: job.examId,
      mode: job.mode,
      status: job.status,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      createdCount: job.createdCount,
      updatedCount: job.updatedCount,
      attemptCount: job.attemptCount,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      startedAt: toIso(job.startedAt),
      completedAt: toIso(job.completedAt),
      logs: logsByJob.get(job.id) ?? [],
    }));
  }

  private async commitChunk(
    tx: MutableExecutor,
    examId: string,
    actorUserId: string,
    now: Date,
    chunkRows: StagedImportRow[],
  ): Promise<{ created: number; updated: number }> {
    const externalIds = chunkRows
      .map((row) => row.externalId)
      .filter((id): id is string => id !== null);
    const existingByExternalId = externalIds.length
      ? new Map(
          (
            await tx
              .select({
                id: questions.id,
                externalId: questions.externalId,
                version: questions.version,
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
      : new Map<string, { id: string; externalId: string | null; version: number }>();

    const prepared = chunkRows.map((row) => {
      const existing = row.externalId
        ? existingByExternalId.get(row.externalId)
        : undefined;
      return {
        row,
        questionId: existing ? existing.id : randomUUID(),
        isCreate: !existing,
        version: existing ? existing.version + 1 : 1,
      };
    });

    const toCreate = prepared.filter((item) => item.isCreate);
    const toUpdate = prepared.filter((item) => !item.isCreate);

    if (toCreate.length > 0) {
      await tx.insert(questions).values(
        toCreate.map((item) => ({
          id: item.questionId,
          externalId: item.row.externalId,
          examId,
          topicId: item.row.payload.topicId,
          type: item.row.payload.type,
          status: item.row.payload.status,
          version: 1,
          createdBy: actorUserId,
          updatedBy: actorUserId,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    for (const item of toUpdate) {
      await tx
        .update(questions)
        .set({
          topicId: item.row.payload.topicId,
          type: item.row.payload.type,
          status: item.row.payload.status,
          version: item.version,
          updatedBy: actorUserId,
          updatedAt: now,
        })
        .where(eq(questions.id, item.questionId));
    }

    if (toUpdate.length > 0) {
      const updateIds = toUpdate.map((item) => item.questionId);
      await tx
        .delete(questionTranslations)
        .where(inArray(questionTranslations.questionId, updateIds));
      await tx
        .delete(questionOptions)
        .where(inArray(questionOptions.questionId, updateIds));
      await tx
        .delete(questionMedia)
        .where(inArray(questionMedia.questionId, updateIds));
    }

    const translationRows = prepared.flatMap((item) =>
      item.row.payload.translations.map((translation) => ({
        questionId: item.questionId,
        ...translation,
        createdAt: now,
        updatedAt: now,
      })),
    );
    if (translationRows.length > 0) {
      await tx.insert(questionTranslations).values(translationRows);
    }

    const optionRows: Array<{
      id: string;
      questionId: string;
      label: string;
      isCorrect: boolean;
      displayOrder: number;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    const optionTranslationRows: Array<{
      optionId: string;
      locale: "vi" | "en";
      content: string;
      matchTargetContent: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    for (const item of prepared) {
      for (const option of item.row.payload.options) {
        const optionId = randomUUID();
        optionRows.push({
          id: optionId,
          questionId: item.questionId,
          label: option.label,
          isCorrect: option.isCorrect,
          displayOrder: option.displayOrder,
          createdAt: now,
          updatedAt: now,
        });
        for (const translation of option.translations) {
          optionTranslationRows.push({
            optionId,
            locale: translation.locale,
            content: translation.content,
            matchTargetContent: translation.matchContent ?? null,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
    if (optionRows.length > 0) {
      await tx.insert(questionOptions).values(optionRows);
    }
    if (optionTranslationRows.length > 0) {
      await tx.insert(questionOptionTranslations).values(optionTranslationRows);
    }

    const mediaRows = prepared.flatMap((item) =>
      item.row.payload.mediaIds.map((mediaAssetId, displayOrder) => ({
        questionId: item.questionId,
        mediaAssetId,
        displayOrder,
        createdAt: now,
        updatedAt: now,
      })),
    );
    if (mediaRows.length > 0) {
      await tx.insert(questionMedia).values(mediaRows);
    }

    const auditRows = prepared.map((item) => ({
      actorUserId,
      action: item.isCreate
        ? "CONTENT_QUESTION_CREATED"
        : "CONTENT_QUESTION_UPDATED",
      entityType: "QUESTION",
      entityId: item.questionId,
      metadata: {
        examId,
        topicId: item.row.payload.topicId,
        importBatch: true,
        rowNumber: item.row.rowNumber,
      },
      createdAt: now,
    }));
    if (auditRows.length > 0) {
      await tx.insert(auditLogs).values(auditRows);
    }

    return { created: toCreate.length, updated: toUpdate.length };
  }

  async enqueueImport(
    buffer: Uint8Array,
    format: ImportFormat,
    examId: string,
    fileName: string,
    actorUserId: string,
    now: Date,
  ): Promise<ImportJobDto> {
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
        "Import contains invalid rows; no job was created",
        errorRows.map((row) => ({
          rowNumber: row.rowNumber,
          externalId: row.externalId,
          errors: row.errors,
        })),
      );
    }
    const validRows = rows.filter(
      (row): row is Extract<ImportRowOutcome, { status: "VALID" }> =>
        row.status === "VALID",
    );
    const jobId = await this.database.transaction(async (tx) => {
      const job = (
        await tx
          .insert(importJobs)
          .values({
            examId,
            fileName: fileName.slice(0, 255),
            mode: "UPSERT_BY_EXTERNAL_ID",
            status: "VALIDATED",
            createdBy: actorUserId,
            totalRows: validRows.length,
            summary: {
              totalRows: validRows.length,
              validCount: validRows.length,
              errorCount: 0,
            },
            createdAt: now,
            updatedAt: now,
          })
          .returning()
      )[0]!;
      await tx.insert(importJobRows).values(
        validRows.map((row) => ({
          jobId: job.id,
          rowNumber: row.rowNumber,
          externalId: row.externalId,
          payload: row.input,
          createdAt: now,
        })),
      );
      await tx.insert(importJobLogs).values({
        jobId: job.id,
        level: "INFO",
        event: "QUEUED",
        message: "Import job queued after validation.",
        metadata: { totalRows: validRows.length },
        createdAt: now,
      });
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "IMPORT_JOB_QUEUED",
        entityType: "IMPORT_JOB",
        entityId: job.id,
        metadata: { examId, totalRows: validRows.length },
        createdAt: now,
      });
      return job.id;
    });
    return (await this.getJob(jobId))!;
  }

  async listJobs(limit: number): Promise<ImportJobDto[]> {
    const rows = await this.database
      .select()
      .from(importJobs)
      .orderBy(desc(importJobs.createdAt))
      .limit(Math.min(Math.max(limit, 1), 100));
    return this.attachLogs(rows);
  }

  async getJob(jobId: string): Promise<ImportJobDto | null> {
    const row = (
      await this.database
        .select()
        .from(importJobs)
        .where(eq(importJobs.id, jobId))
        .limit(1)
    )[0];
    if (!row) return null;
    return (await this.attachLogs([row]))[0]!;
  }

  async processJob(jobId: string, now: Date): Promise<ImportJobDto | null> {
    const claimed = (
      await this.database
        .update(importJobs)
        .set({
          status: "COMMITTING",
          startedAt: now,
          completedAt: null,
          lockedAt: now,
          errorMessage: null,
          errorReport: {},
          attemptCount: sql`${importJobs.attemptCount} + 1`,
          updatedAt: now,
        })
        .where(
          and(eq(importJobs.id, jobId), eq(importJobs.status, "VALIDATED")),
        )
        .returning()
    )[0];
    if (!claimed) return this.getJob(jobId);

    await this.database.insert(importJobLogs).values({
      jobId,
      level: "INFO",
      event: "STARTED",
      message: "Worker started the import transaction.",
      metadata: { attempt: claimed.attemptCount },
      createdAt: now,
    });

    try {
      if (!claimed.examId) {
        throw new ImportError("CONFLICT", 409, "Import job has no exam");
      }
      const examId = claimed.examId;

      let processed = claimed.processedRows;
      let createdCount = claimed.createdCount;
      let updatedCount = claimed.updatedCount;

      while (true) {
        const chunkRows = await this.database
          .select()
          .from(importJobRows)
          .where(eq(importJobRows.jobId, jobId))
          .orderBy(asc(importJobRows.rowNumber))
          .limit(IMPORT_COMMIT_CHUNK_SIZE)
          .offset(processed);

        if (chunkRows.length === 0) break;

        await this.database.transaction(async (tx) => {
          const result = await this.commitChunk(
            tx,
            examId,
            claimed.createdBy,
            now,
            chunkRows,
          );
          processed += chunkRows.length;
          createdCount += result.created;
          updatedCount += result.updated;
          await tx
            .update(importJobs)
            .set({ processedRows: processed, createdCount, updatedCount, updatedAt: now })
            .where(eq(importJobs.id, jobId));
        });

        const current = (
          await this.database
            .select({ status: importJobs.status })
            .from(importJobs)
            .where(eq(importJobs.id, jobId))
            .limit(1)
        )[0];
        if (current?.status === "CANCELLING") {
          const cancelledAt = now;
          await this.database.transaction(async (tx) => {
            await tx
              .update(importJobs)
              .set({
                status: "CANCELLED",
                lockedAt: null,
                completedAt: cancelledAt,
                updatedAt: cancelledAt,
              })
              .where(eq(importJobs.id, jobId));
            await tx.insert(importJobLogs).values({
              jobId,
              level: "INFO",
              event: "CANCELLED",
              message:
                "Import job was cancelled; rows committed before cancellation were kept.",
              metadata: { processedRows: processed, createdCount, updatedCount },
              createdAt: cancelledAt,
            });
            await tx.insert(auditLogs).values({
              actorUserId: claimed.createdBy,
              action: "IMPORT_JOB_CANCELLED",
              entityType: "IMPORT_JOB",
              entityId: jobId,
              metadata: { examId, processedRows: processed },
              createdAt: cancelledAt,
            });
          });
          return this.getJob(jobId);
        }
      }

      const completedAt = now;
      await this.database.transaction(async (tx) => {
        await tx
          .update(importJobs)
          .set({
            status: "COMPLETED",
            processedRows: processed,
            createdCount,
            updatedCount,
            errorMessage: null,
            errorReport: {},
            lockedAt: null,
            completedAt,
            summary: {
              totalRows: processed,
              createdCount,
              updatedCount,
              errorCount: 0,
            },
            updatedAt: completedAt,
          })
          .where(eq(importJobs.id, jobId));
        await tx.insert(importJobLogs).values({
          jobId,
          level: "INFO",
          event: "COMPLETED",
          message: "Import transaction completed successfully.",
          metadata: { createdCount, updatedCount },
          createdAt: completedAt,
        });
        await tx.insert(auditLogs).values({
          actorUserId: claimed.createdBy,
          action: "IMPORT_JOB_COMPLETED",
          entityType: "IMPORT_JOB",
          entityId: jobId,
          metadata: { examId, createdCount, updatedCount },
          createdAt: completedAt,
        });
      });
    } catch (error) {
      const failedAt = now;
      const safeMessage =
        "Import failed while committing. Review the source data and retry.";
      await this.database.transaction(async (tx) => {
        await tx
          .update(importJobs)
          .set({
            status: "FAILED",
            errorMessage: safeMessage,
            errorReport: {
              code: isImportError(error) ? error.code : "INTERNAL_ERROR",
            },
            lockedAt: null,
            completedAt: failedAt,
            updatedAt: failedAt,
          })
          .where(eq(importJobs.id, jobId));
        await tx.insert(importJobLogs).values({
          jobId,
          level: "ERROR",
          event: "FAILED",
          message: safeMessage,
          metadata: {
            code: isImportError(error) ? error.code : "INTERNAL_ERROR",
          },
          createdAt: failedAt,
        });
      });
    }
    return this.getJob(jobId);
  }

  async processNextJob(now: Date): Promise<ImportJobDto | null> {
    const leaseExpiredBefore = new Date(now.getTime() - 15 * 60 * 1000);
    const recovered = await this.database
      .update(importJobs)
      .set({
        status: "VALIDATED",
        lockedAt: null,
        errorMessage: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(importJobs.status, "COMMITTING"),
          lt(importJobs.lockedAt, leaseExpiredBefore),
        ),
      )
      .returning();
    if (recovered.length > 0) {
      await this.database.insert(importJobLogs).values(
        recovered.map((job) => ({
          jobId: job.id,
          level: "INFO",
          event: "RECOVERED",
          message: "Expired worker lease was recovered and queued again.",
          metadata: {},
          createdAt: now,
        })),
      );
    }

    // A job stuck CANCELLING (its worker crashed before it noticed the
    // cancellation request) never resumes committing rows — finalize it as
    // CANCELLED rather than queueing it again.
    const cancelledStale = await this.database
      .update(importJobs)
      .set({
        status: "CANCELLED",
        lockedAt: null,
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(importJobs.status, "CANCELLING"),
          lt(importJobs.lockedAt, leaseExpiredBefore),
        ),
      )
      .returning();
    if (cancelledStale.length > 0) {
      await this.database.insert(importJobLogs).values(
        cancelledStale.map((job) => ({
          jobId: job.id,
          level: "INFO",
          event: "CANCELLED",
          message:
            "Expired worker lease was recovered while cancelling; the job was finalized as cancelled.",
          metadata: {},
          createdAt: now,
        })),
      );
    }

    const next = (
      await this.database
        .select({ id: importJobs.id })
        .from(importJobs)
        .where(eq(importJobs.status, "VALIDATED"))
        .orderBy(asc(importJobs.createdAt))
        .limit(1)
    )[0];
    return next ? this.processJob(next.id, now) : null;
  }

  async retryJob(
    jobId: string,
    actorUserId: string,
    now: Date,
  ): Promise<ImportJobDto> {
    const retried = await this.database.transaction(async (tx) => {
      const row = (
        await tx
          .update(importJobs)
          .set({
            status: "VALIDATED",
            // processedRows/createdCount/updatedCount are intentionally left
            // as-is: chunks already committed before the failure must not be
            // reprocessed (that would duplicate their questions). processJob
            // resumes from these counters as an offset.
            errorMessage: null,
            errorReport: {},
            startedAt: null,
            completedAt: null,
            lockedAt: null,
            updatedAt: now,
          })
          .where(and(eq(importJobs.id, jobId), eq(importJobs.status, "FAILED")))
          .returning()
      )[0];
      if (!row) {
        throw new ImportError(
          "CONFLICT",
          409,
          "Only failed jobs can be retried",
        );
      }
      await tx.insert(importJobLogs).values({
        jobId,
        level: "INFO",
        event: "RETRIED",
        message: "Administrator queued the failed job for retry.",
        metadata: { resumeFromRow: row.processedRows },
        createdAt: now,
      });
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "IMPORT_JOB_RETRIED",
        entityType: "IMPORT_JOB",
        entityId: jobId,
        metadata: {},
        createdAt: now,
      });
      return row;
    });
    return (await this.getJob(retried.id))!;
  }

  async requestCancel(
    jobId: string,
    actorUserId: string,
    now: Date,
  ): Promise<ImportJobDto> {
    const updated = await this.database.transaction(async (tx) => {
      const cancelledImmediately = (
        await tx
          .update(importJobs)
          .set({
            status: "CANCELLED",
            completedAt: now,
            lockedAt: null,
            updatedAt: now,
          })
          .where(
            and(
              eq(importJobs.id, jobId),
              inArray(importJobs.status, [
                "UPLOADED",
                "VALIDATING",
                "VALIDATED",
              ]),
            ),
          )
          .returning()
      )[0];
      const row =
        cancelledImmediately ??
        (
          await tx
            .update(importJobs)
            .set({ status: "CANCELLING", updatedAt: now })
            .where(
              and(
                eq(importJobs.id, jobId),
                eq(importJobs.status, "COMMITTING"),
              ),
            )
            .returning()
        )[0];
      if (!row) {
        throw new ImportError(
          "CONFLICT",
          409,
          "Only an active import job can be cancelled",
        );
      }
      await tx.insert(importJobLogs).values({
        jobId,
        level: "INFO",
        event: cancelledImmediately ? "CANCELLED" : "CANCELLING",
        message: cancelledImmediately
          ? "Administrator cancelled the job before it started committing."
          : "Administrator requested cancellation; stopping after the current chunk.",
        metadata: {},
        createdAt: now,
      });
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "IMPORT_JOB_CANCEL_REQUESTED",
        entityType: "IMPORT_JOB",
        entityId: jobId,
        metadata: { immediate: Boolean(cancelledImmediately) },
        createdAt: now,
      });
      return row;
    });
    return (await this.getJob(updated.id))!;
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
    jobId?: string,
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
          externalId: row.externalId,
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
              locale: translation.locale,
              content: translation.content,
              matchTargetContent: translation.matchContent ?? null,
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
      if (jobId) {
        await tx
          .update(importJobs)
          .set({
            status: "COMPLETED",
            processedRows: rows.length,
            createdCount,
            updatedCount,
            errorMessage: null,
            errorReport: {},
            lockedAt: null,
            completedAt: now,
            summary: {
              totalRows: rows.length,
              createdCount,
              updatedCount,
              errorCount: 0,
            },
            updatedAt: now,
          })
          .where(eq(importJobs.id, jobId));
        await tx.insert(importJobLogs).values({
          jobId,
          level: "INFO",
          event: "COMPLETED",
          message: "Import transaction completed successfully.",
          metadata: { createdCount, updatedCount },
          createdAt: now,
        });
        await tx.insert(auditLogs).values({
          actorUserId,
          action: "IMPORT_JOB_COMPLETED",
          entityType: "IMPORT_JOB",
          entityId: jobId,
          metadata: { examId, createdCount, updatedCount },
          createdAt: now,
        });
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
            matchTargetContent: questionOptionTranslations.matchTargetContent,
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
        .slice(0, 20);
      const mediaIds = mediaRows
        .filter((media) => media.questionId === row.questionId)
        .map((media) => media.mediaAssetId)
        .join(";");

      const optionColumns = Array.from({ length: 20 }, (_, index) => {
        const option = options[index];
        if (!option) return ["", "", "", "", "", ""];
        const optionTranslations = optionTranslationRows.filter(
          (translation) => translation.optionId === option.id,
        );
        const optionVi = optionTranslations.find((t) => t.locale === "vi");
        const optionEn = optionTranslations.find((t) => t.locale === "en");
        return [
          option.label,
          optionVi?.content ?? "",
          optionEn?.content ?? "",
          optionVi?.matchTargetContent ?? "",
          optionEn?.matchTargetContent ?? "",
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
