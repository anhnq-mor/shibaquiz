import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { notFound, redirect } from "next/navigation";
import { History } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import {
  ResultReview,
  type ResultReviewMedia,
} from "@/components/app/result-review";
import { isAttemptError } from "@/domain/attempts/attempt";
import { isLocale } from "@/domain/common/locale";
import { formatDateTime } from "@/i18n/format";
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
  const resolvedMedia = await Promise.all(
    result.questions.flatMap((question) =>
      question.question.media.map(async (item) => {
        const access = await mediaAccessService.getAttemptMediaAccessUrl(
          question.attemptQuestionId,
          item.id,
          user.id,
        );
        return {
          attemptQuestionId: question.attemptQuestionId,
          media: {
            id: item.id,
            type: item.type,
            url: access.url,
            altText: item.altText,
            caption: item.caption,
          } satisfies ResultReviewMedia,
        };
      }),
    ),
  );
  const mediaByAttemptQuestionId: Record<string, ResultReviewMedia[]> = {};
  for (const { attemptQuestionId, media } of resolvedMedia) {
    (mediaByAttemptQuestionId[attemptQuestionId] ??= []).push(media);
  }

  return (
    <AppShell locale={locale} user={user}>
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
          <table className="admin-table admin-table--cards-on-mobile">
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
                  <td data-label={messages.result.topicBreakdownTopic}>
                    {topic.topicName}
                  </td>
                  <td
                    className="admin-cell-nowrap"
                    data-label={messages.result.topicBreakdownCorrect}
                  >
                    {topic.correctCount}
                  </td>
                  <td
                    className="admin-cell-nowrap"
                    data-label={messages.result.topicBreakdownIncorrect}
                  >
                    {topic.incorrectCount}
                  </td>
                  <td
                    className="admin-cell-nowrap"
                    data-label={messages.result.topicBreakdownUnanswered}
                  >
                    {topic.unansweredCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ResultReview
        locale={locale}
        messages={messages}
        questions={result.questions}
        mediaByAttemptQuestionId={mediaByAttemptQuestionId}
        currentUserId={user.id}
        isAdmin={user.role === "ADMIN"}
      />

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
