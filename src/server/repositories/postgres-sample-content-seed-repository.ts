import type { Database } from "@/server/db/client";
import {
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
  users,
  exams,
  examTranslations,
} from "@/server/db/schema";

const ids = {
  systemUser: "20000000-0000-4000-8000-000000000001",
  exam: "20000000-0000-4000-8000-000000000002",
  topicMath: "20000000-0000-4000-8000-000000000003",
  topicGeneral: "20000000-0000-4000-8000-000000000004",
  fixedTest: "20000000-0000-4000-8000-000000000005",
  dynamicTest: "20000000-0000-4000-8000-000000000006",
} as const;

function questionId(index: number): string {
  return `20000000-0000-4000-8000-0000000001${String(index).padStart(2, "0")}`;
}

function optionId(questionIndex: number, optionIndex: number): string {
  const suffix = `${String(questionIndex).padStart(2, "0")}${String(optionIndex).padStart(2, "0")}`;
  return `20000000-0000-4000-8000-${suffix.padStart(12, "0")}`;
}

interface SampleOption {
  label: string;
  vi: string;
  en: string;
  isCorrect: boolean;
}

interface SampleQuestion {
  index: number;
  topicId: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  vi: { content: string; explanation: string };
  en: { content: string; explanation: string };
  options: SampleOption[];
}

const sampleQuestions: SampleQuestion[] = [
  {
    index: 1,
    topicId: ids.topicMath,
    type: "SINGLE_CHOICE",
    vi: { content: "2 + 2 bằng bao nhiêu?", explanation: "2 + 2 = 4." },
    en: { content: "What is 2 + 2?", explanation: "2 + 2 equals 4." },
    options: [
      { label: "A", vi: "3", en: "3", isCorrect: false },
      { label: "B", vi: "4", en: "4", isCorrect: true },
      { label: "C", vi: "5", en: "5", isCorrect: false },
      { label: "D", vi: "22", en: "22", isCorrect: false },
    ],
  },
  {
    index: 2,
    topicId: ids.topicMath,
    type: "SINGLE_CHOICE",
    vi: { content: "10 chia 2 bằng bao nhiêu?", explanation: "10 / 2 = 5." },
    en: {
      content: "What is 10 divided by 2?",
      explanation: "10 / 2 equals 5.",
    },
    options: [
      { label: "A", vi: "2", en: "2", isCorrect: false },
      { label: "B", vi: "5", en: "5", isCorrect: true },
      { label: "C", vi: "8", en: "8", isCorrect: false },
      { label: "D", vi: "10", en: "10", isCorrect: false },
    ],
  },
  {
    index: 3,
    topicId: ids.topicMath,
    type: "MULTIPLE_CHOICE",
    vi: {
      content: "Số nào dưới đây là số chẵn?",
      explanation: "2 và 4 là số chẵn; 3 và 5 là số lẻ.",
    },
    en: {
      content: "Which of the following numbers are even?",
      explanation: "2 and 4 are even; 3 and 5 are odd.",
    },
    options: [
      { label: "A", vi: "2", en: "2", isCorrect: true },
      { label: "B", vi: "3", en: "3", isCorrect: false },
      { label: "C", vi: "4", en: "4", isCorrect: true },
      { label: "D", vi: "5", en: "5", isCorrect: false },
    ],
  },
  {
    index: 4,
    topicId: ids.topicMath,
    type: "SINGLE_CHOICE",
    vi: { content: "3 x 3 bằng bao nhiêu?", explanation: "3 x 3 = 9." },
    en: { content: "What is 3 x 3?", explanation: "3 x 3 equals 9." },
    options: [
      { label: "A", vi: "6", en: "6", isCorrect: false },
      { label: "B", vi: "9", en: "9", isCorrect: true },
      { label: "C", vi: "12", en: "12", isCorrect: false },
      { label: "D", vi: "3", en: "3", isCorrect: false },
    ],
  },
  {
    index: 5,
    topicId: ids.topicGeneral,
    type: "SINGLE_CHOICE",
    vi: {
      content: "Thủ đô của Việt Nam là gì?",
      explanation: "Hà Nội là thủ đô của Việt Nam.",
    },
    en: {
      content: "What is the capital of Vietnam?",
      explanation: "Hanoi is the capital of Vietnam.",
    },
    options: [
      { label: "A", vi: "Hà Nội", en: "Hanoi", isCorrect: true },
      { label: "B", vi: "Đà Nẵng", en: "Da Nang", isCorrect: false },
      {
        label: "C",
        vi: "Hồ Chí Minh",
        en: "Ho Chi Minh City",
        isCorrect: false,
      },
      { label: "D", vi: "Huế", en: "Hue", isCorrect: false },
    ],
  },
  {
    index: 6,
    topicId: ids.topicGeneral,
    type: "SINGLE_CHOICE",
    vi: {
      content: "Một tuần có bao nhiêu ngày?",
      explanation: "Một tuần có 7 ngày.",
    },
    en: {
      content: "How many days are in a week?",
      explanation: "There are 7 days in a week.",
    },
    options: [
      { label: "A", vi: "5", en: "5", isCorrect: false },
      { label: "B", vi: "6", en: "6", isCorrect: false },
      { label: "C", vi: "7", en: "7", isCorrect: true },
      { label: "D", vi: "8", en: "8", isCorrect: false },
    ],
  },
  {
    index: 7,
    topicId: ids.topicGeneral,
    type: "MULTIPLE_CHOICE",
    vi: {
      content: "Đâu là hành tinh trong Hệ Mặt Trời?",
      explanation:
        "Trái Đất và Sao Hỏa là hành tinh. Mặt Trăng là vệ tinh, Mặt Trời là ngôi sao.",
    },
    en: {
      content: "Which of these are planets in the Solar System?",
      explanation:
        "Earth and Mars are planets. The Moon is a satellite and the Sun is a star.",
    },
    options: [
      { label: "A", vi: "Trái Đất", en: "Earth", isCorrect: true },
      { label: "B", vi: "Mặt Trăng", en: "The Moon", isCorrect: false },
      { label: "C", vi: "Sao Hỏa", en: "Mars", isCorrect: true },
      { label: "D", vi: "Mặt Trời", en: "The Sun", isCorrect: false },
    ],
  },
  {
    index: 8,
    topicId: ids.topicGeneral,
    type: "SINGLE_CHOICE",
    vi: {
      content: "Nước đóng băng ở bao nhiêu độ C?",
      explanation: "Nước đóng băng ở 0 độ C.",
    },
    en: {
      content: "At what temperature (in °C) does water freeze?",
      explanation: "Water freezes at 0°C.",
    },
    options: [
      { label: "A", vi: "0", en: "0", isCorrect: true },
      { label: "B", vi: "10", en: "10", isCorrect: false },
      { label: "C", vi: "50", en: "50", isCorrect: false },
      { label: "D", vi: "100", en: "100", isCorrect: false },
    ],
  },
];

export class PostgresSampleContentSeedRepository {
  constructor(private readonly database: Database) {}

  async seedPublishedSampleContent(): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const now = new Date();

      await transaction
        .insert(users)
        .values({
          id: ids.systemUser,
          email: "seed-content@shibaquiz.local",
          displayName: "ShibaQuiz Seed Content",
          passwordHash: "seed-content-account-has-no-usable-password",
          role: "ADMIN",
          status: "ACTIVE",
          emailVerifiedAt: now,
        })
        .onConflictDoNothing();

      await transaction
        .insert(exams)
        .values({
          id: ids.exam,
          code: "SHIBA-SAMPLE",
          slug: "shiba-sample",
          primaryLocale: "vi",
          enabledLocales: ["vi", "en"],
          status: "PUBLISHED",
        })
        .onConflictDoNothing();
      await transaction
        .insert(examTranslations)
        .values([
          {
            examId: ids.exam,
            locale: "vi",
            name: "ShibaQuiz Mẫu",
            description:
              "Kỳ thi mẫu song ngữ để luyện tập và kiểm thử tính năng làm bài.",
          },
          {
            examId: ids.exam,
            locale: "en",
            name: "ShibaQuiz Sample",
            description:
              "A bilingual sample exam for practicing and testing the attempt flow.",
          },
        ])
        .onConflictDoNothing();

      await transaction
        .insert(topics)
        .values([
          {
            id: ids.topicMath,
            examId: ids.exam,
            slug: "basic-math",
            displayOrder: 0,
            status: "PUBLISHED",
          },
          {
            id: ids.topicGeneral,
            examId: ids.exam,
            slug: "general-knowledge",
            displayOrder: 1,
            status: "PUBLISHED",
          },
        ])
        .onConflictDoNothing();
      await transaction
        .insert(topicTranslations)
        .values([
          {
            topicId: ids.topicMath,
            locale: "vi",
            name: "Toán cơ bản",
            description: "Các câu hỏi toán học cơ bản.",
          },
          {
            topicId: ids.topicMath,
            locale: "en",
            name: "Basic math",
            description: "Basic arithmetic questions.",
          },
          {
            topicId: ids.topicGeneral,
            locale: "vi",
            name: "Kiến thức chung",
            description: "Các câu hỏi kiến thức chung.",
          },
          {
            topicId: ids.topicGeneral,
            locale: "en",
            name: "General knowledge",
            description: "General knowledge questions.",
          },
        ])
        .onConflictDoNothing();

      for (const question of sampleQuestions) {
        const id = questionId(question.index);
        await transaction
          .insert(questions)
          .values({
            id,
            examId: ids.exam,
            topicId: question.topicId,
            type: question.type,
            status: "PUBLISHED",
            version: 1,
            createdBy: ids.systemUser,
            updatedBy: ids.systemUser,
          })
          .onConflictDoNothing();
        await transaction
          .insert(questionTranslations)
          .values([
            {
              questionId: id,
              locale: "vi",
              content: question.vi.content,
              explanation: question.vi.explanation,
            },
            {
              questionId: id,
              locale: "en",
              content: question.en.content,
              explanation: question.en.explanation,
            },
          ])
          .onConflictDoNothing();

        for (const [optionIndex, option] of question.options.entries()) {
          const thisOptionId = optionId(question.index, optionIndex);
          await transaction
            .insert(questionOptions)
            .values({
              id: thisOptionId,
              questionId: id,
              label: option.label,
              isCorrect: option.isCorrect,
              displayOrder: optionIndex,
            })
            .onConflictDoNothing();
          await transaction
            .insert(questionOptionTranslations)
            .values([
              { optionId: thisOptionId, locale: "vi", content: option.vi },
              { optionId: thisOptionId, locale: "en", content: option.en },
            ])
            .onConflictDoNothing();
        }
      }

      await transaction
        .insert(quizTests)
        .values({
          id: ids.fixedTest,
          examId: ids.exam,
          type: "FIXED",
          status: "PUBLISHED",
          questionCount: 4,
          durationMinutes: 10,
          passingScorePercent: "50.00",
          shuffleQuestions: false,
          shuffleOptions: false,
        })
        .onConflictDoNothing();
      await transaction
        .insert(testTranslations)
        .values([
          {
            testId: ids.fixedTest,
            locale: "vi",
            name: "Đề luyện nhanh",
            description: "Bốn câu hỏi cố định để luyện nhanh.",
          },
          {
            testId: ids.fixedTest,
            locale: "en",
            name: "Quick practice test",
            description: "Four fixed questions for a quick practice run.",
          },
        ])
        .onConflictDoNothing();
      await transaction
        .insert(testQuestions)
        .values(
          [1, 2, 5, 6].map((index, order) => ({
            testId: ids.fixedTest,
            questionId: questionId(index),
            displayOrder: order,
          })),
        )
        .onConflictDoNothing();

      await transaction
        .insert(quizTests)
        .values({
          id: ids.dynamicTest,
          examId: ids.exam,
          type: "DYNAMIC",
          status: "PUBLISHED",
          questionCount: 6,
          durationMinutes: 15,
          passingScorePercent: "60.00",
          shuffleQuestions: true,
          shuffleOptions: true,
        })
        .onConflictDoNothing();
      await transaction
        .insert(testTranslations)
        .values([
          {
            testId: ids.dynamicTest,
            locale: "vi",
            name: "Đề tổng hợp",
            description: "Sáu câu chia đều theo hai chủ đề.",
          },
          {
            testId: ids.dynamicTest,
            locale: "en",
            name: "Comprehensive test",
            description: "Six questions split evenly across both topics.",
          },
        ])
        .onConflictDoNothing();
      await transaction
        .insert(testTopicRules)
        .values([
          {
            testId: ids.dynamicTest,
            topicId: ids.topicMath,
            percentage: "50.00",
          },
          {
            testId: ids.dynamicTest,
            topicId: ids.topicGeneral,
            percentage: "50.00",
          },
        ])
        .onConflictDoNothing();
    });
  }
}
