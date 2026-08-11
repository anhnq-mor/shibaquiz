import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { notFound, redirect } from "next/navigation";
import { ChevronDown, Filter, Play, RotateCcw, Eye } from "lucide-react";

import { AppShell } from "@/components/app/app-shell";
import { attemptStatusTone } from "@/components/app/status-tone";
import {
  attemptModes,
  attemptStatuses,
  historyFilterSchema,
} from "@/domain/attempts/attempt";
import { isLocale } from "@/domain/common/locale";
import { formatDateTime, formatPercent } from "@/i18n/format";
import { getAuthMessages } from "@/i18n/auth-catalogs";
import { getQuizMessages, type QuizCatalog } from "@/i18n/quiz-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";
import {
  getAttemptService,
  getDiscoveryService,
} from "@/server/content/runtime";

export const dynamic = "force-dynamic";

function statusLabel(
  status: (typeof attemptStatuses)[number],
  messages: QuizCatalog,
): string {
  return {
    IN_PROGRESS: messages.common.statusInProgress,
    SUBMITTED: messages.common.statusSubmitted,
    EXPIRED: messages.common.statusExpired,
    ABANDONED: messages.common.statusAbandoned,
  }[status];
}

function modeLabel(
  mode: (typeof attemptModes)[number],
  messages: QuizCatalog,
): string {
  return {
    STUDY: messages.common.modeStudy,
    PRACTICE_IMMEDIATE: messages.common.modePracticeImmediate,
    EXAM_DEFERRED: messages.common.modeExamDeferred,
  }[mode];
}

function toIsoStart(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function toIsoEnd(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    examId?: string;
    mode?: string;
    status?: string;
    from?: string;
    to?: string;
    cursor?: string;
  }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login` as Route);

  const messages = getQuizMessages(locale);
  const authMessages = getAuthMessages(locale);

  const parsedFilters = historyFilterSchema.safeParse({
    examId: query.examId || undefined,
    mode: query.mode || undefined,
    status: query.status || undefined,
    from: toIsoStart(query.from),
    to: toIsoEnd(query.to),
    cursor: query.cursor || undefined,
    limit: 20,
  });
  const filters = parsedFilters.success
    ? parsedFilters.data
    : { limit: 20 as const };

  const [{ items, nextCursor }, examOptions] = await Promise.all([
    getAttemptService().listHistory(user.id, filters),
    getDiscoveryService().listPublishedExams({ limit: 50 }, locale),
  ]);

  const nextQuery = new URLSearchParams();
  if (query.examId) nextQuery.set("examId", query.examId);
  if (query.mode) nextQuery.set("mode", query.mode);
  if (query.status) nextQuery.set("status", query.status);
  if (query.from) nextQuery.set("from", query.from);
  if (query.to) nextQuery.set("to", query.to);
  if (nextCursor) nextQuery.set("cursor", nextCursor);

  return (
    <AppShell locale={locale} messages={messages} authMessages={authMessages}>
      <div className="app-page-header">
        <h1>{messages.history.title}</h1>
        <p>{messages.history.description}</p>
      </div>

      <form className="filter-form" method="GET">
        <label>
          <span>{messages.history.filterExam}</span>
          <select name="examId" defaultValue={query.examId ?? ""}>
            <option value="">{messages.history.filterAll}</option>
            {examOptions.items.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{messages.history.filterMode}</span>
          <select name="mode" defaultValue={query.mode ?? ""}>
            <option value="">{messages.history.filterAll}</option>
            {attemptModes.map((mode) => (
              <option key={mode} value={mode}>
                {modeLabel(mode, messages)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{messages.history.filterStatus}</span>
          <select name="status" defaultValue={query.status ?? ""}>
            <option value="">{messages.history.filterAll}</option>
            {attemptStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status, messages)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{messages.history.filterFrom}</span>
          <input type="date" name="from" defaultValue={query.from ?? ""} />
        </label>
        <label>
          <span>{messages.history.filterTo}</span>
          <input type="date" name="to" defaultValue={query.to ?? ""} />
        </label>
        <div className="filter-form-actions">
          <button type="submit" className="button button-primary">
            <Filter size={16} aria-hidden />
            {messages.history.filterApply}
          </button>
          <Link
            href={`/${locale}/history` as Route}
            className="button button-secondary"
          >
            <RotateCcw size={16} aria-hidden />
            {messages.history.filterReset}
          </Link>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="admin-empty">{messages.history.empty}</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{messages.history.tableExam}</th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.history.tableMode}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.history.tableStatus}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.history.tableScore}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.history.tableStarted}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.history.tableDuration}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.history.tableActions}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.attemptId}>
                  <td>
                    {item.examName}
                    {item.testName ? ` — ${item.testName}` : ""}
                  </td>
                  <td className="admin-cell-nowrap">
                    {modeLabel(item.mode, messages)}
                  </td>
                  <td className="admin-cell-nowrap">
                    <span
                      className={`status-pill ${attemptStatusTone(item.status)}`}
                    >
                      {statusLabel(item.status, messages)}
                    </span>
                  </td>
                  <td className="admin-cell-nowrap">
                    {item.scorePercent === null
                      ? "—"
                      : formatPercent(item.scorePercent / 100, locale)}
                  </td>
                  <td className="admin-cell-nowrap">
                    {formatDateTime(item.startedAt, locale)}
                  </td>
                  <td className="admin-cell-nowrap">
                    {item.durationSeconds === null
                      ? "—"
                      : `${Math.round(item.durationSeconds / 60)}m`}
                  </td>
                  <td className="admin-cell-nowrap">
                    {item.status === "IN_PROGRESS" ? (
                      <Link
                        href={`/${locale}/attempts/${item.attemptId}` as Route}
                        className="button button-secondary"
                      >
                        <Play size={16} aria-hidden />
                        {messages.history.continueAction}
                      </Link>
                    ) : item.status !== "ABANDONED" ? (
                      <Link
                        href={
                          `/${locale}/attempts/${item.attemptId}/result` as Route
                        }
                        className="button button-secondary"
                      >
                        <Eye size={16} aria-hidden />
                        {messages.history.viewAction}
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && (
        <Link
          href={`/${locale}/history?${nextQuery.toString()}` as Route}
          className="button button-secondary"
        >
          <ChevronDown size={16} aria-hidden />
          {messages.history.loadMore}
        </Link>
      )}
    </AppShell>
  );
}
