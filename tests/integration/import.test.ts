import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { toCsv } from "@/domain/import/csv";
import { IMPORT_TEMPLATE_HEADERS, isImportError } from "@/domain/import/import";
import * as schema from "@/server/db/schema";
import { DrizzleImportRepository } from "@/server/repositories/drizzle-import-repository";

const client = new PGlite();
const database = drizzle(client, { schema });
const repository = new DrizzleImportRepository(database);

const adminId = "60000000-0000-4000-8000-000000000001";
let examId: string;
let readyMediaId: string;

function csvRow(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    external_id: "",
    topic_slug: "algebra",
    type: "SINGLE_CHOICE",
    status: "DRAFT",
    content_vi: "1 + 1 = ?",
    explanation_vi: "Phép cộng cơ bản.",
    content_en: "",
    explanation_en: "",
    media_ids: "",
    option_1_label: "A",
    option_1_content_vi: "2",
    option_1_content_en: "",
    option_1_correct: "TRUE",
    option_2_label: "B",
    option_2_content_vi: "3",
    option_2_content_en: "",
    option_2_correct: "FALSE",
    ...overrides,
  };
}

function toCsvBuffer(rows: Record<string, string>[]): Uint8Array {
  const table = [
    IMPORT_TEMPLATE_HEADERS,
    ...rows.map((row) =>
      IMPORT_TEMPLATE_HEADERS.map((header) => row[header] ?? ""),
    ),
  ];
  return new TextEncoder().encode(toCsv(table));
}

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
  await database.insert(schema.users).values({
    id: adminId,
    email: "import-admin@example.com",
    displayName: "Import Admin",
    passwordHash: "not-a-real-password-hash",
    role: "ADMIN",
    emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
  });
  const [exam] = await database
    .insert(schema.exams)
    .values({ code: "IMPORT-1", slug: "import-1", status: "DRAFT" })
    .returning();
  examId = exam!.id;
  await database.insert(schema.topics).values([
    { examId, slug: "algebra", displayOrder: 0 },
    { examId, slug: "geometry", displayOrder: 1 },
  ]);
  const [media] = await database
    .insert(schema.mediaAssets)
    .values({
      type: "IMAGE",
      status: "READY",
      objectKey: "media/import-test-asset",
      originalFileName: "diagram.png",
      mimeType: "image/png",
      sizeBytes: 100,
      checksum: "irrelevant",
      createdBy: adminId,
    })
    .returning();
  readyMediaId = media!.id;
});

afterAll(async () => {
  await client.close();
});

async function questionCount(): Promise<number> {
  const rows = await database
    .select({ id: schema.questions.id })
    .from(schema.questions)
    .where(eq(schema.questions.examId, examId));
  return rows.length;
}

describe("import preview", () => {
  it("reports all rows as valid when the file is well-formed", async () => {
    const buffer = toCsvBuffer([csvRow(), csvRow({ topic_slug: "geometry" })]);
    const summary = await repository.previewImport(buffer, "CSV", examId);
    expect(summary.totalRows).toBe(2);
    expect(summary.validCount).toBe(2);
    expect(summary.errorCount).toBe(0);
  });

  it("accepts a published row with one language and mirrors it before persistence", async () => {
    const buffer = toCsvBuffer([
      csvRow({
        external_id: "MIRROR-EN-TO-VI",
        status: "PUBLISHED",
        content_vi: "",
        explanation_vi: "",
        content_en: "Imported in English",
        explanation_en: "English explanation",
        option_1_content_vi: "",
        option_1_content_en: "Correct",
        option_2_content_vi: "",
        option_2_content_en: "Incorrect",
      }),
    ]);
    const summary = await repository.previewImport(buffer, "CSV", examId);
    expect(summary.validCount).toBe(1);
    if (summary.rows[0]?.status === "VALID") {
      expect(summary.rows[0].input.translations).toEqual([
        {
          locale: "vi",
          content: "Imported in English",
          explanation: "English explanation",
        },
        {
          locale: "en",
          content: "Imported in English",
          explanation: "English explanation",
        },
      ]);
    }
  });

  it("flags a row referencing an unknown topic slug without touching the others", async () => {
    const buffer = toCsvBuffer([
      csvRow(),
      csvRow({ topic_slug: "unknown-topic" }),
    ]);
    const summary = await repository.previewImport(buffer, "CSV", examId);
    expect(summary.validCount).toBe(1);
    expect(summary.errorCount).toBe(1);
    expect(summary.rows[1]?.status).toBe("ERROR");
  });

  it("reports the CSV row, external ID, and missing option columns", async () => {
    const buffer = toCsvBuffer([
      csvRow({
        external_id: "ROW-DETAIL-1",
        option_1_content_vi: "",
        option_1_content_en: "",
      }),
    ]);
    const summary = await repository.previewImport(buffer, "CSV", examId);

    expect(summary.rows[0]).toEqual({
      rowNumber: 2,
      status: "ERROR",
      externalId: "ROW-DETAIL-1",
      errors: [
        "option_1_content_vi/option_1_content_en: at least one option content value is required",
      ],
    });
  });

  it("accepts a READY media reference and rejects a non-existent one", async () => {
    const buffer = toCsvBuffer([
      csvRow({ media_ids: readyMediaId }),
      csvRow({ media_ids: "70000000-0000-4000-8000-000000000099" }),
    ]);
    const summary = await repository.previewImport(buffer, "CSV", examId);
    expect(summary.rows[0]?.status).toBe("VALID");
    expect(summary.rows[1]?.status).toBe("ERROR");
  });

  it("throws NOT_FOUND for an unknown exam", async () => {
    await expect(
      repository.previewImport(
        toCsvBuffer([csvRow()]),
        "CSV",
        "70000000-0000-4000-8000-000000000000",
      ),
    ).rejects.toSatisfy(
      (error) => isImportError(error) && error.code === "NOT_FOUND",
    );
  });
});

describe("import commit", () => {
  it("persists an empty explanation when the optional columns are blank", async () => {
    const externalId = "NO-EXPLANATION";
    const buffer = toCsvBuffer([
      csvRow({
        external_id: externalId,
        explanation_vi: "",
        explanation_en: "",
      }),
    ]);

    await expect(
      repository.commitImport(buffer, "CSV", examId, adminId, new Date()),
    ).resolves.toEqual({ createdCount: 1, updatedCount: 0 });

    const imported = (
      await database
        .select({ id: schema.questions.id })
        .from(schema.questions)
        .where(eq(schema.questions.externalId, externalId))
        .limit(1)
    )[0]!;
    const translations = await database
      .select({ explanation: schema.questionTranslations.explanation })
      .from(schema.questionTranslations)
      .where(eq(schema.questionTranslations.questionId, imported.id));
    expect(translations).toEqual([{ explanation: "" }, { explanation: "" }]);
  });

  it("atomically creates every valid row", async () => {
    const before = await questionCount();
    const buffer = toCsvBuffer([
      csvRow({ external_id: "ATOMIC-1" }),
      csvRow({ external_id: "ATOMIC-2", topic_slug: "geometry" }),
    ]);
    const result = await repository.commitImport(
      buffer,
      "CSV",
      examId,
      adminId,
      new Date(),
    );
    expect(result).toEqual({ createdCount: 2, updatedCount: 0 });
    expect(await questionCount()).toBe(before + 2);
  });

  it("rolls back the entire batch when any row is invalid", async () => {
    const before = await questionCount();
    const buffer = toCsvBuffer([
      csvRow({ external_id: "ROLLBACK-1" }),
      csvRow({ external_id: "ROLLBACK-2", topic_slug: "does-not-exist" }),
      csvRow({ external_id: "ROLLBACK-3" }),
    ]);
    await expect(
      repository.commitImport(buffer, "CSV", examId, adminId, new Date()),
    ).rejects.toSatisfy(
      (error) => isImportError(error) && error.code === "INVALID_STRUCTURE",
    );
    expect(await questionCount()).toBe(before);
  });

  it("updates the existing question when external_id matches instead of duplicating it", async () => {
    const createBuffer = toCsvBuffer([
      csvRow({ external_id: "UPSERT-1", content_vi: "Bản đầu tiên?" }),
    ]);
    const created = await repository.commitImport(
      createBuffer,
      "CSV",
      examId,
      adminId,
      new Date(),
    );
    expect(created).toEqual({ createdCount: 1, updatedCount: 0 });
    const countAfterCreate = await questionCount();

    const updateBuffer = toCsvBuffer([
      csvRow({ external_id: "UPSERT-1", content_vi: "Bản đã cập nhật?" }),
    ]);
    const updated = await repository.commitImport(
      updateBuffer,
      "CSV",
      examId,
      adminId,
      new Date(),
    );
    expect(updated).toEqual({ createdCount: 0, updatedCount: 1 });
    expect(await questionCount()).toBe(countAfterCreate);

    const row = (
      await database
        .select()
        .from(schema.questions)
        .where(eq(schema.questions.externalId, "UPSERT-1"))
        .limit(1)
    )[0]!;
    expect(row.version).toBe(2);
    const translation = (
      await database
        .select()
        .from(schema.questionTranslations)
        .where(eq(schema.questionTranslations.questionId, row.id))
    ).find((item) => item.locale === "vi");
    expect(translation?.content).toBe("Bản đã cập nhật?");
  });

  it("rejects committing a file with no data rows", async () => {
    await expect(
      repository.commitImport(
        toCsvBuffer([]),
        "CSV",
        examId,
        adminId,
        new Date(),
      ),
    ).rejects.toSatisfy(
      (error) => isImportError(error) && error.code === "INVALID_STRUCTURE",
    );
  });
});

describe("background import jobs", () => {
  it("stages normalized rows and completes them through a durable job", async () => {
    const job = await repository.enqueueImport(
      toCsvBuffer([csvRow({ external_id: "BACKGROUND-JOB-1" })]),
      "CSV",
      examId,
      "questions.csv",
      adminId,
      new Date("2026-08-11T10:00:00.000Z"),
    );

    expect(job.status).toBe("VALIDATED");
    expect(job.totalRows).toBe(1);
    expect(job.logs.map((log) => log.event)).toContain("QUEUED");

    const completed = await repository.processJob(
      job.id,
      new Date("2026-08-11T10:01:00.000Z"),
    );
    expect(completed).toMatchObject({
      status: "COMPLETED",
      processedRows: 1,
      createdCount: 1,
      updatedCount: 0,
      attemptCount: 1,
    });
    expect(completed?.logs.map((log) => log.event)).toEqual([
      "QUEUED",
      "STARTED",
      "COMPLETED",
    ]);
  });

  it("records a safe failure and lets an admin retry the staged job", async () => {
    const job = await repository.enqueueImport(
      toCsvBuffer([csvRow({ external_id: "BACKGROUND-RETRY-1" })]),
      "CSV",
      examId,
      "retry.csv",
      adminId,
      new Date("2026-08-11T11:00:00.000Z"),
    );
    const [staged] = await database
      .select()
      .from(schema.importJobRows)
      .where(eq(schema.importJobRows.jobId, job.id));
    await database
      .update(schema.importJobRows)
      .set({
        payload: {
          ...staged!.payload,
          topicId: "70000000-0000-4000-8000-000000000099",
        },
      })
      .where(eq(schema.importJobRows.id, staged!.id));

    const failed = await repository.processJob(
      job.id,
      new Date("2026-08-11T11:01:00.000Z"),
    );
    expect(failed?.status).toBe("FAILED");
    expect(failed?.errorMessage).not.toContain("BACKGROUND-RETRY-1");
    expect(failed?.logs.map((log) => log.event)).toContain("FAILED");

    const retried = await repository.retryJob(
      job.id,
      adminId,
      new Date("2026-08-11T11:02:00.000Z"),
    );
    expect(retried.status).toBe("VALIDATED");
    expect(retried.logs.at(-1)?.event).toBe("RETRIED");
  });

  it("recovers an expired worker lease before processing the next job", async () => {
    const job = await repository.enqueueImport(
      toCsvBuffer([csvRow({ external_id: "BACKGROUND-RECOVER-1" })]),
      "CSV",
      examId,
      "recover.csv",
      adminId,
      new Date("2026-08-11T09:00:00.000Z"),
    );
    await database
      .update(schema.importJobs)
      .set({
        status: "COMMITTING",
        lockedAt: new Date("2026-08-11T09:01:00.000Z"),
      })
      .where(eq(schema.importJobs.id, job.id));

    const recovered = await repository.processNextJob(
      new Date("2026-08-11T10:00:00.000Z"),
    );
    expect(recovered?.id).toBe(job.id);
    expect(recovered?.status).toBe("COMPLETED");
    expect(recovered?.logs.map((log) => log.event)).toContain("RECOVERED");
  });
});

describe("export questions", () => {
  it("exports committed questions back into the same column shape used for import", async () => {
    const buffer = toCsvBuffer([
      csvRow({ external_id: "EXPORT-1", content_vi: "Câu hỏi xuất ra?" }),
    ]);
    await repository.commitImport(buffer, "CSV", examId, adminId, new Date());

    const exported = await repository.exportQuestions(examId);
    const row = exported.find((cells) => cells[0] === "EXPORT-1");
    expect(row).toBeDefined();
    expect(row?.[1]).toBe("algebra");
    expect(row?.[4]).toBe("Câu hỏi xuất ra?");
  });

  it("returns an empty list for an exam with no questions", async () => {
    const [emptyExam] = await database
      .insert(schema.exams)
      .values({ code: "IMPORT-EMPTY", slug: "import-empty", status: "DRAFT" })
      .returning();
    expect(await repository.exportQuestions(emptyExam!.id)).toEqual([]);
  });
});
