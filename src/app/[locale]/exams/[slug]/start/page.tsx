import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import {
  StartAttemptForm,
  type AttemptSelection,
} from "@/components/app/start-attempt-form";
import { attemptScopes } from "@/domain/attempts/attempt";
import { isLocale } from "@/domain/common/locale";
import { getQuizMessages, type QuizCatalog } from "@/i18n/quiz-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";
import { getDiscoveryService } from "@/server/content/runtime";
import type { PublishedExamDetail } from "@/domain/discovery/discovery";

function resolveSelection(
  exam: PublishedExamDetail,
  messages: QuizCatalog,
  query: { scope?: string; topicId?: string; testId?: string },
): AttemptSelection | null {
  const scope = attemptScopes.find((value) => value === query.scope);
  if (scope === "TOPIC") {
    const topic = exam.topics.find((item) => item.id === query.topicId);
    if (!topic) return null;
    return {
      scope,
      topicId: topic.id,
      label: topic.name,
      questionCount: topic.publishedQuestionCount,
      durationMinutes: null,
    };
  }
  if (scope === "FULL_TEST") {
    const test = exam.tests.find((item) => item.id === query.testId);
    if (!test) return null;
    return {
      scope,
      testId: test.id,
      label: test.name,
      questionCount: test.questionCount,
      durationMinutes: test.durationMinutes,
    };
  }
  if (scope === "QUESTION_BANK" && exam.publishedQuestionCount > 0) {
    return {
      scope,
      label: messages.common.scopeQuestionBank,
      questionCount: exam.publishedQuestionCount,
      durationMinutes: null,
    };
  }
  return null;
}

export const dynamic = "force-dynamic";

export default async function StartAttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    scope?: string;
    topicId?: string;
    testId?: string;
  }>;
}) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login` as Route);

  const messages = getQuizMessages(locale);
  const exam = await getDiscoveryService().getPublishedExamDetail(slug, locale);
  if (!exam) notFound();

  const selection = resolveSelection(exam, messages, query);
  if (!selection) redirect(`/${locale}/exams/${slug}` as Route);

  return (
    <AppShell locale={locale} user={user}>
      <div className="app-page-header">
        <Link href={`/${locale}/exams/${slug}` as Route}>
          <ArrowLeft size={16} aria-hidden />
          {messages.result.backToExam}
        </Link>
        <h1>{exam.name}</h1>
      </div>

      <div className="admin-layout">
        <StartAttemptForm
          locale={locale}
          messages={messages}
          exam={exam}
          selection={selection}
        />
      </div>
    </AppShell>
  );
}
