import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { attemptStatusTone } from "@/components/app/status-tone";
import {
  StartAttemptForm,
  type AttemptSelection,
} from "@/components/app/start-attempt-form";
import {
  attemptScopes,
  type TopicAttemptHistoryItem,
} from "@/domain/attempts/attempt";
import { isLocale, type Locale } from "@/domain/common/locale";
import { formatDateTime, formatPercent } from "@/i18n/format";
import { getQuizMessages, type QuizCatalog } from "@/i18n/quiz-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";
import {
  getAttemptService,
  getDiscoveryService,
} from "@/server/content/runtime";
import type { PublishedExamDetail } from "@/domain/discovery/discovery";

const TOPIC_ATTEMPT_HISTORY_PREVIEW_COUNT = 10;

function topicAttemptHistoryStatusLabel(
  status: TopicAttemptHistoryItem["status"],
  messages: QuizCatalog,
): string {
  return status === "EXPIRED"
    ? messages.common.statusExpired
    : messages.common.statusSubmitted;
}

function topicAttemptHistoryModeLabel(
  mode: TopicAttemptHistoryItem["mode"],
  messages: QuizCatalog,
): string {
  return mode === "EXAM_DEFERRED"
    ? messages.common.modeExamDeferred
    : messages.common.modePracticeImmediate;
}

function TopicAttemptHistory({
  items,
  locale,
  messages,
  examId,
}: {
  items: TopicAttemptHistoryItem[];
  locale: Locale;
  messages: QuizCatalog;
  examId: string;
}) {
  if (items.length === 0) return null;
  const preview = items.slice(0, TOPIC_ATTEMPT_HISTORY_PREVIEW_COUNT);
  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2>{messages.exams.topicAttemptHistoryHeading}</h2>
      </div>
      <ul className="topic-exam-history-list">
        {preview.map((item) => (
          <li key={item.attemptId}>
            <Link
              href={`/${locale}/attempts/${item.attemptId}/result` as Route}
            >
              <span>
                {formatDateTime(item.submittedAt ?? item.startedAt, locale)}
              </span>
              <span>{topicAttemptHistoryModeLabel(item.mode, messages)}</span>
              <span className={`status-pill ${attemptStatusTone(item.status)}`}>
                {topicAttemptHistoryStatusLabel(item.status, messages)}
              </span>
              <span>{formatPercent(item.scorePercent / 100, locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {items.length > TOPIC_ATTEMPT_HISTORY_PREVIEW_COUNT && (
        <Link
          href={`/${locale}/history?examId=${examId}` as Route}
          className="button button-secondary"
        >
          {messages.exams.topicAttemptHistoryViewAllAction}
          <ChevronRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}

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

  const topicAttemptHistory =
    selection.scope === "TOPIC" && selection.topicId
      ? ((await getAttemptService().getTopicAttemptHistory(
          user.id,
          exam.id,
        ))[selection.topicId] ?? [])
      : [];

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
        <TopicAttemptHistory
          items={topicAttemptHistory}
          locale={locale}
          messages={messages}
          examId={exam.id}
        />
      </div>
    </AppShell>
  );
}
