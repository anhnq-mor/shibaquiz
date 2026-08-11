"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Check, Globe, Pencil, Plus, X } from "lucide-react";

import { AdminDialog } from "@/components/admin/admin-dialog";
import { contentStatusTone } from "@/components/admin/status-tone";
import {
  adminApiRequest,
  AdminApiRequestError,
} from "@/components/admin/admin-api";
import type { AdminContentWorkspace } from "@/domain/admin/content";
import type { Locale } from "@/domain/common/locale";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

type Exam = AdminContentWorkspace["exams"][number];

interface ExamForm {
  code: string;
  slug: string;
  primaryLocale: Locale;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  viName: string;
  viDescription: string;
  includeEnglish: boolean;
  enName: string;
  enDescription: string;
}

function formFromExam(exam: Exam | null): ExamForm {
  const vi = exam?.translations.find((item) => item.locale === "vi");
  const en = exam?.translations.find((item) => item.locale === "en");
  return {
    code: exam?.code ?? "",
    slug: exam?.slug ?? "",
    primaryLocale: exam?.primaryLocale ?? "vi",
    status: exam?.status ?? "DRAFT",
    viName: vi?.name ?? "",
    viDescription: vi?.description ?? "",
    includeEnglish: Boolean(en) || exam?.primaryLocale === "en",
    enName: en?.name ?? "",
    enDescription: en?.description ?? "",
  };
}

export function ExamsEditor({
  locale,
  messages,
  exams,
}: {
  locale: Locale;
  messages: AdminCatalog;
  exams: Exam[];
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedExam = exams.find((exam) => exam.id === selectedId) ?? null;
  const [form, setForm] = useState<ExamForm>(() => formFromExam(null));
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const [localePending, setLocalePending] = useState(false);
  const [localeResult, setLocaleResult] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);

  function openDialog(exam: Exam | null) {
    setSelectedId(exam?.id ?? null);
    setForm(formFromExam(exam));
    setResult(null);
    setLocaleResult(null);
    dialogRef.current?.showModal();
  }

  const englishRequired = form.primaryLocale === "en" || form.includeEnglish;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setPending(true);
    try {
      const translations = [
        {
          locale: "vi" as const,
          name: form.viName,
          description: form.viDescription,
        },
        ...(englishRequired
          ? [
              {
                locale: "en" as const,
                name: form.enName,
                description: form.enDescription,
              },
            ]
          : []),
      ];
      await adminApiRequest("/api/admin/exams", locale, {
        body: {
          id: selectedExam?.id,
          code: form.code,
          slug: form.slug,
          primaryLocale: form.primaryLocale,
          status: form.status,
          translations,
        },
      });
      dialogRef.current?.close();
      router.refresh();
    } catch (error) {
      setResult({
        kind: "error",
        message:
          error instanceof AdminApiRequestError
            ? (error.body?.message ?? messages.common.requestFailed)
            : messages.common.connectionError,
      });
    } finally {
      setPending(false);
    }
  }

  async function enableEnglish() {
    if (!selectedExam) return;
    setLocaleResult(null);
    setLocalePending(true);
    try {
      const response = await adminApiRequest<{
        status: "ENABLED" | "ALREADY_ENABLED" | "INCOMPLETE";
        report: {
          missingExamTranslations: number;
          missingTopicTranslations: number;
          missingQuestionTranslations: number;
          missingOptionTranslations: number;
          missingTestTranslations: number;
          missingMediaAccessibilityTranslations: number;
        };
      }>(`/api/admin/exams/${selectedExam.id}/locales`, locale, {
        body: { locale: "en" },
      });
      if (response.status === "ENABLED") {
        setLocaleResult({
          kind: "success",
          message: messages.exams.enableEnglishEnabled,
        });
        router.refresh();
      } else if (response.status === "ALREADY_ENABLED") {
        setLocaleResult({
          kind: "success",
          message: messages.exams.enableEnglishAlready,
        });
      } else {
        const count = Object.values(response.report).reduce(
          (total, value) => total + value,
          0,
        );
        setLocaleResult({
          kind: "error",
          message: `${messages.exams.enableEnglishIncomplete} ${messages.exams.enableEnglishIncompleteCount.replace("{count}", String(count))}`,
        });
      }
    } catch (error) {
      setLocaleResult({
        kind: "error",
        message:
          error instanceof AdminApiRequestError
            ? (error.body?.message ?? messages.common.requestFailed)
            : messages.common.connectionError,
      });
    } finally {
      setLocalePending(false);
    }
  }

  return (
    <div className="admin-layout">
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>{messages.exams.listHeading}</h2>
          <button
            type="button"
            className="button button-primary"
            onClick={() => openDialog(null)}
          >
            <Plus size={16} aria-hidden />
            {messages.exams.newAction}
          </button>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{messages.common.code}</th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.common.primaryLocale}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.exams.enabledLocales}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.common.status}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.common.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td>{exam.code}</td>
                  <td className="admin-cell-nowrap">
                    {exam.primaryLocale.toUpperCase()}
                  </td>
                  <td className="admin-cell-nowrap">
                    {exam.enabledLocales
                      .map((item) => item.toUpperCase())
                      .join(", ")}
                  </td>
                  <td className="admin-cell-nowrap">
                    <span
                      className={`status-pill ${contentStatusTone(exam.status)}`}
                    >
                      {
                        {
                          DRAFT: messages.common.statusDraft,
                          PUBLISHED: messages.common.statusPublished,
                          ARCHIVED: messages.common.statusArchived,
                        }[exam.status]
                      }
                    </span>
                  </td>
                  <td className="admin-cell-nowrap">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => openDialog(exam)}
                      >
                        <Pencil size={16} aria-hidden />
                        {messages.common.edit}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {exams.length === 0 && (
            <p className="admin-empty">{messages.common.empty}</p>
          )}
        </div>
      </div>

      <AdminDialog dialogRef={dialogRef} titleId="exam-dialog-title">
        <h2 id="exam-dialog-title">
          {selectedExam ? messages.common.edit : messages.exams.newAction}
        </h2>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-inline-fields">
            <label>
              <span>{messages.common.code}</span>
              <input
                value={form.code}
                onChange={(event) =>
                  setForm({ ...form, code: event.target.value })
                }
                required
                maxLength={40}
              />
            </label>
            <label>
              <span>{messages.common.slug}</span>
              <input
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
                required
                maxLength={100}
              />
            </label>
          </div>
          <div className="admin-inline-fields">
            <label>
              <span>{messages.common.primaryLocale}</span>
              <select
                value={form.primaryLocale}
                onChange={(event) =>
                  setForm({
                    ...form,
                    primaryLocale: event.target.value as Locale,
                  })
                }
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              <span>{messages.common.status}</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as ExamForm["status"],
                  })
                }
              >
                <option value="DRAFT">{messages.common.statusDraft}</option>
                <option value="PUBLISHED">
                  {messages.common.statusPublished}
                </option>
                <option value="ARCHIVED">
                  {messages.common.statusArchived}
                </option>
              </select>
            </label>
          </div>

          <fieldset className="admin-fieldset">
            <legend>{messages.common.vietnameseTab}</legend>
            <label>
              <span>{messages.common.name}</span>
              <input
                value={form.viName}
                onChange={(event) =>
                  setForm({ ...form, viName: event.target.value })
                }
                required
                maxLength={200}
              />
            </label>
            <label>
              <span>{messages.common.description}</span>
              <textarea
                value={form.viDescription}
                onChange={(event) =>
                  setForm({ ...form, viDescription: event.target.value })
                }
                required
                maxLength={5000}
              />
            </label>
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>{messages.common.englishTab}</legend>
            {form.primaryLocale !== "en" && (
              <label className="admin-checkbox-field">
                <span>{messages.common.englishOptional}</span>
                <input
                  type="checkbox"
                  checked={form.includeEnglish}
                  onChange={(event) =>
                    setForm({ ...form, includeEnglish: event.target.checked })
                  }
                />
              </label>
            )}
            <label>
              <span>{messages.common.name}</span>
              <input
                value={form.enName}
                onChange={(event) =>
                  setForm({ ...form, enName: event.target.value })
                }
                required={englishRequired}
                disabled={!englishRequired}
                maxLength={200}
              />
            </label>
            <label>
              <span>{messages.common.description}</span>
              <textarea
                value={form.enDescription}
                onChange={(event) =>
                  setForm({ ...form, enDescription: event.target.value })
                }
                required={englishRequired}
                disabled={!englishRequired}
                maxLength={5000}
              />
            </label>
          </fieldset>

          {result && (
            <p
              className={`form-message ${result.kind}`}
              role={result.kind === "error" ? "alert" : "status"}
            >
              {result.message}
            </p>
          )}

          <div className="admin-form-actions">
            <button
              type="submit"
              className="button button-primary"
              disabled={pending}
            >
              <Check size={16} aria-hidden />
              {pending ? messages.common.saving : messages.common.save}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => dialogRef.current?.close()}
            >
              <X size={16} aria-hidden />
              {messages.common.cancel}
            </button>
          </div>
        </form>

        {selectedExam && !selectedExam.enabledLocales.includes("en") && (
          <div className="admin-form-actions admin-locale-action">
            <button
              type="button"
              className="button button-secondary"
              onClick={enableEnglish}
              disabled={localePending}
            >
              <Globe size={16} aria-hidden />
              {localePending
                ? messages.exams.enableEnglishWorking
                : messages.exams.enableEnglish}
            </button>
          </div>
        )}
        {localeResult && (
          <p
            className={`form-message ${localeResult.kind}`}
            role={localeResult.kind === "error" ? "alert" : "status"}
          >
            {localeResult.message}
          </p>
        )}
      </AdminDialog>
    </div>
  );
}
