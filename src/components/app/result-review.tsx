"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CommentThread } from "@/components/app/comment-thread";
import { isAnswerEmpty } from "@/domain/attempts/answer";
import type { AttemptResultQuestion } from "@/domain/attempts/attempt";
import type { Locale } from "@/domain/common/locale";
import type { QuizCatalog } from "@/i18n/quiz-catalogs";

export interface ResultReviewMedia {
  id: string;
  type: "IMAGE" | "AUDIO" | "VIDEO";
  url: string;
  altText: string | null;
  caption: string | null;
}

export function ResultReview({
  locale,
  messages,
  questions,
  mediaByAttemptQuestionId,
  currentUserId,
  isAdmin,
}: {
  locale: Locale;
  messages: QuizCatalog;
  questions: AttemptResultQuestion[];
  mediaByAttemptQuestionId: Record<string, ResultReviewMedia[]>;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = questions[currentIndex]!;
  const media = mediaByAttemptQuestionId[current.attemptQuestionId] ?? [];

  return (
    <div className="result-review-layout">
      <section className="attempt-question-panel">
        <div className="attempt-question-heading">
          <div className="attempt-question-title">
            <h2>
              {messages.attempt.questionOf
                .replace("{current}", String(currentIndex + 1))
                .replace("{total}", String(questions.length))}
            </h2>
          </div>
        </div>

        <p>{current.question.content}</p>

        {media.length > 0 && (
          <div className="attempt-media-list">
            {media.map((item) => {
              if (item.type === "IMAGE") {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={item.id} src={item.url} alt={item.altText ?? ""} />
                );
              }
              if (item.type === "AUDIO") {
                return (
                  <figure key={item.id}>
                    <audio controls src={item.url} />
                    {item.caption && <figcaption>{item.caption}</figcaption>}
                  </figure>
                );
              }
              return (
                <figure key={item.id}>
                  <video controls src={item.url} />
                  {item.caption && <figcaption>{item.caption}</figcaption>}
                </figure>
              );
            })}
          </div>
        )}

        {current.question.type === "MATCHING" &&
        current.answer.kind === "MATCHING" ? (
          <ul className="option-list">
            {current.question.options.map((option) => {
              const submittedTargetId =
                current.answer.kind === "MATCHING"
                  ? current.answer.pairs.find(
                      (pair) => pair.leftOptionId === option.id,
                    )?.rightOptionId
                  : undefined;
              const submittedTarget = current.question.matchingTargets.find(
                (target) => target.id === submittedTargetId,
              );
              const correctTarget =
                "correctMatchTargetId" in option
                  ? current.question.matchingTargets.find(
                      (target) => target.id === option.correctMatchTargetId,
                    )
                  : undefined;
              return (
                <li
                  key={option.id}
                  className={
                    submittedTargetId ===
                    ("correctMatchTargetId" in option
                      ? option.correctMatchTargetId
                      : undefined)
                      ? "correct"
                      : "incorrect"
                  }
                >
                  {option.content} → {submittedTarget?.content ?? "—"}
                  {correctTarget && submittedTargetId !== correctTarget.id
                    ? ` · ${messages.result.correctAnswerLabel}: ${correctTarget.content}`
                    : ""}
                </li>
              );
            })}
          </ul>
        ) : current.question.type === "ORDERING" &&
          current.answer.kind === "ORDERING" ? (
          <div>
            <p>
              {messages.result.yourAnswerLabel}:{" "}
              {current.answer.orderedOptionIds
                .map(
                  (id) =>
                    current.question.options.find((option) => option.id === id)
                      ?.content,
                )
                .filter(Boolean)
                .join(" → ") || "—"}
            </p>
            <p>
              {messages.result.correctAnswerLabel}:{" "}
              {[...current.question.options]
                .sort((left, right) =>
                  "correctOrder" in left && "correctOrder" in right
                    ? left.correctOrder - right.correctOrder
                    : 0,
                )
                .map((option) => option.content)
                .join(" → ")}
            </p>
          </div>
        ) : (
          <ul className="option-list">
            {current.question.options.map((option) => {
              const isSelected = current.selectedOptionIds.includes(option.id);
              const isCorrectOption =
                "isCorrect" in option ? option.isCorrect : undefined;
              const optionClass = isCorrectOption
                ? "correct"
                : isSelected && isCorrectOption === false
                  ? "incorrect"
                  : "";
              return (
                <li key={option.id} className={optionClass}>
                  {(current.question.type === "SINGLE_CHOICE" ||
                    current.question.type === "MULTIPLE_CHOICE") && (
                    <span className="option-label" aria-hidden="true">
                      {option.label}
                    </span>
                  )}
                  {option.content}
                  {isSelected && ` — ${messages.result.yourAnswerLabel}`}
                </li>
              );
            })}
          </ul>
        )}

        {"explanation" in current.question && current.question.explanation && (
          <p>
            <em>{current.question.explanation}</em>
          </p>
        )}

        <div className="attempt-toolbar">
          <button
            type="button"
            className="button button-secondary"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          >
            <ChevronLeft size={16} aria-hidden />
            {messages.attempt.previousAction}
          </button>
          <button
            type="button"
            className="button button-secondary"
            disabled={currentIndex === questions.length - 1}
            onClick={() =>
              setCurrentIndex((index) =>
                Math.min(questions.length - 1, index + 1),
              )
            }
          >
            {messages.attempt.nextAction}
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>

        {current.question.disclosure === "REVEALED" &&
          current.sourceQuestionId && (
            <CommentThread
              key={current.sourceQuestionId}
              locale={locale}
              messages={messages}
              questionId={current.sourceQuestionId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          )}
      </section>

      <nav
        className="result-review-nav-panel"
        aria-label={messages.result.reviewHeading}
      >
        <div className="attempt-navigator-header">
          <h2>{messages.result.reviewHeading}</h2>
          <span className="attempt-nav-count">{questions.length}</span>
        </div>
        <div className="attempt-nav-grid">
          {questions.map((question, index) => {
            const unanswered = isAnswerEmpty(question.answer);
            const classes = [
              "attempt-nav-item",
              !unanswered ? "answered" : "",
              !unanswered && question.isCorrect === false ? "incorrect" : "",
              index === currentIndex ? "current" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={question.attemptQuestionId}
                type="button"
                className={classes}
                aria-current={index === currentIndex ? "true" : undefined}
                onClick={() => setCurrentIndex(index)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <div className="attempt-legend">
          <span>
            <span className="attempt-legend-dot answered" aria-hidden="true" />
            {messages.result.correctCountLabel}
          </span>
          <span>
            <span className="attempt-legend-dot incorrect" aria-hidden="true" />
            {messages.result.incorrectCountLabel}
          </span>
          <span>
            <span className="attempt-legend-dot" aria-hidden="true" />
            {messages.result.unansweredCountLabel}
          </span>
        </div>
      </nav>
    </div>
  );
}
