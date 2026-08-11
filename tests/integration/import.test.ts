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

function csvRow(overrides: Record<string, string> = {}): Record<string, string> {
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
    ...rows.map((row) => IMPORT_TEMPLATE_HEADERS.map((header) => row[header] ?? "")),
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
  await database
    .insert(schema.topics)
    .values([
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

  it("flags a row referencing an unknown topic slug without touching the others", async () => {
    const buffer = toCsvBuffer([csvRow(), csvRow({ topic_slug: "unknown-topic" })]);
    const summary = await repository.previewImport(buffer, "CSV", examId);
    expect(summary.validCount).toBe(1);
    expect(summary.errorCount).toBe(1);
    expect(summary.rows[1]?.status).toBe("ERROR");
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
    ).rejects.toSatisfy((error) => isImportError(error) && error.code === "NOT_FOUND");
  });
});

describe("import commit", () => {
  it("atomically creates every valid row", async () => {
    const before = await questionCount();
    const buffer = toCsvBuffer([
      csvRow({ external_id: "ATOMIC-1" }),
      csvRow({ external_id: "ATOMIC-2", topic_slug: "geometry" }),
    ]);
    const result = await repository.commitImport(buffer, "CSV", examId, adminId, new Date());
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
      repository.commitImport(toCsvBuffer([]), "CSV", examId, adminId, new Date()),
    ).rejects.toSatisfy(
      (error) => isImportError(error) && error.code === "INVALID_STRUCTURE",
    );
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
