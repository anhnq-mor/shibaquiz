import { z } from "zod";

import { locales, type Locale } from "@/domain/common/locale";

export const contentStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export const questionTypes = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "MATCHING",
  "ORDERING",
] as const;
export const testTypes = ["FIXED", "DYNAMIC"] as const;

export type ContentStatus = (typeof contentStatuses)[number];
export type QuestionType = (typeof questionTypes)[number];
export type TestType = (typeof testTypes)[number];

const idSchema = z.string().uuid();
const localeSchema = z.enum(locales);
const statusSchema = z.enum(contentStatuses);
const trimmed = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);
const optionalId = idSchema.optional();

const namedTranslationSchema = z.object({
  locale: localeSchema,
  name: trimmed(1, 200),
  description: trimmed(1, 5_000),
});

const questionTranslationSchema = z.object({
  locale: localeSchema,
  content: trimmed(1, 10_000),
  explanation: trimmed(0, 20_000).default(""),
});

const optionTranslationSchema = z.object({
  locale: localeSchema,
  content: trimmed(1, 10_000),
  matchContent: trimmed(1, 10_000).nullable().optional(),
});

function uniqueLocales<T extends { locale: Locale }>(values: T[]): boolean {
  return new Set(values.map((value) => value.locale)).size === values.length;
}

const namedTranslationsSchema = z
  .array(namedTranslationSchema)
  .min(1)
  .max(2)
  .refine(uniqueLocales, "Translation locales must be unique");

export const saveExamSchema = z.object({
  id: optionalId,
  code: trimmed(2, 40).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  slug: trimmed(2, 100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  primaryLocale: localeSchema,
  status: statusSchema,
  translations: namedTranslationsSchema,
});

export const saveTopicSchema = z.object({
  id: optionalId,
  examId: idSchema,
  slug: trimmed(2, 100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  displayOrder: z.number().int().min(0).max(100_000),
  status: statusSchema,
  translations: namedTranslationsSchema,
});

export const questionOptionInputSchema = z.object({
  label: trimmed(1, 8),
  isCorrect: z.boolean(),
  displayOrder: z.number().int().min(0).max(100),
  translations: z
    .array(optionTranslationSchema)
    .min(1)
    .max(2)
    .refine(uniqueLocales, "Translation locales must be unique"),
});

export const saveQuestionSchema = z.object({
  id: optionalId,
  externalId: z.string().trim().max(100).nullable(),
  examId: idSchema,
  topicId: idSchema,
  type: z.enum(questionTypes),
  status: statusSchema,
  translations: z
    .array(questionTranslationSchema)
    .min(1)
    .max(2)
    .refine(uniqueLocales, "Translation locales must be unique"),
  options: z
    .array(questionOptionInputSchema)
    .min(2)
    .max(20)
    .refine(
      (options) =>
        new Set(options.map((option) => option.label)).size === options.length,
      "Option labels must be unique",
    )
    .refine(
      (options) =>
        new Set(options.map((option) => option.displayOrder)).size ===
        options.length,
      "Option order must be unique",
    ),
  mediaIds: z
    .array(idSchema)
    .max(5)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Media references must be unique",
    )
    .default([]),
});

const testTranslationSchema = namedTranslationSchema;
const fixedQuestionSchema = z.object({
  questionId: idSchema,
  displayOrder: z.number().int().min(0).max(100_000),
});
const dynamicRuleSchema = z.object({
  topicId: idSchema,
  percentage: z.number().positive().max(100),
});

export const saveTestSchema = z.object({
  id: optionalId,
  examId: idSchema,
  type: z.enum(testTypes),
  status: statusSchema,
  questionCount: z.number().int().positive().max(10_000),
  durationMinutes: z.number().int().positive().max(10_000).nullable(),
  passingScorePercent: z.number().min(0).max(100),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  translations: z
    .array(testTranslationSchema)
    .min(1)
    .max(2)
    .refine(uniqueLocales, "Translation locales must be unique"),
  fixedQuestions: z.array(fixedQuestionSchema).max(10_000),
  dynamicRules: z.array(dynamicRuleSchema).max(1_000),
});

export const entityIdSchema = z.object({ id: idSchema });

export type SaveExamInput = z.infer<typeof saveExamSchema>;
export type SaveTopicInput = z.infer<typeof saveTopicSchema>;
export type SaveQuestionInput = z.infer<typeof saveQuestionSchema>;
export type SaveTestInput = z.infer<typeof saveTestSchema>;

export interface TestAllocationPreview {
  topicId: string;
  percentage: number;
  questionCount: number;
  availableQuestions: number;
}

export interface AdminContentWorkspace {
  exams: Array<{
    id: string;
    code: string;
    slug: string;
    primaryLocale: Locale;
    enabledLocales: Locale[];
    status: ContentStatus;
    translations: SaveExamInput["translations"];
  }>;
  topics: Array<{
    id: string;
    examId: string;
    slug: string;
    displayOrder: number;
    status: ContentStatus;
    translations: SaveTopicInput["translations"];
  }>;
  questions: Array<{
    id: string;
    externalId: string | null;
    examId: string;
    topicId: string;
    type: QuestionType;
    status: ContentStatus;
    version: number;
    deletedAt: string | null;
    translations: SaveQuestionInput["translations"];
    options: Array<SaveQuestionInput["options"][number] & { id: string }>;
    media: Array<{
      mediaAssetId: string;
      displayOrder: number;
      originalFileName: string;
      status: string;
    }>;
  }>;
  tests: Array<{
    id: string;
    examId: string;
    type: TestType;
    status: ContentStatus;
    questionCount: number;
    durationMinutes: number | null;
    passingScorePercent: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    translations: SaveTestInput["translations"];
    fixedQuestions: SaveTestInput["fixedQuestions"];
    dynamicRules: SaveTestInput["dynamicRules"];
  }>;
}

export class AdminContentError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "CONFLICT"
      | "INVALID_STRUCTURE"
      | "INCOMPLETE_TRANSLATION"
      | "PUBLISH_NOT_READY",
    public readonly status: number,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AdminContentError";
  }
}

export function isAdminContentError(
  error: unknown,
): error is AdminContentError {
  return (
    error instanceof Error &&
    error.name === "AdminContentError" &&
    typeof (error as AdminContentError).code === "string" &&
    typeof (error as AdminContentError).status === "number"
  );
}

export interface AdminContentRepository {
  getWorkspace(): Promise<AdminContentWorkspace>;
  saveExam(
    input: SaveExamInput,
    actorUserId: string,
    now: Date,
  ): Promise<string>;
  saveTopic(
    input: SaveTopicInput,
    actorUserId: string,
    now: Date,
  ): Promise<string>;
  saveQuestion(
    input: SaveQuestionInput,
    actorUserId: string,
    now: Date,
  ): Promise<string>;
  deleteQuestion(id: string, actorUserId: string, now: Date): Promise<void>;
  previewTest(input: SaveTestInput): Promise<TestAllocationPreview[]>;
  saveTest(
    input: SaveTestInput,
    actorUserId: string,
    now: Date,
  ): Promise<{ id: string; preview: TestAllocationPreview[] }>;
}

export function assertQuestionCorrectness(input: SaveQuestionInput): void {
  const count = input.options.length;
  const correct = input.options.filter((option) => option.isCorrect).length;
  const incorrect = input.options.length - correct;
  if (
    input.type === "SINGLE_CHOICE" &&
    (count < 2 || count > 6 || correct !== 1)
  ) {
    throw new AdminContentError(
      "INVALID_STRUCTURE",
      400,
      "A single-choice question needs 2-6 options and exactly one correct option",
      { options: ["SINGLE_REQUIRES_TWO_TO_SIX_AND_ONE_CORRECT"] },
    );
  }
  if (
    input.type === "MULTIPLE_CHOICE" &&
    (count > 20 || correct < 2 || incorrect < 1)
  ) {
    throw new AdminContentError(
      "INVALID_STRUCTURE",
      400,
      "A multiple-choice question needs two correct and one incorrect option",
      { options: ["MULTIPLE_REQUIRES_TWO_CORRECT_ONE_INCORRECT"] },
    );
  }
  if (input.type === "TRUE_FALSE" && (count !== 2 || correct !== 1)) {
    throw new AdminContentError(
      "INVALID_STRUCTURE",
      400,
      "A true/false question needs exactly two options and one correct option",
      { options: ["TRUE_FALSE_REQUIRES_TWO_AND_ONE_CORRECT"] },
    );
  }
  if (input.type === "MATCHING") {
    const completeTargets = input.options.every((option) =>
      option.translations.every((translation) =>
        Boolean(translation.matchContent),
      ),
    );
    if (count < 2 || count > 20 || !completeTargets) {
      throw new AdminContentError(
        "INVALID_STRUCTURE",
        400,
        "A matching question needs 2-20 complete localized pairs",
        { options: ["MATCHING_REQUIRES_COMPLETE_LOCALIZED_PAIRS"] },
      );
    }
  }
  if (input.type === "ORDERING" && (count < 2 || count > 20)) {
    throw new AdminContentError(
      "INVALID_STRUCTURE",
      400,
      "An ordering question needs 2-20 steps",
      { options: ["ORDERING_REQUIRES_TWO_TO_TWENTY_STEPS"] },
    );
  }
}

export function assertUniqueTestStructure(input: SaveTestInput): void {
  if (input.type === "FIXED") {
    const ids = input.fixedQuestions.map((question) => question.questionId);
    const orders = input.fixedQuestions.map(
      (question) => question.displayOrder,
    );
    if (
      ids.length !== input.questionCount ||
      new Set(ids).size !== ids.length ||
      new Set(orders).size !== orders.length ||
      input.dynamicRules.length > 0
    ) {
      throw new AdminContentError(
        "INVALID_STRUCTURE",
        400,
        "Fixed test structure is invalid",
        { fixedQuestions: ["FIXED_STRUCTURE_INVALID"] },
      );
    }
    return;
  }

  const topics = input.dynamicRules.map((rule) => rule.topicId);
  const percentage = input.dynamicRules.reduce(
    (total, rule) => total + rule.percentage,
    0,
  );
  if (
    topics.length === 0 ||
    new Set(topics).size !== topics.length ||
    Math.abs(percentage - 100) > 0.001 ||
    input.fixedQuestions.length > 0
  ) {
    throw new AdminContentError(
      "INVALID_STRUCTURE",
      400,
      "Dynamic test percentages must total 100",
      { dynamicRules: ["DYNAMIC_STRUCTURE_INVALID"] },
    );
  }
}

export function allocateLargestRemainder(
  questionCount: number,
  rules: Array<{ topicId: string; percentage: number }>,
): Array<{ topicId: string; percentage: number; questionCount: number }> {
  const rows = rules.map((rule, index) => {
    const exact = (questionCount * rule.percentage) / 100;
    const floor = Math.floor(exact);
    return { ...rule, index, floor, remainder: exact - floor };
  });
  let remaining = questionCount - rows.reduce((sum, row) => sum + row.floor, 0);
  const ranked = [...rows].sort(
    (left, right) =>
      right.remainder - left.remainder || left.index - right.index,
  );
  for (const row of ranked) {
    if (remaining <= 0) break;
    row.floor += 1;
    remaining -= 1;
  }
  return rows.map((row) => ({
    topicId: row.topicId,
    percentage: row.percentage,
    questionCount: row.floor,
  }));
}
