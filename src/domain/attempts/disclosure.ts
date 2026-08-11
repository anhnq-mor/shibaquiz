import type { QuestionType } from "@/domain/admin/content";
import type { Locale } from "@/domain/common/locale";

export type AttemptMode = "STUDY" | "PRACTICE_IMMEDIATE" | "EXAM_DEFERRED";
export type AttemptStatus =
  "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "ABANDONED";

export interface StoredQuestionOption {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
  correctOrder?: number;
  matchTargetId?: string | null;
  matchTargetContent?: string | null;
}

export interface StoredMediaReference {
  id: string;
  type: "IMAGE" | "AUDIO" | "VIDEO";
  objectKey: string;
  objectVersion: string | null;
  mimeType: string;
  altText: string | null;
  caption: string | null;
  transcript: string | null;
}

export interface StoredQuestionSnapshot {
  schemaVersion: 1 | 2;
  locale: Locale;
  sourceQuestionVersion: number;
  type: QuestionType;
  content: string;
  explanation: string;
  options: StoredQuestionOption[];
  matchingTargetOrder?: string[];
  media: StoredMediaReference[];
}

interface BaseQuestionDto {
  locale: Locale;
  type: QuestionType;
  content: string;
  options: Array<{
    id: string;
    label: string;
    content: string;
  }>;
  matchingTargets: Array<{ id: string; content: string }>;
  media: Array<{
    id: string;
    type: "IMAGE" | "AUDIO" | "VIDEO";
    mimeType: string;
    altText: string | null;
    caption: string | null;
    transcript: string | null;
  }>;
}

export interface HiddenQuestionDto extends BaseQuestionDto {
  disclosure: "HIDDEN";
}

export interface RevealedQuestionDto extends BaseQuestionDto {
  disclosure: "REVEALED";
  explanation: string;
  options: Array<{
    id: string;
    label: string;
    content: string;
    isCorrect: boolean;
    correctOrder: number;
    correctMatchTargetId: string | null;
  }>;
}

export type QuestionDto = HiddenQuestionDto | RevealedQuestionDto;

export interface DisclosureContext {
  mode: AttemptMode;
  attemptStatus: AttemptStatus;
  checkedAt: Date | null;
}

export function mayRevealAnswer(context: DisclosureContext): boolean {
  if (context.mode === "STUDY") {
    return true;
  }

  if (context.mode === "PRACTICE_IMMEDIATE") {
    return context.checkedAt !== null;
  }

  return (
    context.attemptStatus === "SUBMITTED" || context.attemptStatus === "EXPIRED"
  );
}

export function toQuestionDto(
  snapshot: StoredQuestionSnapshot,
  context: DisclosureContext,
): QuestionDto {
  const shared = {
    locale: snapshot.locale,
    type: snapshot.type,
    content: snapshot.content,
    matchingTargets: (snapshot.matchingTargetOrder ?? [])
      .map((id) => {
        const option = snapshot.options.find(
          (candidate) => candidate.matchTargetId === id,
        );
        return option?.matchTargetContent
          ? { id, content: option.matchTargetContent }
          : null;
      })
      .filter(
        (target): target is { id: string; content: string } => target !== null,
      ),
    media: snapshot.media.map(
      ({ id, type, mimeType, altText, caption, transcript }) => ({
        id,
        type,
        mimeType,
        altText,
        caption,
        transcript,
      }),
    ),
  };

  if (!mayRevealAnswer(context)) {
    return {
      ...shared,
      disclosure: "HIDDEN",
      options: snapshot.options.map(({ id, label, content }) => ({
        id,
        label,
        content,
      })),
    };
  }

  return {
    ...shared,
    disclosure: "REVEALED",
    explanation: snapshot.explanation,
    options: snapshot.options.map(
      (
        { id, label, content, isCorrect, correctOrder, matchTargetId },
        index,
      ) => ({
        id,
        label,
        content,
        isCorrect,
        correctOrder: correctOrder ?? index,
        correctMatchTargetId: matchTargetId ?? null,
      }),
    ),
  };
}
