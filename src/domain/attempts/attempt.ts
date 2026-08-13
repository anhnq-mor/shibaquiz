import { z } from "zod";

import type { QuestionType } from "@/domain/admin/content";
import type { Locale } from "@/domain/common/locale";
import type {
  AttemptMode,
  AttemptStatus,
  QuestionDto,
} from "@/domain/attempts/disclosure";
import {
  attemptAnswerSchema,
  isAnswerEmpty,
  isAttemptAnswerCorrect,
  type AttemptAnswer,
} from "@/domain/attempts/answer";
import type { StoredQuestionSnapshot } from "@/domain/attempts/disclosure";

export const attemptScopes = ["TOPIC", "FULL_TEST", "QUESTION_BANK"] as const;
export const attemptModes = [
  "STUDY",
  "PRACTICE_IMMEDIATE",
  "EXAM_DEFERRED",
] as const satisfies readonly AttemptMode[];
export const attemptStatuses = [
  "IN_PROGRESS",
  "SUBMITTED",
  "EXPIRED",
  "ABANDONED",
] as const satisfies readonly AttemptStatus[];

export type AttemptScope = (typeof attemptScopes)[number];

const idSchema = z.string().uuid();

export const startAttemptSchema = z
  .object({
    examId: idSchema,
    scope: z.enum(attemptScopes),
    mode: z.enum(attemptModes),
    topicId: idSchema.optional(),
    testId: idSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.scope === "TOPIC" && !value.topicId) {
      context.addIssue({
        code: "custom",
        path: ["topicId"],
        message: "topicId is required for TOPIC scope",
      });
    }
    if (value.scope === "FULL_TEST" && !value.testId) {
      context.addIssue({
        code: "custom",
        path: ["testId"],
        message: "testId is required for FULL_TEST scope",
      });
    }
    if (value.scope === "QUESTION_BANK" && (value.topicId || value.testId)) {
      context.addIssue({
        code: "custom",
        path: ["scope"],
        message: "QUESTION_BANK scope does not accept topicId/testId",
      });
    }
    if (value.scope === "TOPIC" && value.testId) {
      context.addIssue({
        code: "custom",
        path: ["testId"],
        message: "TOPIC scope does not accept testId",
      });
    }
    if (value.scope === "FULL_TEST" && value.topicId) {
      context.addIssue({
        code: "custom",
        path: ["topicId"],
        message: "FULL_TEST scope does not accept topicId",
      });
    }
  });

export type StartAttemptInput = z.infer<typeof startAttemptSchema>;

export const saveAnswerSchema = z
  .object({
    answer: attemptAnswerSchema.optional(),
    selectedOptionIds: z.array(idSchema).max(20).optional(),
    isFlagged: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (!value.answer && !value.selectedOptionIds) {
      context.addIssue({
        code: "custom",
        path: ["answer"],
        message: "answer is required",
      });
    }
  });

export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;

export const historyFilterSchema = z.object({
  examId: idSchema.optional(),
  mode: z.enum(attemptModes).optional(),
  status: z.enum(attemptStatuses).optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type HistoryFilterInput = z.infer<typeof historyFilterSchema>;

export class AttemptError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_STRUCTURE"
      | "INSUFFICIENT_QUESTIONS"
      | "LOCKED",
    public readonly status: number,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AttemptError";
  }
}

export function isAttemptError(error: unknown): error is AttemptError {
  return (
    error instanceof Error &&
    error.name === "AttemptError" &&
    typeof (error as AttemptError).code === "string" &&
    typeof (error as AttemptError).status === "number"
  );
}

export function isAnswerCorrect(
  selectedOptionIds: string[],
  correctOptionIds: string[],
): boolean {
  const selected = new Set(selectedOptionIds);
  const correct = new Set(correctOptionIds);
  if (selected.size !== correct.size) return false;
  for (const id of selected) {
    if (!correct.has(id)) return false;
  }
  return true;
}

export function computeAttemptExpiry(
  startedAt: Date,
  durationMinutes: number | null,
): Date | null {
  if (!durationMinutes) return null;
  return new Date(startedAt.getTime() + durationMinutes * 60_000);
}

export function isAttemptExpired(now: Date, expiresAt: Date | null): boolean {
  return expiresAt !== null && now.getTime() > expiresAt.getTime();
}

export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith]!, result[index]!];
  }
  return result;
}

export interface TopicBreakdown {
  topicId: string;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalCount: number;
}

export interface AttemptResultSummary {
  scorePercent: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  topicBreakdown: TopicBreakdown[];
}

export interface AttemptQuestionOutcome {
  topicId: string;
  selectedOptionIds?: string[];
  correctOptionIds?: string[];
  answer?: AttemptAnswer;
  snapshot?: StoredQuestionSnapshot;
}

export function computeAttemptResult(
  questions: AttemptQuestionOutcome[],
): AttemptResultSummary {
  const topicBreakdown = new Map<string, TopicBreakdown>();
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const question of questions) {
    const breakdown = topicBreakdown.get(question.topicId) ?? {
      topicId: question.topicId,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      totalCount: 0,
    };
    breakdown.totalCount += 1;

    const unanswered = question.answer
      ? isAnswerEmpty(question.answer)
      : (question.selectedOptionIds?.length ?? 0) === 0;
    const correct =
      question.answer && question.snapshot
        ? isAttemptAnswerCorrect(question.answer, question.snapshot)
        : isAnswerCorrect(
            question.selectedOptionIds ?? [],
            question.correctOptionIds ?? [],
          );

    if (unanswered) {
      unansweredCount += 1;
      breakdown.unansweredCount += 1;
    } else if (correct) {
      correctCount += 1;
      breakdown.correctCount += 1;
    } else {
      incorrectCount += 1;
      breakdown.incorrectCount += 1;
    }

    topicBreakdown.set(question.topicId, breakdown);
  }

  const total = questions.length;
  const scorePercent =
    total === 0 ? 0 : Math.round((correctCount / total) * 100 * 100) / 100;

  return {
    scorePercent,
    correctCount,
    incorrectCount,
    unansweredCount,
    topicBreakdown: [...topicBreakdown.values()],
  };
}

export interface AttemptQuestionState {
  attemptQuestionId: string;
  displayOrder: number;
  topicId: string;
  topicName: string;
  type: QuestionType;
  selectedOptionIds: string[];
  answer: AttemptAnswer;
  isFlagged: boolean;
  checkedAt: string | null;
  question: QuestionDto;
}

export interface AttemptTakingView {
  attemptId: string;
  examId: string;
  examName: string;
  examSlug: string;
  scope: AttemptScope;
  mode: AttemptMode;
  status: AttemptStatus;
  locale: Locale;
  startedAt: string;
  expiresAt: string | null;
  serverNow: string;
  questions: AttemptQuestionState[];
}

export interface AttemptResultQuestion {
  attemptQuestionId: string;
  sourceQuestionId: string;
  displayOrder: number;
  topicId: string;
  selectedOptionIds: string[];
  answer: AttemptAnswer;
  isCorrect: boolean | null;
  question: QuestionDto;
}

export interface AttemptResultView {
  attemptId: string;
  examId: string;
  examName: string;
  scope: AttemptScope;
  mode: AttemptMode;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  durationSeconds: number | null;
  scorePercent: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  passingScorePercent: number | null;
  passed: boolean | null;
  topicBreakdown: Array<TopicBreakdown & { topicName: string }>;
  questions: AttemptResultQuestion[];
}

export interface AttemptHistoryItem {
  attemptId: string;
  examName: string;
  testName: string | null;
  scope: AttemptScope;
  mode: AttemptMode;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  scorePercent: number | null;
  durationSeconds: number | null;
}

export interface ModeProgress {
  studyPercent: number;
  practicePercent: number;
}

export interface ExamProgressSummary {
  topics: Record<string, ModeProgress>;
  tests: Record<string, ModeProgress>;
}

export interface AttemptRepository {
  startOrResumeAttempt(
    input: StartAttemptInput,
    userId: string,
    locale: Locale,
    now: Date,
  ): Promise<{ attemptId: string; resumed: boolean }>;
  getAttemptForTaking(
    attemptId: string,
    userId: string,
    now: Date,
  ): Promise<AttemptTakingView>;
  saveAnswer(
    attemptId: string,
    attemptQuestionId: string,
    userId: string,
    input: SaveAnswerInput,
    now: Date,
  ): Promise<AttemptQuestionState>;
  checkAnswer(
    attemptId: string,
    attemptQuestionId: string,
    userId: string,
    now: Date,
  ): Promise<AttemptQuestionState>;
  submitAttempt(
    attemptId: string,
    userId: string,
    now: Date,
  ): Promise<AttemptResultView>;
  abandonAttempt(attemptId: string, userId: string, now: Date): Promise<void>;
  getAttemptResult(
    attemptId: string,
    userId: string,
    now: Date,
  ): Promise<AttemptResultView>;
  listHistory(
    userId: string,
    filters: HistoryFilterInput,
  ): Promise<{ items: AttemptHistoryItem[]; nextCursor: string | null }>;
  getExamProgress(
    userId: string,
    examId: string,
  ): Promise<ExamProgressSummary>;
}
