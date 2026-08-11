import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { notFound, redirect } from "next/navigation";
import { ChevronDown, Eye, Search } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { isLocale } from "@/domain/common/locale";
import { getAuthMessages } from "@/i18n/auth-catalogs";
import { getQuizMessages } from "@/i18n/quiz-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";
import { getDiscoveryService } from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function ExamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const [{ locale }, { q, cursor }] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login` as Route);

  const messages = getQuizMessages(locale);
  const authMessages = getAuthMessages(locale);
  const { items, nextCursor } = await getDiscoveryService().listPublishedExams(
    { query: q, cursor, limit: 20 },
    locale,
  );

  const nextQuery = new URLSearchParams();
  if (q) nextQuery.set("q", q);
  if (nextCursor) nextQuery.set("cursor", nextCursor);

  return (
    <AppShell locale={locale} messages={messages} authMessages={authMessages}>
      <div className="app-page-header">
        <h1>{messages.exams.listTitle}</h1>
        <p>{messages.exams.listDescription}</p>
      </div>

      <form className="search-form" method="GET">
        <label className="sr-only" htmlFor="exam-search">
          {messages.exams.searchLabel}
        </label>
        <input
          id="exam-search"
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={messages.exams.searchLabel}
        />
        <button type="submit" className="button button-primary">
          <Search size={16} aria-hidden />
          {messages.exams.searchAction}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="admin-empty">{messages.exams.empty}</p>
      ) : (
        <div className="exam-grid">
          {items.map((exam) => (
            <article key={exam.id} className="exam-card">
              <h2>{exam.name}</h2>
              <p>{exam.description}</p>
              <div className="exam-card-meta">
                <span>
                  {messages.exams.topicsCount.replace(
                    "{count}",
                    String(exam.topicCount),
                  )}
                </span>
                <span>
                  {messages.exams.questionsCount.replace(
                    "{count}",
                    String(exam.publishedQuestionCount),
                  )}
                </span>
              </div>
              <Link
                href={`/${locale}/exams/${exam.slug}` as Route}
                className="button button-secondary"
              >
                <Eye size={16} aria-hidden />
                {messages.exams.viewAction}
              </Link>
            </article>
          ))}
        </div>
      )}

      {nextCursor && (
        <Link
          href={`/${locale}/exams?${nextQuery.toString()}` as Route}
          className="button button-secondary"
        >
          <ChevronDown size={16} aria-hidden />
          {messages.history.loadMore}
        </Link>
      )}
    </AppShell>
  );
}
