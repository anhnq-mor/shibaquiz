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
  QuestionType,
} from "@/domain/admin/content";
import type { Locale } from "@/domain/common/locale";
import type { MediaAssetSummary } from "@/domain/media/media";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

type Exam = AdminContentWorkspace["exams"][number];
type Topic = AdminContentWorkspace["topics"][number];
type Question = AdminContentWorkspace["questions"][number];

const MAX_QUESTION_MEDIA = 5;

interface OptionRow {
  id?: string;
  label: string;
  isCorrect: boolean;
  viContent: string;
  enContent: string;
  viMatchContent: string;
  enMatchContent: string;
}

interface QuestionForm {
  examId: string;
  topicId: string;
  externalId: string;
  type: QuestionType;
  status: ContentStatus;
  viContent: string;
  viExplanation: string;
  includeEnglish: boolean;
  enContent: string;
  enExplanation: string;
  options: OptionRow[];
  mediaIds: string[];
}

function nextLabel(existing: string[]): string {
  for (let index = 0; index < 26; index += 1) {
    const candidate = String.fromCharCode(65 + index);
    if (!existing.includes(candidate)) return candidate;
  }
  return `O${existing.length}`;
}

function emptyOption(existingLabels: string[]): OptionRow {
  return {
    label: nextLabel(existingLabels),
    isCorrect: false,
    viContent: "",
    enContent: "",
    viMatchContent: "",
    enMatchContent: "",
  };
}

function firstTopicIdForExam(topics: Topic[], examId: string): string {
  return topics.find((topic) => topic.examId === examId)?.id ?? "";
}

function formFromQuestion(
  question: Question | null,
  defaultExamId: string,
  defaultTopicId: string,
): QuestionForm {
  const vi = question?.translations.find((item) => item.locale === "vi");
  const en = question?.translations.find((item) => item.locale === "en");
  return {
    examId: question?.examId ?? defaultExamId,
    topicId: question?.topicId ?? defaultTopicId,
    externalId: question?.externalId ?? "",
    type: question?.type ?? "SINGLE_CHOICE",
    status: question?.status ?? "DRAFT",
    viContent: vi?.content ?? "",
    viExplanation: vi?.explanation ?? "",
    includeEnglish: Boolean(en),
    enContent: en?.content ?? "",
    enExplanation: en?.explanation ?? "",
    options: question
      ? question.options.map((option) => ({
          id: option.id,
          label: option.label,
          isCorrect: option.isCorrect,
          viContent:
            option.translations.find((item) => item.locale === "vi")?.content ??
            "",
          enContent:
            option.translations.find((item) => item.locale === "en")?.content ??
            "",
          viMatchContent:
            option.translations.find((item) => item.locale === "vi")
              ?.matchContent ?? "",
          enMatchContent:
            option.translations.find((item) => item.locale === "en")
              ?.matchContent ?? "",
        }))
      : [emptyOption([]), emptyOption(["A"])],
    mediaIds: question
      ? [...question.media]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((item) => item.mediaAssetId)
      : [],
  };
}

export function QuestionsEditor({
  locale,
  messages,
  exams,
  topics,
  questions,
  readyMedia,
}: {
  locale: Locale;
  messages: AdminCatalog;
  exams: Exam[];
  topics: Topic[];
  questions: Question[];
  readyMedia: MediaAssetSummary[];
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const examsById = useMemo(
    () => new Map(exams.map((exam) => [exam.id, exam])),
    [exams],
  );
  const topicsById = useMemo(
    () => new Map(topics.map((topic) => [topic.id, topic])),
    [topics],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedQuestion =
    questions.find((question) => question.id === selectedId) ?? null;
  const [form, setForm] = useState<QuestionForm>(() => {
    const defaultExamId = exams[0]?.id ?? "";
    return formFromQuestion(
      null,
      defaultExamId,
      firstTopicIdForExam(topics, defaultExamId),
    );
  });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const [listResult, setListResult] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);

  const [filterExam, setFilterExam] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");

  const filteredQuestions = questions.filter((question) => {
    if (filterExam && question.examId !== filterExam) return false;
    if (filterTopic && question.topicId !== filterTopic) return false;
    if (filterType && question.type !== filterType) return false;
    if (filterStatus && question.status !== filterStatus) return false;
    if (filterKeyword) {
      const keyword = filterKeyword.trim().toLowerCase();
      const matches = question.translations.some(
        (translation) =>
          translation.content.toLowerCase().includes(keyword) ||
          translation.explanation.toLowerCase().includes(keyword),
      );
      if (!matches) return false;
    }
    return true;
  });

  const availableTopics = topics.filter(
    (topic) => topic.examId === form.examId,
  );
  const selectedExam = examsById.get(form.examId);
  const requiredLocales = selectedExam
    ? requiredLocalesForStatus(selectedExam, form.status)
    : (["vi"] as Locale[]);
  const englishRequired = requiredLocales.includes("en") || form.includeEnglish;

  function openDialog(question: Question | null) {
    setSelectedId(question?.id ?? null);
    const defaultExamId = exams[0]?.id ?? "";
    setForm(
      formFromQuestion(
        question,
        defaultExamId,
        firstTopicIdForExam(topics, defaultExamId),
      ),
    );
    setResult(null);
    dialogRef.current?.showModal();
  }

  function updateOption(index: number, patch: Partial<OptionRow>) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    }));
  }

  function addOption() {
    setForm((current) => ({
      ...current,
      options: [
        ...current.options,
        emptyOption(current.options.map((option) => option.label)),
      ],
    }));
  }

  function moveOption(index: number, direction: -1 | 1) {
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.options.length) return current;
      const options = [...current.options];
      [options[index], options[target]] = [options[target]!, options[index]!];
      return { ...current, options };
    });
  }

  function changeType(type: QuestionType) {
    setForm((current) => {
      if (type !== "TRUE_FALSE") {
        return {
          ...current,
          type,
          options: current.options.map((option) => ({
            ...option,
            isCorrect:
              type === "MATCHING" || type === "ORDERING"
                ? false
                : option.isCorrect,
          })),
        };
      }
      const first = current.options[0] ?? emptyOption([]);
      const second = current.options[1] ?? emptyOption(["TRUE"]);
      return {
        ...current,
        type,
        options: [
          {
            ...first,
            label: "TRUE",
            viContent: first.viContent || "Đúng",
            enContent: first.enContent || "True",
            isCorrect: true,
          },
          {
            ...second,
            label: "FALSE",
            viContent: second.viContent || "Sai",
            enContent: second.enContent || "False",
            isCorrect: false,
          },
        ],
      };
    });
  }

  function questionTypeLabel(type: QuestionType): string {
    return {
      SINGLE_CHOICE: messages.questions.typeSingle,
      MULTIPLE_CHOICE: messages.questions.typeMultiple,
      TRUE_FALSE: messages.questions.typeTrueFalse,
      MATCHING: messages.questions.typeMatching,
      ORDERING: messages.questions.typeOrdering,
    }[type];
  }

  function removeOption(index: number) {
    setForm((current) => ({
      ...current,
      options: current.options.filter(
        (_, optionIndex) => optionIndex !== index,
      ),
    }));
  }

  function toggleMedia(mediaAssetId: string) {
    setForm((current) => {
      if (current.mediaIds.includes(mediaAssetId)) {
        return {
          ...current,
          mediaIds: current.mediaIds.filter((id) => id !== mediaAssetId),
        };
      }
      if (current.mediaIds.length >= MAX_QUESTION_MEDIA) return current;
      return { ...current, mediaIds: [...current.mediaIds, mediaAssetId] };
    });
  }

  function moveMedia(index: number, direction: -1 | 1) {
    setForm((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.mediaIds.length) return current;
      const mediaIds = [...current.mediaIds];
      [mediaIds[index], mediaIds[target]] = [
        mediaIds[target]!,
        mediaIds[index]!,
      ];
      return { ...current, mediaIds };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setPending(true);
    try {
      const translations = [
        {
          locale: "vi" as const,
          content: form.viContent,
          explanation: form.viExplanation,
        },
        ...(englishRequired
          ? [
              {
                locale: "en" as const,
                content: form.enContent,
                explanation: form.enExplanation,
              },
            ]
          : []),
      ];
      const options = form.options.map((option, index) => ({
        label: option.label,
        isCorrect: option.isCorrect,
        displayOrder: index,
        translations: [
          {
            locale: "vi" as const,
            content: option.viContent,
            matchContent:
              form.type === "MATCHING" ? option.viMatchContent : null,
          },
          ...(englishRequired
            ? [
                {
                  locale: "en" as const,
                  content: option.enContent,
                  matchContent:
                    form.type === "MATCHING" ? option.enMatchContent : null,
                },
              ]
            : []),
        ],
      }));
      await adminApiRequest("/api/admin/questions", locale, {
        body: {
          id: selectedQuestion?.id,
          externalId: form.externalId || null,
          examId: form.examId,
          topicId: form.topicId,
          type: form.type,
          status: form.status,
          translations,
          options,
          mediaIds: form.mediaIds,
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

  async function deleteQuestion(question: Question) {
    if (!window.confirm(messages.common.deleteConfirm)) return;
    try {
      await adminApiRequest(`/api/admin/questions/${question.id}`, locale, {
        method: "DELETE",
      });
      setListResult({ kind: "success", message: messages.common.deleted });
      router.refresh();
    } catch (error) {
      setListResult({
        kind: "error",
        message:
          error instanceof AdminApiRequestError
            ? (error.body?.message ?? messages.common.requestFailed)
            : messages.common.connectionError,
      });
    }
  }

  return (
    <div className="admin-layout">
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>{messages.questions.listHeading}</h2>
          <button
            type="button"
            className="button button-primary"
            onClick={() => openDialog(null)}
          >
            {messages.questions.newAction}
          </button>
        </div>
        <div className="admin-toolbar">
          <label>
            <span>{messages.common.exam}</span>
            <select
              value={filterExam}
              onChange={(event) => setFilterExam(event.target.value)}
            >
              <option value="">{messages.questions.filterAll}</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{messages.common.topic}</span>
            <select
              value={filterTopic}
              onChange={(event) => setFilterTopic(event.target.value)}
            >
              <option value="">{messages.questions.filterAll}</option>
              {topics
                .filter((topic) => !filterExam || topic.examId === filterExam)
                .map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.slug}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>{messages.questions.filterType}</span>
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
            >
              <option value="">{messages.questions.filterAll}</option>
              <option value="SINGLE_CHOICE">
                {messages.questions.typeSingle}
              </option>
              <option value="MULTIPLE_CHOICE">
                {messages.questions.typeMultiple}
              </option>
              <option value="TRUE_FALSE">
                {messages.questions.typeTrueFalse}
              </option>
              <option value="MATCHING">
                {messages.questions.typeMatching}
              </option>
              <option value="ORDERING">
                {messages.questions.typeOrdering}
              </option>
            </select>
          </label>
          <label>
            <span>{messages.questions.filterStatus}</span>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="">{messages.questions.filterAll}</option>
              <option value="DRAFT">{messages.common.statusDraft}</option>
              <option value="PUBLISHED">
                {messages.common.statusPublished}
              </option>
              <option value="ARCHIVED">{messages.common.statusArchived}</option>
            </select>
          </label>
          <label>
            <span>{messages.questions.filterKeyword}</span>
            <input
              value={filterKeyword}
              onChange={(event) => setFilterKeyword(event.target.value)}
            />
          </label>
        </div>

        {listResult && (
          <p
            className={`form-message ${listResult.kind}`}
            role={listResult.kind === "error" ? "alert" : "status"}
          >
            {listResult.message}
          </p>
        )}

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.common.exam}
                </th>
                <th scope="col">{messages.common.topic}</th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.questions.type}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.common.status}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.questions.version}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.common.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((question) => (
                <tr key={question.id}>
                  <td className="admin-cell-nowrap">
                    {examsById.get(question.examId)?.code ?? question.examId}
                  </td>
                  <td>
                    {topicsById.get(question.topicId)?.slug ?? question.topicId}
                  </td>
                  <td className="admin-cell-nowrap">
                    {questionTypeLabel(question.type)}
                  </td>
                  <td className="admin-cell-nowrap">
                    <span className="status-pill">
                      {
                        {
                          DRAFT: messages.common.statusDraft,
                          PUBLISHED: messages.common.statusPublished,
                          ARCHIVED: messages.common.statusArchived,
                        }[question.status]
                      }
                    </span>
                  </td>
                  <td className="admin-cell-nowrap">{question.version}</td>
                  <td className="admin-cell-nowrap">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => openDialog(question)}
                        disabled={Boolean(question.deletedAt)}
                      >
                        {messages.common.edit}
                      </button>
                      {!question.deletedAt && (
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => void deleteQuestion(question)}
                        >
                          {messages.common.delete}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredQuestions.length === 0 && (
            <p className="admin-empty">{messages.common.empty}</p>
          )}
        </div>
      </div>

      <AdminDialog dialogRef={dialogRef} titleId="question-dialog-title">
        <h2 id="question-dialog-title">
          {selectedQuestion
            ? messages.common.edit
            : messages.questions.newAction}
        </h2>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-inline-fields">
            <label>
              <span>{messages.common.selectExam}</span>
              <select
                value={form.examId}
                onChange={(event) => {
                  const examId = event.target.value;
                  const firstTopic = topics.find(
                    (topic) => topic.examId === examId,
                  );
                  setForm({ ...form, examId, topicId: firstTopic?.id ?? "" });
                }}
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
              <span>{messages.common.selectTopic}</span>
              <select
                value={form.topicId}
                onChange={(event) =>
                  setForm({ ...form, topicId: event.target.value })
                }
                required
              >
                {availableTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.slug}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-inline-fields">
            <label>
              <span>{messages.questions.type}</span>
              <select
                value={form.type}
                onChange={(event) =>
                  changeType(event.target.value as QuestionType)
                }
              >
                <option value="SINGLE_CHOICE">
                  {messages.questions.typeSingle}
                </option>
                <option value="MULTIPLE_CHOICE">
                  {messages.questions.typeMultiple}
                </option>
                <option value="TRUE_FALSE">
                  {messages.questions.typeTrueFalse}
                </option>
                <option value="MATCHING">
                  {messages.questions.typeMatching}
                </option>
                <option value="ORDERING">
                  {messages.questions.typeOrdering}
                </option>
              </select>
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
            <label>
              <span>{messages.questions.externalId}</span>
              <input
                value={form.externalId}
                onChange={(event) =>
                  setForm({ ...form, externalId: event.target.value })
                }
                maxLength={100}
              />
            </label>
          </div>

          <fieldset className="admin-fieldset">
            <legend>{messages.common.vietnameseTab}</legend>
            <label>
              <span>{messages.questions.content}</span>
              <textarea
                value={form.viContent}
                onChange={(event) =>
                  setForm({ ...form, viContent: event.target.value })
                }
                required
                maxLength={10000}
              />
            </label>
            <label>
              <span>{messages.questions.explanation}</span>
              <textarea
                value={form.viExplanation}
                onChange={(event) =>
                  setForm({ ...form, viExplanation: event.target.value })
                }
                required
                maxLength={20000}
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
              <span>{messages.questions.content}</span>
              <textarea
                value={form.enContent}
                onChange={(event) =>
                  setForm({ ...form, enContent: event.target.value })
                }
                required={englishRequired}
                disabled={!englishRequired}
                maxLength={10000}
              />
            </label>
            <label>
              <span>{messages.questions.explanation}</span>
              <textarea
                value={form.enExplanation}
                onChange={(event) =>
                  setForm({ ...form, enExplanation: event.target.value })
                }
                required={englishRequired}
                disabled={!englishRequired}
                maxLength={20000}
              />
            </label>
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>{messages.questions.options}</legend>
            {form.type === "ORDERING" && (
              <p className="admin-hint">{messages.questions.orderingHint}</p>
            )}
            {form.options.map((option, index) => (
              <div className="admin-option-row" key={index}>
                <label>
                  <span>{messages.questions.optionLabel}</span>
                  <input
                    value={option.label}
                    onChange={(event) =>
                      updateOption(index, { label: event.target.value })
                    }
                    required
                    maxLength={8}
                  />
                </label>
                <div className="admin-option-translations">
                  <label>
                    <span>{`${messages.questions.optionText} (${messages.common.vietnameseTab})`}</span>
                    <textarea
                      value={option.viContent}
                      onChange={(event) =>
                        updateOption(index, { viContent: event.target.value })
                      }
                      required
                      maxLength={10000}
                    />
                  </label>
                  {englishRequired && (
                    <label>
                      <span>{`${messages.questions.optionText} (${messages.common.englishTab})`}</span>
                      <textarea
                        value={option.enContent}
                        onChange={(event) =>
                          updateOption(index, { enContent: event.target.value })
                        }
                        required
                        maxLength={10000}
                      />
                    </label>
                  )}
                </div>
                {form.type === "MATCHING" && (
                  <div className="admin-option-translations">
                    <label>
                      <span>{`${messages.questions.matchTargetText} (${messages.common.vietnameseTab})`}</span>
                      <textarea
                        value={option.viMatchContent}
                        onChange={(event) =>
                          updateOption(index, {
                            viMatchContent: event.target.value,
                          })
                        }
                        required
                        maxLength={10000}
                      />
                    </label>
                    {englishRequired && (
                      <label>
                        <span>{`${messages.questions.matchTargetText} (${messages.common.englishTab})`}</span>
                        <textarea
                          value={option.enMatchContent}
                          onChange={(event) =>
                            updateOption(index, {
                              enMatchContent: event.target.value,
                            })
                          }
                          required
                          maxLength={10000}
                        />
                      </label>
                    )}
                  </div>
                )}
                {(form.type === "SINGLE_CHOICE" ||
                  form.type === "MULTIPLE_CHOICE" ||
                  form.type === "TRUE_FALSE") && (
                  <label className="admin-checkbox-field">
                    <span>{messages.questions.optionCorrect}</span>
                    <input
                      type={
                        form.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"
                      }
                      name="question-correct-option"
                      checked={option.isCorrect}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          options: current.options.map(
                            (candidate, candidateIndex) => ({
                              ...candidate,
                              isCorrect:
                                form.type === "MULTIPLE_CHOICE"
                                  ? candidateIndex === index
                                    ? event.target.checked
                                    : candidate.isCorrect
                                  : candidateIndex === index,
                            }),
                          ),
                        }))
                      }
                    />
                  </label>
                )}
                {form.type === "ORDERING" && (
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => moveOption(index, -1)}
                      disabled={index === 0}
                    >
                      {messages.common.moveUp}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => moveOption(index, 1)}
                      disabled={index === form.options.length - 1}
                    >
                      {messages.common.moveDown}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => removeOption(index)}
                  disabled={
                    form.options.length <= 2 || form.type === "TRUE_FALSE"
                  }
                >
                  {messages.questions.removeOption}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button button-secondary"
              onClick={addOption}
              disabled={
                form.type === "TRUE_FALSE" ||
                form.options.length >= (form.type === "SINGLE_CHOICE" ? 6 : 20)
              }
            >
              {messages.questions.addOption}
            </button>
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>{messages.questions.mediaHeading}</legend>
            {readyMedia.length === 0 ? (
              <p className="admin-empty">{messages.questions.mediaEmpty}</p>
            ) : (
              <ul className="admin-media-picker">
                {readyMedia.map((asset) => {
                  const selectedIndex = form.mediaIds.indexOf(asset.id);
                  const isSelected = selectedIndex !== -1;
                  return (
                    <li key={asset.id}>
                      <label className="admin-checkbox-field">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={
                            !isSelected &&
                            form.mediaIds.length >= MAX_QUESTION_MEDIA
                          }
                          onChange={() => toggleMedia(asset.id)}
                        />
                        <span>{asset.originalFileName}</span>
                      </label>
                      {isSelected && (
                        <div className="admin-row-actions">
                          <span>{selectedIndex + 1}</span>
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => moveMedia(selectedIndex, -1)}
                            disabled={selectedIndex === 0}
                          >
                            {messages.common.moveUp}
                          </button>
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => moveMedia(selectedIndex, 1)}
                            disabled={
                              selectedIndex === form.mediaIds.length - 1
                            }
                          >
                            {messages.common.moveDown}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {form.mediaIds.length >= MAX_QUESTION_MEDIA && (
              <p className="form-message">
                {messages.questions.mediaLimitReached}
              </p>
            )}
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
              disabled={pending || !form.examId || !form.topicId}
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
