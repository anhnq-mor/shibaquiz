import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { notFound, redirect } from "next/navigation";
import { History } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { CommentThread } from "@/components/app/comment-thread";
import { isAttemptError } from "@/domain/attempts/attempt";
import { isLocale } from "@/domain/common/locale";
import { formatDateTime } from "@/i18n/format";
import { getAuthMessages } from "@/i18n/auth-catalogs";
import { getQuizMessages } from "@/i18n/quiz-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";
import {
  getAttemptService,
  getMediaAccessService,
} from "@/server/content/runtime";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ locale: string; attemptId: string }>;
}) {
  const { locale, attemptId } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login` as Route);

  const messages = getQuizMessages(locale);
  const authMessages = getAuthMessages(locale);

  let result;
  try {
    result = await getAttemptService().getAttemptResult(attemptId, user.id);
  } catch (error) {
    if (isAttemptError(error)) {
      if (error.code === "LOCKED") {
        redirect(`/${locale}/attempts/${attemptId}` as Route);
      }
      if (error.code === "NOT_FOUND") notFound();
    }
    throw error;
  }

  const mediaAccessService = getMediaAccessService();
  const mediaUrlEntries = await Promise.all(
    result.questions.flatMap((question) =>
      question.question.media.map(async (item) => {
        const access = await mediaAccessService.getAttemptMediaAccessUrl(
          question.attemptQuestionId,
          item.id,
          user.id,
        );
        return [item.id, access.url] as const;
      }),
    ),
  );
  const mediaUrlById = new Map(mediaUrlEntries);

  return (
    <AppShell locale={locale} messages={messages} authMessages={authMessages}>
      <div className="app-page-header">
        <h1>{result.examName}</h1>
        <p>{messages.result.title}</p>
      </div>

      {result.mode === "STUDY" && (
        <p className="form-message" role="status">
          {messages.result.notOfficialNotice}
        </p>
      )}

      <div className="result-hero">
        <span className="result-score">{result.scorePercent}%</span>
        <dl className="admin-dashboard-grid">
          {result.passed !== null && (
            <div className="admin-stat-card">
              <dt>{messages.result.passLabel}</dt>
              <dd>
                <span
                  className={`status-pill ${
                    result.passed
                      ? "status-pill-positive"
                      : "status-pill-negative"
                  }`}
                >
                  {result.passed
                    ? messages.result.passLabel
                    : messages.result.failLabel}
                </span>
              </dd>
            </div>
          )}
          <div className="admin-stat-card">
            <dt>{messages.result.correctCountLabel}</dt>
            <dd>{result.correctCount}</dd>
          </div>
          <div className="admin-stat-card">
            <dt>{messages.result.incorrectCountLabel}</dt>
            <dd>{result.incorrectCount}</dd>
          </div>
          <div className="admin-stat-card">
            <dt>{messages.result.unansweredCountLabel}</dt>
            <dd>{result.unansweredCount}</dd>
          </div>
          <div className="admin-stat-card">
            <dt>{messages.result.durationLabel}</dt>
            <dd>{formatDuration(result.durationSeconds)}</dd>
          </div>
        </dl>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>{messages.result.topicBreakdownHeading}</h2>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{messages.result.topicBreakdownTopic}</th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.result.topicBreakdownCorrect}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.result.topicBreakdownIncorrect}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.result.topicBreakdownUnanswered}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.topicBreakdown.map((topic) => (
                <tr key={topic.topicId}>
                  <td>{topic.topicName}</td>
                  <td className="admin-cell-nowrap">{topic.correctCount}</td>
                  <td className="admin-cell-nowrap">{topic.incorrectCount}</td>
                  <td className="admin-cell-nowrap">{topic.unansweredCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>{messages.result.reviewHeading}</h2>
        </div>
        {result.questions.map((question, index) => (
          <div key={question.attemptQuestionId} className="review-question">
            <p>
              <strong>
                {index + 1}. {question.question.content}
              </strong>
            </p>
            {question.question.media.length > 0 && (
              <div className="attempt-media-list">
                {question.question.media.map((item) => {
                  const url = mediaUrlById.get(item.id);
                  if (!url) return null;
                  if (item.type === "IMAGE") {
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={item.id} src={url} alt={item.altText ?? ""} />
                    );
                  }
                  if (item.type === "AUDIO") {
                    return (
                      <figure key={item.id}>
                        <audio controls src={url} />
                        {item.caption && (
                          <figcaption>{item.caption}</figcaption>
                        )}
                      </figure>
                    );
                  }
                  return (
                    <figure key={item.id}>
                      <video controls src={url} />
                      {item.caption && <figcaption>{item.caption}</figcaption>}
                    </figure>
                  );
                })}
              </div>
            )}
            {question.question.type === "MATCHING" &&
            question.answer.kind === "MATCHING" ? (
              <ul className="option-list">
                {question.question.options.map((option) => {
                  const submittedTargetId =
                    question.answer.kind === "MATCHING"
                      ? question.answer.pairs.find(
                          (pair) => pair.leftOptionId === option.id,
                        )?.rightOptionId
                      : undefined;
                  const submittedTarget =
                    question.question.matchingTargets.find(
                      (target) => target.id === submittedTargetId,
                    );
                  const correctTarget =
                    "correctMatchTargetId" in option
                      ? question.question.matchingTargets.find(
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
            ) : question.question.type === "ORDERING" &&
              question.answer.kind === "ORDERING" ? (
              <div>
                <p>
                  {messages.result.yourAnswerLabel}:{" "}
                  {question.answer.orderedOptionIds
                    .map(
                      (id) =>
                        question.question.options.find(
                          (option) => option.id === id,
                        )?.content,
                    )
                    .filter(Boolean)
                    .join(" → ") || "—"}
                </p>
                <p>
                  {messages.result.correctAnswerLabel}:{" "}
                  {[...question.question.options]
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
                {question.question.options.map((option) => {
                  const isSelected = question.selectedOptionIds.includes(
                    option.id,
                  );
                  const isCorrectOption =
                    "isCorrect" in option ? option.isCorrect : undefined;
                  const optionClass = isCorrectOption
                    ? "correct"
                    : isSelected && isCorrectOption === false
                      ? "incorrect"
                      : "";
                  return (
                    <li key={option.id} className={optionClass}>
                      {(question.question.type === "SINGLE_CHOICE" ||
                        question.question.type === "MULTIPLE_CHOICE") && (
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
            {"explanation" in question.question &&
              question.question.explanation && (
                <p>
                  <em>{question.question.explanation}</em>
                </p>
              )}
            {question.question.disclosure === "REVEALED" && (
              <CommentThread
                locale={locale}
                messages={messages}
                questionId={question.sourceQuestionId}
                currentUserId={user.id}
                isAdmin={user.role === "ADMIN"}
              />
            )}
          </div>
        ))}
      </div>

      <p className="admin-hint">{formatDateTime(result.startedAt, locale)}</p>

      <div className="admin-form-actions">
        <Link
          href={`/${locale}/history` as Route}
          className="button button-secondary"
        >
          <History size={16} aria-hidden />
          {messages.result.backToHistory}
        </Link>
      </div>
    </AppShell>
  );
}
