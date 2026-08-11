"use client";

import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { useRef, useState, type FormEvent } from "react";

import { apiFetch } from "@/components/api-activity";
import type { AdminContentWorkspace } from "@/domain/admin/content";
import type { Locale } from "@/domain/common/locale";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

type Exam = AdminContentWorkspace["exams"][number];

type PreviewRow =
  | { rowNumber: number; status: "VALID"; externalId: string | null }
  | {
      rowNumber: number;
      status: "ERROR";
      externalId: string | null;
      errors: string[];
    };

type PreviewErrorRow = Extract<PreviewRow, { status: "ERROR" }>;

interface ImportSummary {
  totalRows: number;
  validCount: number;
  errorCount: number;
  rows: PreviewRow[];
}

type Step = "select" | "preview" | "result";

function localizedRowError(error: string, messages: AdminCatalog): string {
  const columns = error.split(":", 1)[0] ?? "";
  if (error.endsWith("at least one question content value is required")) {
    return `${columns}: ${messages.imports.questionContentRequiredError}`;
  }
  if (error.endsWith("at least one option content value is required")) {
    return `${columns}: ${messages.imports.optionContentRequiredError}`;
  }
  if (error.endsWith("at least one matching target value is required")) {
    return `${columns}: ${messages.imports.matchTargetRequiredError}`;
  }
  return error;
}

export function ImportWizard({
  locale,
  messages,
  exams,
}: {
  locale: Locale;
  messages: AdminCatalog;
  exams: Exam[];
}) {
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("select");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [result, setResult] = useState<{
    createdCount: number;
    updatedCount: number;
  } | null>(null);
  const previewErrorRows: PreviewErrorRow[] =
    summary?.rows.filter(
      (row): row is PreviewErrorRow => row.status === "ERROR",
    ) ?? [];

  function withLocale(path: string): string {
    return `${path}${path.includes("?") ? "&" : "?"}locale=${locale}`;
  }

  async function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!examId || !file) {
      setError(messages.imports.noFileError);
      return;
    }
    setPending(true);
    try {
      const formData = new FormData();
      formData.append("examId", examId);
      formData.append("file", file);
      const response = await apiFetch(
        withLocale("/api/admin/imports/preview"),
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (Array.isArray(data?.rows) && summary) {
          const commitErrorRows = data.rows as PreviewErrorRow[];
          setSummary({
            ...summary,
            validCount: Math.max(0, summary.totalRows - commitErrorRows.length),
            errorCount: commitErrorRows.length,
            rows: commitErrorRows,
          });
          setStep("preview");
        }
        throw new Error(data?.message ?? messages.common.requestFailed);
      }
      setSummary(data as ImportSummary);
      setStep("preview");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : messages.common.connectionError,
      );
    } finally {
      setPending(false);
    }
  }

  async function confirmCommit() {
    const file = fileInputRef.current?.files?.[0];
    if (!examId || !file) return;
    setError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.append("examId", examId);
      formData.append("file", file);
      const response = await apiFetch(withLocale("/api/admin/imports/commit"), {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? messages.common.requestFailed);
      }
      setResult(data);
      setStep("result");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : messages.common.connectionError,
      );
    } finally {
      setPending(false);
    }
  }

  function startOver() {
    setStep("select");
    setSummary(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="admin-layout">
      <div className="admin-card">
        {step === "select" && (
          <form className="admin-form" onSubmit={submitPreview}>
            <label>
              <span>{messages.imports.selectExamLabel}</span>
              <select
                value={examId}
                onChange={(event) => setExamId(event.target.value)}
                required
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{messages.imports.chooseFileLabel}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
              />
            </label>
            <div className="admin-form-actions">
              <a
                className="button button-secondary"
                href={withLocale("/api/admin/imports/template")}
              >
                {messages.imports.downloadTemplateAction}
              </a>
              {examId && (
                <a
                  className="button button-secondary"
                  href={withLocale(
                    `/api/admin/imports/export?examId=${examId}`,
                  )}
                >
                  {messages.imports.exportAction}
                </a>
              )}
            </div>

            {error && (
              <p className="form-message error" role="alert">
                {error}
              </p>
            )}

            <div className="admin-form-actions">
              <button
                type="submit"
                className="button button-primary"
                disabled={pending}
              >
                {pending
                  ? messages.imports.previewing
                  : messages.imports.previewAction}
              </button>
            </div>
          </form>
        )}

        {step === "preview" && summary && (
          <div>
            <h2>{messages.imports.previewHeading}</h2>
            <dl className="admin-dashboard-grid">
              <div className="admin-stat-card">
                <dt>{messages.imports.totalRowsLabel}</dt>
                <dd>{summary.totalRows}</dd>
              </div>
              <div className="admin-stat-card">
                <dt>{messages.imports.validRowsLabel}</dt>
                <dd>{summary.validCount}</dd>
              </div>
              <div className="admin-stat-card">
                <dt>{messages.imports.errorRowsLabel}</dt>
                <dd>{summary.errorCount}</dd>
              </div>
            </dl>

            {summary.errorCount > 0 && (
              <>
                <p className="form-message error" role="alert">
                  {messages.imports.fixErrorsNotice}{" "}
                  {messages.imports.errorRowNumbersLabel}:{" "}
                  {previewErrorRows.map((row) => row.rowNumber).join(", ")}.
                </p>
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th scope="col" className="admin-cell-nowrap">
                          {messages.imports.rowNumberLabel}
                        </th>
                        <th scope="col" className="admin-cell-nowrap">
                          {messages.imports.rowExternalIdLabel}
                        </th>
                        <th scope="col">{messages.imports.rowErrorsLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewErrorRows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="admin-cell-nowrap">{row.rowNumber}</td>
                          <td className="admin-cell-nowrap">
                            {row.externalId ?? "—"}
                          </td>
                          <td>
                            <ul>
                              {row.errors.map((rowError, index) => (
                                <li key={`${row.rowNumber}-${index}`}>
                                  {localizedRowError(rowError, messages)}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {error && (
              <p className="form-message error" role="alert">
                {error}
              </p>
            )}

            <div className="admin-form-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setStep("select")}
              >
                {messages.imports.backAction}
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={pending || summary.errorCount > 0}
                onClick={confirmCommit}
              >
                {pending
                  ? messages.imports.committing
                  : messages.imports.confirmAction}
              </button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div>
            <h2>{messages.imports.commitSuccessHeading}</h2>
            <dl className="admin-dashboard-grid">
              <div className="admin-stat-card">
                <dt>{messages.imports.createdCountLabel}</dt>
                <dd>{result.createdCount}</dd>
              </div>
              <div className="admin-stat-card">
                <dt>{messages.imports.updatedCountLabel}</dt>
                <dd>{result.updatedCount}</dd>
              </div>
            </dl>
            <div className="admin-form-actions">
              <Link
                href={`/${locale}/admin/questions` as Route}
                className="button button-primary"
              >
                {messages.imports.backToQuestions}
              </Link>
              <button
                type="button"
                className="button button-secondary"
                onClick={startOver}
              >
                {messages.imports.startOverAction}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
