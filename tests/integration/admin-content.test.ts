import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { SaveQuestionInput } from "@/domain/admin/content";
import * as schema from "@/server/db/schema";
import { DrizzleAdminContentRepository } from "@/server/repositories/drizzle-admin-content-repository";
import { AdminContentService } from "@/server/services/admin-content-service";

const client = new PGlite();
const database = drizzle(client, { schema });
const service = new AdminContentService(
  new DrizzleAdminContentRepository(database),
);

const adminId = "40000000-0000-4000-8000-000000000001";

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
  await database.insert(schema.users).values({
    id: adminId,
    email: "content-admin@example.com",
    displayName: "Content Admin",
    passwordHash: "not-a-real-password-hash",
    role: "ADMIN",
    emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
  });
});

afterAll(async () => {
  await client.close();
});

function questionInput(
  overrides: Partial<SaveQuestionInput> = {},
): SaveQuestionInput {
  return {
    id: undefined,
    externalId: null,
    examId: "",
    topicId: "",
    type: "SINGLE_CHOICE",
    status: "PUBLISHED",
    translations: [
      { locale: "vi", content: "Câu hỏi mẫu?", explanation: "Giải thích mẫu." },
    ],
    options: [
      {
        label: "A",
        isCorrect: true,
        displayOrder: 0,
        translations: [{ locale: "vi", content: "Lựa chọn A" }],
      },
      {
        label: "B",
        isCorrect: false,
        displayOrder: 1,
        translations: [{ locale: "vi", content: "Lựa chọn B" }],
      },
    ],
    ...overrides,
  };
}

describe("admin content authoring and publishing", () => {
  it("blocks exam publication until a published topic and question exist", async () => {
    const examId = await service.saveExam(
      {
        id: undefined,
        code: "adm-001",
        slug: "adm-001",
        primaryLocale: "vi",
        status: "DRAFT",
        translations: [
          { locale: "vi", name: "Kỳ thi ADM", description: "Mô tả kỳ thi." },
        ],
      },
      adminId,
    );

    await expect(
      service.saveExam(
        {
          id: examId,
          code: "ADM-001",
          slug: "adm-001",
          primaryLocale: "vi",
          status: "PUBLISHED",
          translations: [
            { locale: "vi", name: "Kỳ thi ADM", description: "Mô tả kỳ thi." },
          ],
        },
        adminId,
      ),
    ).rejects.toMatchObject({ code: "PUBLISH_NOT_READY" });

    const topicId = await service.saveTopic(
      {
        id: undefined,
        examId,
        slug: "topic-a",
        displayOrder: 0,
        status: "PUBLISHED",
        translations: [
          { locale: "vi", name: "Chủ đề A", description: "Mô tả chủ đề A." },
        ],
      },
      adminId,
    );

    await expect(
      service.saveExam(
        {
          id: examId,
          code: "ADM-001",
          slug: "adm-001",
          primaryLocale: "vi",
          status: "PUBLISHED",
          translations: [
            { locale: "vi", name: "Kỳ thi ADM", description: "Mô tả kỳ thi." },
          ],
        },
        adminId,
      ),
    ).rejects.toMatchObject({ code: "PUBLISH_NOT_READY" });

    const questionId = await service.saveQuestion(
      questionInput({ examId, topicId }),
      adminId,
    );
    expect(questionId).toBeTruthy();

    await expect(
      service.saveExam(
        {
          id: examId,
          code: "ADM-001",
          slug: "adm-001",
          primaryLocale: "vi",
          status: "PUBLISHED",
          translations: [
            { locale: "vi", name: "Kỳ thi ADM", description: "Mô tả kỳ thi." },
          ],
        },
        adminId,
      ),
    ).resolves.toBe(examId);

    const workspace = await service.getWorkspace();
    const exam = workspace.exams.find((item) => item.id === examId);
    expect(exam?.status).toBe("PUBLISHED");
  });

  it("rejects invalid single/multiple-choice correctness before touching the database", async () => {
    await expect(
      service.saveQuestion(
        questionInput({
          examId: "00000000-0000-4000-8000-000000000000",
          topicId: "00000000-0000-4000-8000-000000000000",
          type: "SINGLE_CHOICE",
          options: [
            {
              label: "A",
              isCorrect: true,
              displayOrder: 0,
              translations: [{ locale: "vi", content: "A" }],
            },
            {
              label: "B",
              isCorrect: true,
              displayOrder: 1,
              translations: [{ locale: "vi", content: "B" }],
            },
          ],
        }),
        adminId,
      ),
    ).rejects.toMatchObject({ code: "INVALID_STRUCTURE" });

    await expect(
      service.saveQuestion(
        questionInput({
          examId: "00000000-0000-4000-8000-000000000000",
          topicId: "00000000-0000-4000-8000-000000000000",
          type: "MULTIPLE_CHOICE",
          options: [
            {
              label: "A",
              isCorrect: true,
              displayOrder: 0,
              translations: [{ locale: "vi", content: "A" }],
            },
            {
              label: "B",
              isCorrect: false,
              displayOrder: 1,
              translations: [{ locale: "vi", content: "B" }],
            },
          ],
        }),
        adminId,
      ),
    ).rejects.toMatchObject({ code: "INVALID_STRUCTURE" });
  });

  it("rejects a question whose topic belongs to a different exam", async () => {
    const examA = await service.saveExam(
      {
        id: undefined,
        code: "adm-mismatch-a",
        slug: "adm-mismatch-a",
        primaryLocale: "vi",
        status: "DRAFT",
        translations: [
          { locale: "vi", name: "Exam A", description: "Mô tả A." },
        ],
      },
      adminId,
    );
    const examB = await service.saveExam(
      {
        id: undefined,
        code: "adm-mismatch-b",
        slug: "adm-mismatch-b",
        primaryLocale: "vi",
        status: "DRAFT",
        translations: [
          { locale: "vi", name: "Exam B", description: "Mô tả B." },
        ],
      },
      adminId,
    );
    const topicOfA = await service.saveTopic(
      {
        id: undefined,
        examId: examA,
        slug: "topic-of-a",
        displayOrder: 0,
        status: "DRAFT",
        translations: [
          { locale: "vi", name: "Chủ đề A", description: "Mô tả." },
        ],
      },
      adminId,
    );

    await expect(
      service.saveQuestion(
        questionInput({ examId: examB, topicId: topicOfA, status: "DRAFT" }),
        adminId,
      ),
    ).rejects.toMatchObject({ code: "INVALID_STRUCTURE" });
  });

  it("soft-deletes a question and blocks further edits", async () => {
    const examId = await service.saveExam(
      {
        id: undefined,
        code: "adm-delete",
        slug: "adm-delete",
        primaryLocale: "vi",
        status: "DRAFT",
        translations: [
          { locale: "vi", name: "Xóa mềm", description: "Mô tả." },
        ],
      },
      adminId,
    );
    const topicId = await service.saveTopic(
      {
        id: undefined,
        examId,
        slug: "topic-delete",
        displayOrder: 0,
        status: "DRAFT",
        translations: [{ locale: "vi", name: "Chủ đề", description: "Mô tả." }],
      },
      adminId,
    );
    const questionId = await service.saveQuestion(
      questionInput({ examId, topicId, status: "DRAFT" }),
      adminId,
    );

    await service.deleteQuestion(questionId, adminId);

    const workspace = await service.getWorkspace();
    const question = workspace.questions.find((item) => item.id === questionId);
    expect(question?.status).toBe("ARCHIVED");
    expect(question?.deletedAt).not.toBeNull();

    await expect(
      service.saveQuestion(
        questionInput({ id: questionId, examId, topicId, status: "DRAFT" }),
        adminId,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("records redacted audit metadata without question content or answers", async () => {
    const examId = await service.saveExam(
      {
        id: undefined,
        code: "adm-audit",
        slug: "adm-audit",
        primaryLocale: "vi",
        status: "DRAFT",
        translations: [{ locale: "vi", name: "Audit", description: "Mô tả." }],
      },
      adminId,
    );
    const topicId = await service.saveTopic(
      {
        id: undefined,
        examId,
        slug: "topic-audit",
        displayOrder: 0,
        status: "DRAFT",
        translations: [{ locale: "vi", name: "Chủ đề", description: "Mô tả." }],
      },
      adminId,
    );
    const secretContent = "Nội dung câu hỏi bí mật XYZ123";
    const questionId = await service.saveQuestion(
      questionInput({
        examId,
        topicId,
        status: "DRAFT",
        translations: [
          {
            locale: "vi",
            content: secretContent,
            explanation: "Giải thích bí mật",
          },
        ],
      }),
      adminId,
    );

    const auditRows = await database
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.entityId, questionId));

    expect(auditRows.length).toBeGreaterThan(0);
    for (const row of auditRows) {
      const serialized = JSON.stringify(row.metadata);
      expect(serialized).not.toContain(secretContent);
      expect(serialized).not.toContain("isCorrect");
      expect(serialized).not.toContain("explanation");
    }
  });

  it("builds a fixed test from published questions and computes the allocation preview", async () => {
    const examId = await service.saveExam(
      {
        id: undefined,
        code: "adm-fixed",
        slug: "adm-fixed",
        primaryLocale: "vi",
        status: "DRAFT",
        translations: [
          { locale: "vi", name: "Fixed exam", description: "Mô tả." },
        ],
      },
      adminId,
    );
    const topicId = await service.saveTopic(
      {
        id: undefined,
        examId,
        slug: "topic-fixed",
        displayOrder: 0,
        status: "PUBLISHED",
        translations: [{ locale: "vi", name: "Chủ đề", description: "Mô tả." }],
      },
      adminId,
    );
    const questionOne = await service.saveQuestion(
      questionInput({ examId, topicId }),
      adminId,
    );
    const questionTwo = await service.saveQuestion(
      questionInput({
        examId,
        topicId,
        translations: [
          { locale: "vi", content: "Câu hỏi 2?", explanation: "Giải thích 2." },
        ],
      }),
      adminId,
    );

    const { id: testId, preview } = await service.saveTest(
      {
        id: undefined,
        examId,
        type: "FIXED",
        status: "DRAFT",
        questionCount: 2,
        durationMinutes: 30,
        passingScorePercent: 70,
        shuffleQuestions: false,
        shuffleOptions: false,
        translations: [
          { locale: "vi", name: "Đề cố định", description: "Mô tả." },
        ],
        fixedQuestions: [
          { questionId: questionOne, displayOrder: 0 },
          { questionId: questionTwo, displayOrder: 1 },
        ],
        dynamicRules: [],
      },
      adminId,
    );

    expect(testId).toBeTruthy();
    expect(preview).toEqual([
      { topicId, percentage: 100, questionCount: 2, availableQuestions: 2 },
    ]);
  });

  it("rejects a dynamic test when the published question bank is insufficient", async () => {
    const examId = await service.saveExam(
      {
        id: undefined,
        code: "adm-dynamic",
        slug: "adm-dynamic",
        primaryLocale: "vi",
        status: "DRAFT",
        translations: [
          { locale: "vi", name: "Dynamic exam", description: "Mô tả." },
        ],
      },
      adminId,
    );
    const topicId = await service.saveTopic(
      {
        id: undefined,
        examId,
        slug: "topic-dynamic",
        displayOrder: 0,
        status: "PUBLISHED",
        translations: [{ locale: "vi", name: "Chủ đề", description: "Mô tả." }],
      },
      adminId,
    );
    await service.saveQuestion(questionInput({ examId, topicId }), adminId);

    await expect(
      service.saveTest(
        {
          id: undefined,
          examId,
          type: "DYNAMIC",
          status: "DRAFT",
          questionCount: 5,
          durationMinutes: null,
          passingScorePercent: 70,
          shuffleQuestions: true,
          shuffleOptions: true,
          translations: [
            { locale: "vi", name: "Đề sinh động", description: "Mô tả." },
          ],
          fixedQuestions: [],
          dynamicRules: [{ topicId, percentage: 100 }],
        },
        adminId,
      ),
    ).rejects.toMatchObject({ code: "PUBLISH_NOT_READY" });
  });

  it("rejects a duplicate exam code as a conflict", async () => {
    await service.saveExam(
      {
        id: undefined,
        code: "adm-dup",
        slug: "adm-dup",
        primaryLocale: "vi",
        status: "DRAFT",
        translations: [{ locale: "vi", name: "Dup", description: "Mô tả." }],
      },
      adminId,
    );

    await expect(
      service.saveExam(
        {
          id: undefined,
          code: "adm-dup",
          slug: "adm-dup-2",
          primaryLocale: "vi",
          status: "DRAFT",
          translations: [
            { locale: "vi", name: "Dup 2", description: "Mô tả." },
          ],
        },
        adminId,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
