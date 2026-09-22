import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Layers, Play } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { attemptStatusTone } from "@/components/app/status-tone";
import {
  historyFilterSchema,
  type ModeProgress,
  type TopicExamHistoryItem,
} from "@/domain/attempts/attempt";
import { isLocale, type Locale } from "@/domain/common/locale";
import { formatDateTime, formatPercent } from "@/i18n/format";
import { getQuizMessages, type QuizCatalog } from "@/i18n/quiz-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";
import {
  getAttemptService,
  getDiscoveryService,
} from "@/server/content/runtime";

const TOPIC_EXAM_HISTORY_PREVIEW_COUNT = 3;

function topicExamHistoryStatusLabel(
  status: TopicExamHistoryItem["status"],
  messages: QuizCatalog,
): string {
  return status === "EXPIRED"
    ? messages.common.statusExpired
    : messages.common.statusSubmitted;
}

function TopicExamHistory({
  items,
  locale,
  messages,
  examId,
}: {
  items: TopicExamHistoryItem[];
  locale: Locale;
  messages: QuizCatalog;
  examId: string;
}) {
  if (items.length === 0) return null;
  const preview = items.slice(0, TOPIC_EXAM_HISTORY_PREVIEW_COUNT);
  return (
    <div className="topic-exam-history">
      <h4>{messages.exams.topicExamHistoryHeading}</h4>
      <ul className="topic-exam-history-list">
        {preview.map((item) => (
          <li key={item.attemptId}>
            <Link
              href={`/${locale}/attempts/${item.attemptId}/result` as Route}
            >
              <span>
                {formatDateTime(item.submittedAt ?? item.startedAt, locale)}
              </span>
              <span
                className={`status-pill ${attemptStatusTone(item.status)}`}
              >
                {topicExamHistoryStatusLabel(item.status, messages)}
              </span>
              <span>{formatPercent(item.scorePercent / 100, locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {items.length > TOPIC_EXAM_HISTORY_PREVIEW_COUNT && (
        <Link
          href={
            `/${locale}/history?examId=${examId}&mode=EXAM_DEFERRED` as Route
          }
        >
          {messages.exams.topicExamHistoryViewAllAction}
        </Link>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";

function ProgressMiniBars({
  progress,
  messages,
}: {
  progress: ModeProgress;
  messages: QuizCatalog;
}) {
  return (
    <div className="progress-mini-group">
      <div className="progress-mini">
        <span className="progress-mini-label">
          <span>{messages.exams.progressStudyLabel}</span>
          <span>{progress.studyPercent}%</span>
        </span>
        <span className="progress-mini-track">
          <span
            className="progress-mini-fill tone-study"
            style={{ width: `${progress.studyPercent}%` }}
          />
        </span>
      </div>
      <div className="progress-mini">
        <span className="progress-mini-label">
          <span>{messages.exams.progressPracticeLabel}</span>
          <span>{progress.practicePercent}%</span>
        </span>
        <span className="progress-mini-track">
          <span
            className="progress-mini-fill tone-practice"
            style={{ width: `${progress.practicePercent}%` }}
          />
        </span>
      </div>
    </div>
  );
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login` as Route);

  const messages = getQuizMessages(locale);
  const exam = await getDiscoveryService().getPublishedExamDetail(slug, locale);
  if (!exam) notFound();

  const inProgress = await getAttemptService().listHistory(
    user.id,
    historyFilterSchema.parse({ examId: exam.id, status: "IN_PROGRESS" }),
  );
  const progress = await getAttemptService().getExamProgress(
    user.id,
    exam.id,
  );
  const topicExamHistory = await getAttemptService().getTopicExamHistory(
    user.id,
    exam.id,
  );
  const noProgress: ModeProgress = { studyPercent: 0, practicePercent: 0 };

  const startBase = `/${locale}/exams/${slug}/start`;

  return (
    <AppShell locale={locale} user={user}>
      <div className="app-page-header">
        <Link href={`/${locale}/exams` as Route}>
          <ArrowLeft size={16} aria-hidden />
          {messages.exams.backToList}
        </Link>
        <h1>{exam.name}</h1>
        <p>{exam.description}</p>
      </div>

      {exam.localeFallback && (
        <p className="form-message" role="status">
          {messages.exams.localeFallbackNotice}
        </p>
      )}

      {inProgress.items.length > 0 && (
        <p className="form-message" role="status">
          {messages.exams.inProgressNotice}{" "}
          <Link
            href={
              `/${locale}/attempts/${inProgress.items[0]!.attemptId}` as Route
            }
          >
            <Play size={14} aria-hidden />
            {messages.exams.continueAttemptAction}
          </Link>
        </p>
      )}

      <div className="admin-layout">
        {exam.topics.length > 0 && (
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>{messages.exams.topicsGridHeading}</h2>
            </div>
            <div className="topic-grid">
              {exam.topics.map((topic) => (
                <div key={topic.id} className="topic-card">
                  <Link
                    href={
                      `${startBase}?scope=TOPIC&topicId=${topic.id}` as Route
                    }
                    className="topic-card-button"
                  >
                    <strong className="topic-card-title">
                      <BookOpen size={16} aria-hidden />
                      {topic.name}
                    </strong>
                    <span>
                      {messages.exams.topicQuestionsCount.replace(
                        "{count}",
                        String(topic.publishedQuestionCount),
                      )}
                    </span>
                    <ProgressMiniBars
                      progress={progress.topics[topic.id] ?? noProgress}
                      messages={messages}
                    />
                  </Link>
                  <TopicExamHistory
                    items={topicExamHistory[topic.id] ?? []}
                    locale={locale}
                    messages={messages}
                    examId={exam.id}
                  />
                </div>
              ))}
              {exam.publishedQuestionCount > 0 && (
                <Link
                  href={`${startBase}?scope=QUESTION_BANK` as Route}
                  className="topic-card topic-card-button"
                >
                  <strong className="topic-card-title">
                    <Layers size={16} aria-hidden />
                    {messages.common.scopeQuestionBank}
                  </strong>
                  <span>
                    {messages.exams.questionsCount.replace(
                      "{count}",
                      String(exam.publishedQuestionCount),
                    )}
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}

        {exam.tests.length > 0 && (
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>{messages.exams.testsHeading}</h2>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table admin-table--cards-on-mobile">
                <thead>
                  <tr>
                    <th scope="col">{messages.exams.tableTestName}</th>
                    <th scope="col" className="admin-cell-nowrap">
                      {messages.exams.tableDuration}
                    </th>
                    <th scope="col" className="admin-cell-nowrap">
                      {messages.exams.tablePassingScore}
                    </th>
                    <th scope="col">{messages.exams.tableProgress}</th>
                    <th scope="col" className="admin-cell-nowrap">
                      {messages.common.scopeFullTest}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exam.tests.map((test) => (
                    <tr key={test.id}>
                      <td data-label={messages.exams.tableTestName}>
                        {test.name}
                      </td>
                      <td
                        className="admin-cell-nowrap"
                        data-label={messages.exams.tableDuration}
                      >
                        {test.durationMinutes
                          ? messages.exams.testDurationMinutes.replace(
                              "{minutes}",
                              String(test.durationMinutes),
                            )
                          : messages.exams.testNoTimeLimit}
                      </td>
                      <td
                        className="admin-cell-nowrap"
                        data-label={messages.exams.tablePassingScore}
                      >
                        {messages.exams.testPassingScore.replace(
                          "{percent}",
                          String(test.passingScorePercent),
                        )}
                      </td>
                      <td data-label={messages.exams.tableProgress}>
                        <ProgressMiniBars
                          progress={progress.tests[test.id] ?? noProgress}
                          messages={messages}
                        />
                      </td>
                      <td
                        className="admin-cell-nowrap"
                        data-label={messages.common.scopeFullTest}
                      >
                        <Link
                          href={
                            `${startBase}?scope=FULL_TEST&testId=${test.id}` as Route
                          }
                          className="button button-secondary"
                        >
                          <Play size={16} aria-hidden />
                          {messages.exams.selectAction}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {exam.topics.length === 0 &&
          exam.tests.length === 0 &&
          exam.publishedQuestionCount === 0 && (
            <p className="admin-empty">{messages.exams.noTopicsError}</p>
          )}
      </div>
    </AppShell>
  );
}
