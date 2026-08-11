import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Layers, Play } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { historyFilterSchema } from "@/domain/attempts/attempt";
import { isLocale } from "@/domain/common/locale";
import { getAuthMessages } from "@/i18n/auth-catalogs";
import { getQuizMessages } from "@/i18n/quiz-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";
import {
  getAttemptService,
  getDiscoveryService,
} from "@/server/content/runtime";

export const dynamic = "force-dynamic";

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
  const authMessages = getAuthMessages(locale);
  const exam = await getDiscoveryService().getPublishedExamDetail(slug, locale);
  if (!exam) notFound();

  const inProgress = await getAttemptService().listHistory(
    user.id,
    historyFilterSchema.parse({ examId: exam.id, status: "IN_PROGRESS" }),
  );

  const startBase = `/${locale}/exams/${slug}/start`;

  return (
    <AppShell locale={locale} messages={messages} authMessages={authMessages}>
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
                <Link
                  key={topic.id}
                  href={`${startBase}?scope=TOPIC&topicId=${topic.id}` as Route}
                  className="topic-card topic-card-button"
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
                </Link>
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
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">{messages.exams.tableTestName}</th>
                    <th scope="col" className="admin-cell-nowrap">
                      {messages.exams.tableDuration}
                    </th>
                    <th scope="col" className="admin-cell-nowrap">
                      {messages.exams.tablePassingScore}
                    </th>
                    <th scope="col" className="admin-cell-nowrap">
                      {messages.common.scopeFullTest}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exam.tests.map((test) => (
                    <tr key={test.id}>
                      <td>{test.name}</td>
                      <td className="admin-cell-nowrap">
                        {test.durationMinutes
                          ? messages.exams.testDurationMinutes.replace(
                              "{minutes}",
                              String(test.durationMinutes),
                            )
                          : messages.exams.testNoTimeLimit}
                      </td>
                      <td className="admin-cell-nowrap">
                        {messages.exams.testPassingScore.replace(
                          "{percent}",
                          String(test.passingScorePercent),
                        )}
                      </td>
                      <td className="admin-cell-nowrap">
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
