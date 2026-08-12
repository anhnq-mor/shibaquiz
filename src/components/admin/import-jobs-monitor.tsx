"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiFetch } from "@/components/api-activity";
import type { Locale } from "@/domain/common/locale";
import type { ImportJobDto, ImportJobStatus } from "@/domain/import/import";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

const ACTIVE_STATUSES = new Set<ImportJobStatus>([
  "UPLOADED",
  "VALIDATING",
  "VALIDATED",
  "COMMITTING",
  "CANCELLING",
]);

const CANCELLABLE_STATUSES = new Set<ImportJobStatus>([
  "UPLOADED",
  "VALIDATING",
  "VALIDATED",
  "COMMITTING",
]);

function statusLabel(status: ImportJobStatus, messages: AdminCatalog): string {
  const labels: Record<ImportJobStatus, string> = {
    UPLOADED: messages.imports.statusUploaded,
    VALIDATING: messages.imports.statusValidating,
    VALIDATED: messages.imports.statusValidated,
    COMMITTING: messages.imports.statusCommitting,
    CANCELLING: messages.imports.statusCancelling,
    CANCELLED: messages.imports.statusCancelled,
    COMPLETED: messages.imports.statusCompleted,
    FAILED: messages.imports.statusFailed,
  };
  return labels[status];
}

function logMessage(event: string, messages: AdminCatalog): string {
  const labels: Record<string, string> = {
    QUEUED: messages.imports.logQueued,
    STARTED: messages.imports.logStarted,
    COMPLETED: messages.imports.logCompleted,
    FAILED: messages.imports.logFailed,
    RETRIED: messages.imports.logRetried,
    RECOVERED: messages.imports.logRecovered,
    CANCELLING: messages.imports.logCancelling,
    CANCELLED: messages.imports.logCancelled,
  };
  return labels[event] ?? event;
}

export function ImportJobsMonitor({
  locale,
  messages,
}: {
  locale: Locale;
  messages: AdminCatalog;
}) {
  const [jobs, setJobs] = useState<ImportJobDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const lastKickAt = useRef(0);
  const hasActiveJobs = jobs.some((job) => ACTIVE_STATUSES.has(job.status));

  const withLocale = useCallback(
    (path: string) =>
      `${path}${path.includes("?") ? "&" : "?"}locale=${locale}`,
    [locale],
  );

  const loadJobs = useCallback(async () => {
    try {
      const response = await fetch(
        withLocale("/api/admin/imports/jobs?limit=50"),
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? messages.common.requestFailed);
      }
      const nextJobs = data.jobs as ImportJobDto[];
      setJobs(nextJobs);
      setError(null);
      if (
        nextJobs.some((job) => ACTIVE_STATUSES.has(job.status)) &&
        Date.now() - lastKickAt.current > 10_000
      ) {
        lastKickAt.current = Date.now();
        void fetch(withLocale("/api/admin/imports/jobs/run-next"), {
          method: "POST",
        });
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : messages.common.connectionError,
      );
    } finally {
      setLoading(false);
    }
  }, [
    messages.common.connectionError,
    messages.common.requestFailed,
    withLocale,
  ]);

  useEffect(() => {
    const initialTimeoutId = window.setTimeout(() => {
      void loadJobs();
    }, 0);
    const intervalId = window.setInterval(
      () => {
        void loadJobs();
      },
      hasActiveJobs ? 2_000 : 10_000,
    );
    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [hasActiveJobs, loadJobs]);

  async function retryJob(jobId: string) {
    setRetryingId(jobId);
    setError(null);
    try {
      const response = await apiFetch(
        withLocale(`/api/admin/imports/jobs/${jobId}/retry`),
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? messages.common.requestFailed);
      }
      await loadJobs();
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : messages.common.connectionError,
      );
    } finally {
      setRetryingId(null);
    }
  }

  async function cancelJob(jobId: string) {
    if (!window.confirm(messages.imports.cancelConfirm)) return;
    setCancellingId(jobId);
    setError(null);
    try {
      const response = await apiFetch(
        withLocale(`/api/admin/imports/jobs/${jobId}/cancel`),
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? messages.common.requestFailed);
      }
      await loadJobs();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : messages.common.connectionError,
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="admin-card import-jobs-monitor">
      <div className="admin-card-header">
        <h2>{messages.imports.jobsTitle}</h2>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => void loadJobs()}
          disabled={loading}
        >
          {messages.imports.refreshAction}
        </button>
      </div>

      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      {loading && jobs.length === 0 ? (
        <p role="status">{messages.imports.previewing}</p>
      ) : jobs.length === 0 ? (
        <p>{messages.imports.jobsEmpty}</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table import-jobs-table">
            <thead>
              <tr>
                <th scope="col">{messages.imports.fileNameLabel}</th>
                <th scope="col">{messages.common.status}</th>
                <th scope="col">{messages.imports.progressLabel}</th>
                <th scope="col">{messages.imports.resultLabel}</th>
                <th scope="col">{messages.imports.createdAtLabel}</th>
                <th scope="col">{messages.imports.logsLabel}</th>
                <th scope="col">{messages.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const active = ACTIVE_STATUSES.has(job.status);
                const progress =
                  job.totalRows > 0
                    ? Math.round((job.processedRows / job.totalRows) * 100)
                    : 0;
                return (
                  <tr key={job.id}>
                    <td>
                      <strong>{job.fileName}</strong>
                      <code className="admin-job-id">{job.id}</code>
                    </td>
                    <td>
                      <span
                        className={`import-job-status status-${job.status.toLowerCase()}`}
                        aria-live={active ? "polite" : undefined}
                      >
                        {statusLabel(job.status, messages)}
                      </span>
                      <small>
                        {messages.imports.attemptsLabel}: {job.attemptCount}
                      </small>
                    </td>
                    <td>
                      <progress
                        max={job.totalRows || 1}
                        value={job.processedRows}
                        aria-label={`${messages.imports.progressLabel}: ${progress}%`}
                      />
                      <small>
                        {job.processedRows}/{job.totalRows} ({progress}%)
                      </small>
                    </td>
                    <td>
                      <small>
                        {messages.imports.createdCountLabel}: {job.createdCount}
                        <br />
                        {messages.imports.updatedCountLabel}: {job.updatedCount}
                      </small>
                      {job.errorMessage && (
                        <p className="import-job-error">
                          {messages.imports.jobFailedMessage}
                        </p>
                      )}
                    </td>
                    <td>
                      <time dateTime={job.createdAt}>
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: "short",
                          timeStyle: "medium",
                        }).format(new Date(job.createdAt))}
                      </time>
                    </td>
                    <td>
                      <details>
                        <summary>
                          {messages.imports.logsLabel} ({job.logs.length})
                        </summary>
                        <ol className="import-job-logs">
                          {job.logs.map((log) => (
                            <li
                              key={log.id}
                              className={`log-${log.level.toLowerCase()}`}
                            >
                              <time dateTime={log.createdAt}>
                                {new Intl.DateTimeFormat(locale, {
                                  timeStyle: "medium",
                                }).format(new Date(log.createdAt))}
                              </time>{" "}
                              <strong>{log.event}</strong>:{" "}
                              {logMessage(log.event, messages)}
                            </li>
                          ))}
                        </ol>
                      </details>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        {job.status === "FAILED" && (
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => void retryJob(job.id)}
                            disabled={retryingId === job.id}
                          >
                            {retryingId === job.id
                              ? messages.imports.retrying
                              : messages.imports.retryAction}
                          </button>
                        )}
                        {CANCELLABLE_STATUSES.has(job.status) && (
                          <button
                            type="button"
                            className="button button-danger"
                            onClick={() => void cancelJob(job.id)}
                            disabled={cancellingId === job.id}
                          >
                            {cancellingId === job.id
                              ? messages.imports.cancelling
                              : messages.imports.cancelAction}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
