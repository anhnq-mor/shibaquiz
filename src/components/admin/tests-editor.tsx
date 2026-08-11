"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { AdminDialog } from "@/components/admin/admin-dialog";
import { contentStatusTone } from "@/components/admin/status-tone";
import {
  adminApiRequest,
  AdminApiRequestError,
} from "@/components/admin/admin-api";
import { requiredLocalesForStatus } from "@/components/admin/translation-rules";
import type {
  AdminContentWorkspace,
  ContentStatus,
  TestAllocationPreview,
  TestType,
} from "@/domain/admin/content";
import type { Locale } from "@/domain/common/locale";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

type Exam = AdminContentWorkspace["exams"][number];
type Topic = AdminContentWorkspace["topics"][number];
type Question = AdminContentWorkspace["questions"][number];
type Test = AdminContentWorkspace["tests"][number];

interface DynamicRuleRow {
  topicId: string;
  percentage: string;
}

interface TestForm {
  examId: string;
  type: TestType;
  status: ContentStatus;
  questionCount: string;
  durationMinutes: string;
  passingScorePercent: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  viName: string;
  viDescription: string;
  includeEnglish: boolean;
  enName: string;
  enDescription: string;
  fixedQuestionIds: string[];
  dynamicRules: DynamicRuleRow[];
}

function formFromTest(test: Test | null, defaultExamId: string): TestForm {
  const vi = test?.translations.find((item) => item.locale === "vi");
  const en = test?.translations.find((item) => item.locale === "en");
  return {
    examId: test?.examId ?? defaultExamId,
    type: test?.type ?? "FIXED",
    status: test?.status ?? "DRAFT",
    questionCount: String(test?.questionCount ?? 0),
    durationMinutes: test?.durationMinutes ? String(test.durationMinutes) : "",
    passingScorePercent: String(test?.passingScorePercent ?? 70),
    shuffleQuestions: test?.shuffleQuestions ?? false,
    shuffleOptions: test?.shuffleOptions ?? false,
    viName: vi?.name ?? "",
    viDescription: vi?.description ?? "",
    includeEnglish: Boolean(en),
    enName: en?.name ?? "",
    enDescription: en?.description ?? "",
    fixedQuestionIds: test
      ? [...test.fixedQuestions]
          .sort((left, right) => left.displayOrder - right.displayOrder)
          .map((item) => item.questionId)
      : [],
    dynamicRules: test
      ? test.dynamicRules.map((rule) => ({
          topicId: rule.topicId,
          percentage: String(rule.percentage),
        }))
      : [],
  };
}

export function TestsEditor({
  locale,
  messages,
  exams,
  topics,
  questions,
  tests,
}: {
  locale: Locale;
  messages: AdminCatalog;
  exams: Exam[];
  topics: Topic[];
  questions: Question[];
  tests: Test[];
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
  const questionsById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedTest = tests.find((test) => test.id === selectedId) ?? null;
  const [form, setForm] = useState<TestForm>(() =>
    formFromTest(null, exams[0]?.id ?? ""),
  );
  const [pending, setPending] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [result, setResult] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const [preview, setPreview] = useState<TestAllocationPreview[] | null>(null);

  const selectedExam = examsById.get(form.examId);
  const requiredLocales = selectedExam
    ? requiredLocalesForStatus(selectedExam, form.status)
    : (["vi"] as Locale[]);
  const englishRequired = requiredLocales.includes("en") || form.includeEnglish;

  const eligibleQuestions = questions.filter(
    (question) =>
      question.examId === form.examId &&
      question.status === "PUBLISHED" &&
      !question.deletedAt,
  );
  const examTopics = topics.filter((topic) => topic.examId === form.examId);
  const percentageTotal = form.dynamicRules.reduce(
    (total, rule) => total + (Number(rule.percentage) || 0),
    0,
  );

  function openDialog(test: Test | null) {
    setSelectedId(test?.id ?? null);
    setForm(formFromTest(test, exams[0]?.id ?? ""));
    setResult(null);
    setPreview(null);
    dialogRef.current?.showModal();
  }

  function toggleFixedQuestion(questionId: string, checked: boolean) {
    setForm((current) => ({
      ...current,
      fixedQuestionIds: checked
        ? [...current.fixedQuestionIds, questionId]
        : current.fixedQuestionIds.filter((id) => id !== questionId),
      questionCount: checked
        ? String(current.fixedQuestionIds.length + 1)
        : String(current.fixedQuestionIds.length - 1),
    }));
  }

  function moveFixedQuestion(index: number, direction: -1 | 1) {
    setForm((current) => {
      const next = [...current.fixedQuestionIds];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [
        next[target] as string,
        next[index] as string,
      ];
      return { ...current, fixedQuestionIds: next };
    });
  }

  function addDynamicRule() {
    const used = new Set(form.dynamicRules.map((rule) => rule.topicId));
    const nextTopic = examTopics.find((topic) => !used.has(topic.id));
    if (!nextTopic) return;
    setForm((current) => ({
      ...current,
      dynamicRules: [
        ...current.dynamicRules,
        { topicId: nextTopic.id, percentage: "0" },
      ],
    }));
  }

  function updateDynamicRule(index: number, patch: Partial<DynamicRuleRow>) {
    setForm((current) => ({
      ...current,
      dynamicRules: current.dynamicRules.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    }));
  }

  function removeDynamicRule(index: number) {
    setForm((current) => ({
      ...current,
      dynamicRules: current.dynamicRules.filter(
        (_, ruleIndex) => ruleIndex !== index,
      ),
    }));
  }

  function buildPayload() {
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
    return {
      id: selectedTest?.id,
      examId: form.examId,
      type: form.type,
      status: form.status,
      questionCount: Number(form.questionCount),
      durationMinutes: form.durationMinutes
        ? Number(form.durationMinutes)
        : null,
      passingScorePercent: Number(form.passingScorePercent),
      shuffleQuestions: form.shuffleQuestions,
      shuffleOptions: form.shuffleOptions,
      translations,
      fixedQuestions:
        form.type === "FIXED"
          ? form.fixedQuestionIds.map((questionId, index) => ({
              questionId,
              displayOrder: index,
            }))
          : [],
      dynamicRules:
        form.type === "DYNAMIC"
          ? form.dynamicRules.map((rule) => ({
              topicId: rule.topicId,
              percentage: Number(rule.percentage),
            }))
          : [],
    };
  }

  async function runPreview() {
    setPreview(null);
    setPreviewPending(true);
    setResult(null);
    try {
      const response = await adminApiRequest<{
        preview: TestAllocationPreview[];
      }>("/api/admin/tests/preview", locale, { body: buildPayload() });
      setPreview(response.preview);
    } catch (error) {
      setResult({
        kind: "error",
        message:
          error instanceof AdminApiRequestError
            ? (error.body?.message ?? messages.common.requestFailed)
            : messages.common.connectionError,
      });
    } finally {
      setPreviewPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    setPending(true);
    try {
      await adminApiRequest("/api/admin/tests", locale, {
        body: buildPayload(),
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
          <h2>{messages.tests.listHeading}</h2>
          <button
            type="button"
            className="button button-primary"
            onClick={() => openDialog(null)}
          >
            <Plus size={16} aria-hidden />
            {messages.tests.newAction}
          </button>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.common.exam}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.tests.type}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.tests.questionCount}
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
              {tests.map((test) => (
                <tr key={test.id}>
                  <td className="admin-cell-nowrap">
                    {examsById.get(test.examId)?.code ?? test.examId}
                  </td>
                  <td className="admin-cell-nowrap">
                    {test.type === "FIXED"
                      ? messages.tests.typeFixed
                      : messages.tests.typeDynamic}
                  </td>
                  <td className="admin-cell-nowrap">{test.questionCount}</td>
                  <td className="admin-cell-nowrap">
                    <span
                      className={`status-pill ${contentStatusTone(test.status)}`}
                    >
                      {
                        {
                          DRAFT: messages.common.statusDraft,
                          PUBLISHED: messages.common.statusPublished,
                          ARCHIVED: messages.common.statusArchived,
                        }[test.status]
                      }
                    </span>
                  </td>
                  <td className="admin-cell-nowrap">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => openDialog(test)}
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
          {tests.length === 0 && (
            <p className="admin-empty">{messages.common.empty}</p>
          )}
        </div>
      </div>

      <AdminDialog dialogRef={dialogRef} titleId="test-dialog-title">
        <h2 id="test-dialog-title">
          {selectedTest ? messages.common.edit : messages.tests.newAction}
        </h2>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-inline-fields">
            <label>
              <span>{messages.common.selectExam}</span>
              <select
                value={form.examId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    examId: event.target.value,
                    fixedQuestionIds: [],
                    dynamicRules: [],
                  })
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
            <label>
              <span>{messages.tests.type}</span>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    type: event.target.value as TestType,
                    fixedQuestionIds: [],
                    dynamicRules: [],
                  })
                }
              >
                <option value="FIXED">{messages.tests.typeFixed}</option>
                <option value="DYNAMIC">{messages.tests.typeDynamic}</option>
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
          </div>

          <div className="admin-inline-fields">
            <label>
              <span>{messages.tests.questionCount}</span>
              <input
                type="number"
                min={1}
                value={form.questionCount}
                onChange={(event) =>
                  setForm({ ...form, questionCount: event.target.value })
                }
                required
                disabled={form.type === "FIXED"}
              />
            </label>
            <label>
              <span>{messages.tests.durationMinutes}</span>
              <input
                type="number"
                min={1}
                value={form.durationMinutes}
                placeholder={messages.tests.noTimeLimit}
                onChange={(event) =>
                  setForm({ ...form, durationMinutes: event.target.value })
                }
              />
            </label>
            <label>
              <span>{messages.tests.passingScore}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={form.passingScorePercent}
                onChange={(event) =>
                  setForm({ ...form, passingScorePercent: event.target.value })
                }
                required
              />
            </label>
          </div>

          <div className="admin-inline-fields">
            <label className="admin-checkbox-field">
              <span>{messages.tests.shuffleQuestions}</span>
              <input
                type="checkbox"
                checked={form.shuffleQuestions}
                onChange={(event) =>
                  setForm({ ...form, shuffleQuestions: event.target.checked })
                }
              />
            </label>
            <label className="admin-checkbox-field">
              <span>{messages.tests.shuffleOptions}</span>
              <input
                type="checkbox"
                checked={form.shuffleOptions}
                onChange={(event) =>
                  setForm({ ...form, shuffleOptions: event.target.checked })
                }
              />
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

          {form.type === "FIXED" ? (
            <fieldset className="admin-fieldset">
              <legend>{messages.tests.fixedQuestionsHeading}</legend>
              {eligibleQuestions.length === 0 && (
                <p className="admin-empty">{messages.common.empty}</p>
              )}
              {form.fixedQuestionIds.map((questionId, index) => {
                const question = questionsById.get(questionId);
                return (
                  <div className="admin-row-actions" key={questionId}>
                    <span>
                      {index + 1}.{" "}
                      {topicsById.get(question?.topicId ?? "")?.slug} —{" "}
                      {question?.translations
                        .find((item) => item.locale === "vi")
                        ?.content.slice(0, 60)}
                    </span>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => moveFixedQuestion(index, -1)}
                      disabled={index === 0}
                      aria-label={messages.common.moveUp}
                    >
                      <ArrowUp size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => moveFixedQuestion(index, 1)}
                      disabled={index === form.fixedQuestionIds.length - 1}
                      aria-label={messages.common.moveDown}
                    >
                      <ArrowDown size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => toggleFixedQuestion(questionId, false)}
                    >
                      <Trash2 size={16} aria-hidden />
                      {messages.common.delete}
                    </button>
                  </div>
                );
              })}
              {eligibleQuestions
                .filter(
                  (question) => !form.fixedQuestionIds.includes(question.id),
                )
                .map((question) => (
                  <label className="admin-checkbox-field" key={question.id}>
                    <span>
                      {topicsById.get(question.topicId)?.slug} —{" "}
                      {question.translations
                        .find((item) => item.locale === "vi")
                        ?.content.slice(0, 60)}
                    </span>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={(event) =>
                        toggleFixedQuestion(question.id, event.target.checked)
                      }
                    />
                  </label>
                ))}
            </fieldset>
          ) : (
            <fieldset className="admin-fieldset">
              <legend>{messages.tests.dynamicRulesHeading}</legend>
              {form.dynamicRules.map((rule, index) => (
                <div className="admin-inline-fields" key={index}>
                  <label>
                    <span>{messages.common.topic}</span>
                    <select
                      value={rule.topicId}
                      onChange={(event) =>
                        updateDynamicRule(index, {
                          topicId: event.target.value,
                        })
                      }
                    >
                      {examTopics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.slug}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{messages.tests.percentage}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={rule.percentage}
                      onChange={(event) =>
                        updateDynamicRule(index, {
                          percentage: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() => removeDynamicRule(index)}
                  >
                    <Trash2 size={16} aria-hidden />
                    {messages.common.delete}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button button-secondary"
                onClick={addDynamicRule}
                disabled={form.dynamicRules.length >= examTopics.length}
              >
                <Plus size={16} aria-hidden />
                {messages.tests.dynamicRulesHeading}
              </button>
              <p className="admin-hint">
                {messages.tests.percentageTotal}: {percentageTotal}%
              </p>
            </fieldset>
          )}

          <div className="admin-form-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void runPreview()}
              disabled={previewPending || !form.examId}
            >
              <Eye size={16} aria-hidden />
              {previewPending
                ? messages.common.saving
                : messages.tests.previewAction}
            </button>
          </div>

          {preview && (
            <div className="admin-table-wrapper">
              <h3>{messages.tests.previewHeading}</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">{messages.tests.previewTopic}</th>
                    <th scope="col">{messages.tests.previewPercentage}</th>
                    <th scope="col">{messages.tests.previewQuestionCount}</th>
                    <th scope="col">{messages.tests.previewAvailable}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.topicId}>
                      <td>
                        {topicsById.get(row.topicId)?.slug ?? row.topicId}
                      </td>
                      <td>{row.percentage.toFixed(2)}%</td>
                      <td>{row.questionCount}</td>
                      <td>
                        {row.availableQuestions}
                        {row.availableQuestions < row.questionCount && (
                          <span className="form-message error" role="alert">
                            {messages.tests.previewInsufficient}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
      </AdminDialog>
    </div>
  );
}
