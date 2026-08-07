"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";

import { AdminDialog } from "@/components/admin/admin-dialog";
import {
  adminApiRequest,
  AdminApiRequestError,
} from "@/components/admin/admin-api";
import { requiredLocalesForStatus } from "@/components/admin/translation-rules";
import type {
  AdminContentWorkspace,
  ContentStatus,
} from "@/domain/admin/content";
import type { Locale } from "@/domain/common/locale";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

type Exam = AdminContentWorkspace["exams"][number];
type Topic = AdminContentWorkspace["topics"][number];

interface TopicForm {
  examId: string;
  slug: string;
  displayOrder: string;
  status: ContentStatus;
  viName: string;
  viDescription: string;
  includeEnglish: boolean;
  enName: string;
  enDescription: string;
}

function formFromTopic(topic: Topic | null, defaultExamId: string): TopicForm {
  const vi = topic?.translations.find((item) => item.locale === "vi");
  const en = topic?.translations.find((item) => item.locale === "en");
  return {
    examId: topic?.examId ?? defaultExamId,
    slug: topic?.slug ?? "",
    displayOrder: String(topic?.displayOrder ?? 0),
    status: topic?.status ?? "DRAFT",
    viName: vi?.name ?? "",
    viDescription: vi?.description ?? "",
    includeEnglish: Boolean(en),
    enName: en?.name ?? "",
    enDescription: en?.description ?? "",
  };
}

export function TopicsEditor({
  locale,
  messages,
  exams,
  topics,
}: {
  locale: Locale;
  messages: AdminCatalog;
  exams: Exam[];
  topics: Topic[];
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedTopic = topics.find((topic) => topic.id === selectedId) ?? null;
  const [form, setForm] = useState<TopicForm>(() =>
    formFromTopic(null, exams[0]?.id ?? ""),
  );
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);

  const examsById = useMemo(
    () => new Map(exams.map((exam) => [exam.id, exam])),
    [exams],
  );
  const selectedExam = examsById.get(form.examId);
  const requiredLocales = selectedExam
    ? requiredLocalesForStatus(selectedExam, form.status)
    : (["vi"] as Locale[]);
  const englishRequired = requiredLocales.includes("en") || form.includeEnglish;

  function openDialog(topic: Topic | null) {
    setSelectedId(topic?.id ?? null);
    setForm(formFromTopic(topic, exams[0]?.id ?? ""));
    setResult(null);
    dialogRef.current?.showModal();
  }

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
      await adminApiRequest("/api/admin/topics", locale, {
        body: {
          id: selectedTopic?.id,
          examId: form.examId,
          slug: form.slug,
          displayOrder: Number(form.displayOrder),
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

  return (
    <div className="admin-layout">
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>{messages.topics.listHeading}</h2>
          <button
            type="button"
            className="button button-primary"
            onClick={() => openDialog(null)}
          >
            {messages.topics.newAction}
          </button>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{messages.common.exam}</th>
                <th scope="col">{messages.common.slug}</th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.topics.displayOrder}
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
              {topics.map((topic) => (
                <tr key={topic.id}>
                  <td className="admin-cell-nowrap">
                    {examsById.get(topic.examId)?.code ?? topic.examId}
                  </td>
                  <td>{topic.slug}</td>
                  <td className="admin-cell-nowrap">{topic.displayOrder}</td>
                  <td className="admin-cell-nowrap">
                    <span className="status-pill">
                      {
                        {
                          DRAFT: messages.common.statusDraft,
                          PUBLISHED: messages.common.statusPublished,
                          ARCHIVED: messages.common.statusArchived,
                        }[topic.status]
                      }
                    </span>
                  </td>
                  <td className="admin-cell-nowrap">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => openDialog(topic)}
                      >
                        {messages.common.edit}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {topics.length === 0 && (
            <p className="admin-empty">{messages.common.empty}</p>
          )}
        </div>
      </div>

      <AdminDialog dialogRef={dialogRef} titleId="topic-dialog-title">
        <h2 id="topic-dialog-title">
          {selectedTopic ? messages.common.edit : messages.topics.newAction}
        </h2>
        <form className="admin-form" onSubmit={submit}>
          <label>
            <span>{messages.common.selectExam}</span>
            <select
              value={form.examId}
              onChange={(event) =>
                setForm({ ...form, examId: event.target.value })
              }
              required
            >
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.code}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-inline-fields">
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
            <label>
              <span>{messages.topics.displayOrder}</span>
              <input
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(event) =>
                  setForm({ ...form, displayOrder: event.target.value })
                }
                required
              />
            </label>
            <label>
              <span>{messages.common.status}</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as ContentStatus,
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
            {!requiredLocales.includes("en") && (
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
              disabled={pending || !form.examId}
            >
              {pending ? messages.common.saving : messages.common.save}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => dialogRef.current?.close()}
            >
              {messages.common.cancel}
            </button>
          </div>
        </form>
      </AdminDialog>
    </div>
  );
}
