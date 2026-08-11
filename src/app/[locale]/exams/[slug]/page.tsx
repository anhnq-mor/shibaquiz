import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { StartAttemptForm } from "@/components/app/start-attempt-form";
import { isLocale } from "@/domain/common/locale";
import { getAuthMessages } from "@/i18n/auth-catalogs";
import { getQuizMessages } from "@/i18n/quiz-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";
import { getDiscoveryService } from "@/server/content/runtime";

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

  return (
    <AppShell locale={locale} messages={messages} authMessages={authMessages}>
      <div className="app-page-header">
        <Link href={`/${locale}/exams` as Route}>
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

      <div className="admin-layout">
        {exam.topics.length > 0 && (
          <div className="admin-card">
            <div className="admin-card-header">
              <h2>{messages.exams.topicsHeading}</h2>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">{messages.exams.tableTopicName}</th>
                    <th scope="col" className="admin-cell-nowrap">
                      {messages.exams.tableQuestionCount}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exam.topics.map((topic) => (
                    <tr key={topic.id}>
                      <td>{topic.name}</td>
                      <td className="admin-cell-nowrap">
                        {messages.exams.topicQuestionsCount.replace(
                          "{count}",
                          String(topic.publishedQuestionCount),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="admin-card">
          <div className="admin-card-header">
            <h2>{messages.exams.startHeading}</h2>
          </div>
          <StartAttemptForm locale={locale} messages={messages} exam={exam} />
        </div>
      </div>
    </AppShell>
  );
}
