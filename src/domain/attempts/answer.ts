import { z } from "zod";

import type { QuestionType } from "@/domain/admin/content";
import type { StoredQuestionSnapshot } from "@/domain/attempts/disclosure";

const idSchema = z.string().uuid();

export const choiceAnswerSchema = z.object({
  kind: z.literal("CHOICE"),
  selectedOptionIds: z.array(idSchema).max(20),
});

export const matchingAnswerSchema = z.object({
  kind: z.literal("MATCHING"),
  pairs: z
    .array(
      z.object({
        leftOptionId: idSchema,
        rightOptionId: idSchema,
      }),
    )
    .max(20),
});

export const orderingAnswerSchema = z.object({
  kind: z.literal("ORDERING"),
  orderedOptionIds: z.array(idSchema).max(20),
});

export const attemptAnswerSchema = z.discriminatedUnion("kind", [
  choiceAnswerSchema,
  matchingAnswerSchema,
  orderingAnswerSchema,
]);

export type AttemptAnswer = z.infer<typeof attemptAnswerSchema>;

export function emptyAnswerFor(type: QuestionType): AttemptAnswer {
  if (type === "MATCHING") return { kind: "MATCHING", pairs: [] };
  if (type === "ORDERING") return { kind: "ORDERING", orderedOptionIds: [] };
  return { kind: "CHOICE", selectedOptionIds: [] };
}

export function isAnswerEmpty(answer: AttemptAnswer): boolean {
  if (answer.kind === "CHOICE") return answer.selectedOptionIds.length === 0;
  if (answer.kind === "MATCHING") return answer.pairs.length === 0;
  return answer.orderedOptionIds.length === 0;
}

export function validateAnswerForSnapshot(
  answer: AttemptAnswer,
  snapshot: StoredQuestionSnapshot,
): boolean {
  const optionIds = new Set(snapshot.options.map((option) => option.id));

  if (snapshot.type === "MATCHING") {
    if (answer.kind !== "MATCHING") return false;
    const targetIds = new Set(
      snapshot.options
        .map((option) => option.matchTargetId)
        .filter((id): id is string => Boolean(id)),
    );
    const leftIds = answer.pairs.map((pair) => pair.leftOptionId);
    const rightIds = answer.pairs.map((pair) => pair.rightOptionId);
    return (
      new Set(leftIds).size === leftIds.length &&
      new Set(rightIds).size === rightIds.length &&
      leftIds.every((id) => optionIds.has(id)) &&
      rightIds.every((id) => targetIds.has(id))
    );
  }

  if (snapshot.type === "ORDERING") {
    if (answer.kind !== "ORDERING") return false;
    return (
      new Set(answer.orderedOptionIds).size ===
        answer.orderedOptionIds.length &&
      answer.orderedOptionIds.every((id) => optionIds.has(id))
    );
  }

  if (answer.kind !== "CHOICE") return false;
  return (
    new Set(answer.selectedOptionIds).size ===
      answer.selectedOptionIds.length &&
    answer.selectedOptionIds.every((id) => optionIds.has(id))
  );
}

export function isAttemptAnswerCorrect(
  answer: AttemptAnswer,
  snapshot: StoredQuestionSnapshot,
): boolean {
  if (!validateAnswerForSnapshot(answer, snapshot)) return false;

  if (snapshot.type === "MATCHING") {
    if (
      answer.kind !== "MATCHING" ||
      answer.pairs.length !== snapshot.options.length
    )
      return false;
    const submitted = new Map(
      answer.pairs.map((pair) => [pair.leftOptionId, pair.rightOptionId]),
    );
    return snapshot.options.every(
      (option) => submitted.get(option.id) === option.matchTargetId,
    );
  }

  if (snapshot.type === "ORDERING") {
    if (
      answer.kind !== "ORDERING" ||
      answer.orderedOptionIds.length !== snapshot.options.length
    )
      return false;
    const expected = [...snapshot.options]
      .sort(
        (left, right) =>
          (left.correctOrder ?? snapshot.options.indexOf(left)) -
          (right.correctOrder ?? snapshot.options.indexOf(right)),
      )
      .map((option) => option.id);
    return expected.every((id, index) => answer.orderedOptionIds[index] === id);
  }

  if (answer.kind !== "CHOICE") return false;
  const selected = new Set(answer.selectedOptionIds);
  const correct = new Set(
    snapshot.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id),
  );
  return (
    selected.size === correct.size &&
    [...selected].every((id) => correct.has(id))
  );
}
