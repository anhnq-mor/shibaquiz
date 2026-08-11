import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";

import { BcryptPasswordHasher } from "../src/server/auth/password-hasher";
import { loadAuthConfig, loadRuntimeConfig } from "../src/server/config/env";
import {
  createDatabaseConnection,
  type Database,
} from "../src/server/db/client";
import {
  examTranslations,
  exams,
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
  users,
} from "../src/server/db/schema";

/**
 * One-off local/dev fixture generator: two USER logins plus a handful of large,
 * clearly-labelled mock exams for manual screen testing. Not part of `npm run dev`;
 * run explicitly with `npm run db:seed:mock`. Safe to re-run — anything that already
 * exists (by email or exam code) is skipped rather than duplicated.
 */

const QUESTIONS_PER_TOPIC = 40;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

interface MockUserPlan {
  email: string;
  password: string;
  displayName: string;
}

const mockUsers: MockUserPlan[] = [
  {
    email: "user1@shibaquiz.local",
    password: "ShibaUser1234",
    displayName: "Người dùng thử nghiệm 1",
  },
  {
    email: "user2@shibaquiz.local",
    password: "ShibaUser5678",
    displayName: "Người dùng thử nghiệm 2",
  },
];

interface TopicPlan {
  nameVi: string;
  nameEn: string;
  slug: string;
}

interface FixedTestPlan {
  type: "FIXED";
  fixedTopics: Array<{ topicIndex: number; count: number }>;
}

interface DynamicTestPlan {
  type: "DYNAMIC";
  dynamicRules: Array<{ topicIndex: number; percentage: number }>;
}

type TestPlan = (FixedTestPlan | DynamicTestPlan) & {
  nameVi: string;
  nameEn: string;
  questionCount: number;
  durationMinutes: number | null;
  passingScorePercent: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
};

interface ExamPlan {
  code: string;
  slug: string;
  nameVi: string;
  nameEn: string;
  topics: TopicPlan[];
  tests: TestPlan[];
}

const examPlans: ExamPlan[] = [
  {
    code: "MOCK-EXAM-1",
    slug: "mock-exam-1",
    nameVi: "Kỳ thi thử nghiệm 1",
    nameEn: "Mock Exam 1",
    topics: [
      { nameVi: "Toán học", nameEn: "Mathematics", slug: "mock1-math" },
      { nameVi: "Vật lý", nameEn: "Physics", slug: "mock1-physics" },
      { nameVi: "Hóa học", nameEn: "Chemistry", slug: "mock1-chemistry" },
      { nameVi: "Sinh học", nameEn: "Biology", slug: "mock1-biology" },
      { nameVi: "Thiên văn học", nameEn: "Astronomy", slug: "mock1-astronomy" },
    ],
    tests: [
      {
        type: "FIXED",
        nameVi: "Đề luyện Toán học",
        nameEn: "Mathematics practice test",
        questionCount: 20,
        durationMinutes: 15,
        passingScorePercent: 60,
        shuffleQuestions: false,
        shuffleOptions: false,
        fixedTopics: [{ topicIndex: 0, count: 20 }],
      },
      {
        type: "FIXED",
        nameVi: "Đề mix Toán học - Vật lý",
        nameEn: "Mathematics & Physics mix test",
        questionCount: 20,
        durationMinutes: 20,
        passingScorePercent: 60,
        shuffleQuestions: true,
        shuffleOptions: false,
        fixedTopics: [
          { topicIndex: 0, count: 10 },
          { topicIndex: 1, count: 10 },
        ],
      },
      {
        type: "DYNAMIC",
        nameVi: "Đề tổng hợp 5 chủ đề",
        nameEn: "All-topics comprehensive test",
        questionCount: 50,
        durationMinutes: 45,
        passingScorePercent: 65,
        shuffleQuestions: true,
        shuffleOptions: true,
        dynamicRules: [0, 1, 2, 3, 4].map((topicIndex) => ({
          topicIndex,
          percentage: 20,
        })),
      },
      {
        type: "DYNAMIC",
        nameVi: "Đề tổng hợp 3 chủ đề",
        nameEn: "Three-topic mixed test",
        questionCount: 30,
        durationMinutes: 30,
        passingScorePercent: 60,
        shuffleQuestions: false,
        shuffleOptions: true,
        dynamicRules: [
          { topicIndex: 0, percentage: 40 },
          { topicIndex: 1, percentage: 30 },
          { topicIndex: 2, percentage: 30 },
        ],
      },
    ],
  },
  {
    code: "MOCK-EXAM-2",
    slug: "mock-exam-2",
    nameVi: "Kỳ thi thử nghiệm 2",
    nameEn: "Mock Exam 2",
    topics: [
      { nameVi: "Lịch sử", nameEn: "History", slug: "mock2-history" },
      { nameVi: "Địa lý", nameEn: "Geography", slug: "mock2-geography" },
      { nameVi: "Văn học", nameEn: "Literature", slug: "mock2-literature" },
      { nameVi: "Nghệ thuật", nameEn: "Art", slug: "mock2-art" },
      { nameVi: "Âm nhạc", nameEn: "Music", slug: "mock2-music" },
    ],
    tests: [
      {
        type: "FIXED",
        nameVi: "Đề luyện Lịch sử",
        nameEn: "History practice test",
        questionCount: 20,
        durationMinutes: 15,
        passingScorePercent: 60,
        shuffleQuestions: false,
        shuffleOptions: false,
        fixedTopics: [{ topicIndex: 0, count: 20 }],
      },
      {
        type: "FIXED",
        nameVi: "Đề mix Lịch sử - Địa lý",
        nameEn: "History & Geography mix test",
        questionCount: 20,
        durationMinutes: 20,
        passingScorePercent: 60,
        shuffleQuestions: true,
        shuffleOptions: false,
        fixedTopics: [
          { topicIndex: 0, count: 10 },
          { topicIndex: 1, count: 10 },
        ],
      },
      {
        type: "DYNAMIC",
        nameVi: "Đề tổng hợp 5 chủ đề",
        nameEn: "All-topics comprehensive test",
        questionCount: 50,
        durationMinutes: 45,
        passingScorePercent: 65,
        shuffleQuestions: true,
        shuffleOptions: true,
        dynamicRules: [0, 1, 2, 3, 4].map((topicIndex) => ({
          topicIndex,
          percentage: 20,
        })),
      },
      {
        type: "DYNAMIC",
        nameVi: "Đề tổng hợp 3 chủ đề",
        nameEn: "Three-topic mixed test",
        questionCount: 30,
        durationMinutes: 30,
        passingScorePercent: 60,
        shuffleQuestions: false,
        shuffleOptions: true,
        dynamicRules: [
          { topicIndex: 0, percentage: 40 },
          { topicIndex: 1, percentage: 30 },
          { topicIndex: 2, percentage: 30 },
        ],
      },
    ],
  },
];

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function insertBatched<T extends Record<string, unknown>>(
  insert: (batch: T[]) => Promise<unknown>,
  rows: T[],
  batchSize = 500,
): Promise<void> {
  for (const batch of chunk(rows, batchSize)) {
    await insert(batch);
  }
}

async function ensureMockContentAuthor(
  db: Database,
  now: Date,
): Promise<string> {
  const email = "mock-content-author@shibaquiz.local";
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing[0]) return existing[0].id;

  const id = randomUUID();
  await db.insert(users).values({
    id,
    email,
    displayName: "Mock Content Author",
    passwordHash: "mock-content-author-has-no-usable-password",
    role: "ADMIN",
    status: "ACTIVE",
    emailVerifiedAt: now,
  });
  return id;
}

async function seedMockUsers(db: Database, now: Date): Promise<void> {
  const authConfig = loadAuthConfig();
  const passwordHasher = new BcryptPasswordHasher(authConfig.AUTH_BCRYPT_COST);

  for (const plan of mockUsers) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, plan.email))
      .limit(1);
    if (existing[0]) {
      process.stdout.write(`User ${plan.email} already exists, skipping.\n`);
      continue;
    }
    await db.insert(users).values({
      email: plan.email,
      displayName: plan.displayName,
      passwordHash: await passwordHasher.hash(plan.password),
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: now,
      preferredLocale: "vi",
    });
    process.stdout.write(`Created user ${plan.email}.\n`);
  }
}

async function seedExam(
  db: Database,
  plan: ExamPlan,
  authorId: string,
): Promise<void> {
  const existing = await db
    .select({ id: exams.id })
    .from(exams)
    .where(eq(exams.code, plan.code))
    .limit(1);
  if (existing[0]) {
    process.stdout.write(`Exam ${plan.code} already exists, skipping.\n`);
    return;
  }

  await db.transaction(async (tx) => {
    const examId = randomUUID();
    await tx.insert(exams).values({
      id: examId,
      code: plan.code,
      slug: plan.slug,
      primaryLocale: "vi",
      enabledLocales: ["vi", "en"],
      status: "PUBLISHED",
    });
    await tx.insert(examTranslations).values([
      {
        examId,
        locale: "vi",
        name: plan.nameVi,
        description: `Kỳ thi dữ liệu mẫu dùng để kiểm thử giao diện (${plan.nameVi}).`,
      },
      {
        examId,
        locale: "en",
        name: plan.nameEn,
        description: `Mock exam for UI testing (${plan.nameEn}).`,
      },
    ]);

    const topicIds = plan.topics.map(() => randomUUID());
    await tx.insert(topics).values(
      plan.topics.map((topic, index) => ({
        id: topicIds[index]!,
        examId,
        slug: topic.slug,
        displayOrder: index,
        status: "PUBLISHED" as const,
      })),
    );
    await tx.insert(topicTranslations).values(
      plan.topics.flatMap((topic, index) => [
        {
          topicId: topicIds[index]!,
          locale: "vi" as const,
          name: topic.nameVi,
          description: `Chủ đề dữ liệu mẫu: ${topic.nameVi}.`,
        },
        {
          topicId: topicIds[index]!,
          locale: "en" as const,
          name: topic.nameEn,
          description: `Mock topic: ${topic.nameEn}.`,
        },
      ]),
    );

    const questionRows: (typeof questions.$inferInsert)[] = [];
    const questionTranslationRows: (typeof questionTranslations.$inferInsert)[] =
      [];
    const optionRows: (typeof questionOptions.$inferInsert)[] = [];
    const optionTranslationRows: (typeof questionOptionTranslations.$inferInsert)[] =
      [];
    const questionIdsByTopic: string[][] = [];

    plan.topics.forEach((topic, topicIndex) => {
      const topicId = topicIds[topicIndex]!;
      const ids: string[] = [];
      for (let i = 1; i <= QUESTIONS_PER_TOPIC; i += 1) {
        const questionId = randomUUID();
        ids.push(questionId);
        const isMultiple = i % 5 === 0;
        questionRows.push({
          id: questionId,
          examId,
          topicId,
          type: isMultiple ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE",
          status: "PUBLISHED",
          version: 1,
          createdBy: authorId,
          updatedBy: authorId,
        });
        questionTranslationRows.push(
          {
            questionId,
            locale: "vi",
            content: `[Dữ liệu mẫu] ${topic.nameVi} — câu ${i}`,
            explanation:
              "Đây là câu hỏi dữ liệu mẫu dùng để kiểm thử giao diện; nội dung không mang ý nghĩa thực tế.",
          },
          {
            questionId,
            locale: "en",
            content: `[Mock data] ${topic.nameEn} — question ${i}`,
            explanation:
              "This is mock question data for UI testing; the content has no real meaning.",
          },
        );

        const correctIndices = isMultiple ? [i % 4, (i + 1) % 4] : [i % 4];
        OPTION_LABELS.forEach((label, optionIndex) => {
          const optionId = randomUUID();
          optionRows.push({
            id: optionId,
            questionId,
            label,
            isCorrect: correctIndices.includes(optionIndex),
            displayOrder: optionIndex,
          });
          optionTranslationRows.push(
            { optionId, locale: "vi", content: `Lựa chọn ${label}` },
            { optionId, locale: "en", content: `Option ${label}` },
          );
        });
      }
      questionIdsByTopic.push(ids);
    });

    await insertBatched(
      (batch) => tx.insert(questions).values(batch),
      questionRows,
    );
    await insertBatched(
      (batch) => tx.insert(questionTranslations).values(batch),
      questionTranslationRows,
    );
    await insertBatched(
      (batch) => tx.insert(questionOptions).values(batch),
      optionRows,
    );
    await insertBatched(
      (batch) => tx.insert(questionOptionTranslations).values(batch),
      optionTranslationRows,
    );

    for (const testPlan of plan.tests) {
      const testId = randomUUID();
      await tx.insert(quizTests).values({
        id: testId,
        examId,
        type: testPlan.type,
        status: "PUBLISHED",
        questionCount: testPlan.questionCount,
        durationMinutes: testPlan.durationMinutes,
        passingScorePercent: testPlan.passingScorePercent.toFixed(2),
        shuffleQuestions: testPlan.shuffleQuestions,
        shuffleOptions: testPlan.shuffleOptions,
      });
      await tx.insert(testTranslations).values([
        {
          testId,
          locale: "vi",
          name: testPlan.nameVi,
          description: `Đề dữ liệu mẫu: ${testPlan.nameVi}.`,
        },
        {
          testId,
          locale: "en",
          name: testPlan.nameEn,
          description: `Mock test: ${testPlan.nameEn}.`,
        },
      ]);

      if (testPlan.type === "FIXED") {
        const fixedQuestionIds = testPlan.fixedTopics.flatMap((rule) =>
          questionIdsByTopic[rule.topicIndex]!.slice(0, rule.count),
        );
        await tx.insert(testQuestions).values(
          fixedQuestionIds.map((questionId, index) => ({
            testId,
            questionId,
            displayOrder: index,
          })),
        );
      } else {
        await tx.insert(testTopicRules).values(
          testPlan.dynamicRules.map((rule) => ({
            testId,
            topicId: topicIds[rule.topicIndex]!,
            percentage: rule.percentage.toFixed(2),
          })),
        );
      }
    }
  });

  process.stdout.write(
    `Created ${plan.code}: ${plan.topics.length} topics, ${plan.topics.length * QUESTIONS_PER_TOPIC} questions, ${plan.tests.length} tests.\n`,
  );
}

function testSummaryLine(exam: ExamPlan, test: TestPlan): string {
  const shuffle = [
    test.shuffleQuestions ? "trộn câu" : null,
    test.shuffleOptions ? "trộn đáp án" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const scope =
    test.type === "FIXED"
      ? test.fixedTopics
          .map(
            (rule) => `${exam.topics[rule.topicIndex]!.nameVi} × ${rule.count}`,
          )
          .join(" + ")
      : test.dynamicRules
          .map(
            (rule) =>
              `${exam.topics[rule.topicIndex]!.nameVi} ${rule.percentage}%`,
          )
          .join(" + ");
  return `  - **${test.nameVi}** / ${test.nameEn} — ${test.type}, ${test.questionCount} câu, ${test.durationMinutes ? `${test.durationMinutes} phút` : "không giới hạn thời gian"}, đạt ${test.passingScorePercent}%${shuffle ? `, ${shuffle}` : ""}. Nguồn: ${scope}.`;
}

function writeSummary(): void {
  const lines: string[] = [];
  lines.push("# Mock data đã tạo để kiểm thử giao diện");
  lines.push("");
  lines.push(
    "File này được sinh tự động bởi `scripts/seed-mock-data.ts` (`npm run db:seed:mock`). Không commit file này — đã được thêm vào `.gitignore` vì có chứa mật khẩu dạng plaintext của tài khoản thử nghiệm local.",
  );
  lines.push("");
  lines.push("## Tài khoản đăng nhập");
  lines.push("");
  lines.push("| Email | Mật khẩu | Tên hiển thị |");
  lines.push("| --- | --- | --- |");
  for (const user of mockUsers) {
    lines.push(`| ${user.email} | ${user.password} | ${user.displayName} |`);
  }
  lines.push("");
  lines.push(
    "Đăng nhập tại `/vi/login` hoặc `/en/login`. Hai tài khoản độc lập — dùng để kiểm thử việc một user không thấy được attempt/lịch sử của user khác.",
  );
  lines.push("");

  for (const exam of examPlans) {
    lines.push(`## ${exam.nameVi} / ${exam.nameEn}`);
    lines.push("");
    lines.push(
      `- Mã: \`${exam.code}\` · Slug: \`${exam.slug}\` · Trạng thái: PUBLISHED · Ngôn ngữ: vi, en`,
    );
    lines.push(
      `- URL: \`/vi/exams/${exam.slug}\` hoặc \`/en/exams/${exam.slug}\``,
    );
    lines.push(
      `- ${exam.topics.length} chủ đề × ${QUESTIONS_PER_TOPIC} câu = ${exam.topics.length * QUESTIONS_PER_TOPIC} câu hỏi đã publish`,
    );
    lines.push("");
    lines.push("### Chủ đề");
    lines.push("");
    for (const topic of exam.topics) {
      lines.push(
        `- ${topic.nameVi} / ${topic.nameEn} — ${QUESTIONS_PER_TOPIC} câu (mỗi câu thứ 5 là dạng nhiều đáp án đúng)`,
      );
    }
    lines.push("");
    lines.push("### Đề thi");
    lines.push("");
    for (const test of exam.tests) {
      lines.push(testSummaryLine(exam, test));
    }
    lines.push("");
  }

  lines.push("## Ghi chú");
  lines.push("");
  lines.push(
    '- Nội dung câu hỏi/lựa chọn là dữ liệu giả ("[Dữ liệu mẫu] ..."), không có ý nghĩa kiến thức thật — mục đích chỉ để kiểm thử số lượng lớn, phân trang, chọn phạm vi/chế độ, đếm giờ, chấm điểm và lịch sử trên giao diện thật.',
  );
  lines.push(
    "- Chạy lại `npm run db:seed:mock` là an toàn: kỳ thi/tài khoản đã tồn tại (theo mã/email) sẽ được bỏ qua, không tạo trùng.",
  );
  lines.push(
    "- Muốn xoá để làm lại từ đầu: xoá thư mục `data/pglite` (local PGlite) rồi chạy lại `npm run dev` và `npm run db:seed:mock`.",
  );

  writeFileSync("MOCK_DATA.md", `${lines.join("\n")}\n`, "utf8");
  process.stdout.write("Wrote MOCK_DATA.md with credentials and structure.\n");
}

const runtime = loadRuntimeConfig();
const connection = createDatabaseConnection(runtime);

try {
  const now = new Date();
  await seedMockUsers(connection.db, now);
  const authorId = await ensureMockContentAuthor(connection.db, now);
  for (const plan of examPlans) {
    await seedExam(connection.db, plan, authorId);
  }
  writeSummary();
  process.stdout.write("Mock data seed complete.\n");
} finally {
  await connection.close();
}
