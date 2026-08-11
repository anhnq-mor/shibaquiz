"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { appApiRequest, AppApiRequestError } from "@/components/app/app-api";
import type {
  PublishedExamDetail,
  PublishedTestSummary,
  PublishedTopicSummary,
} from "@/domain/discovery/discovery";
import type { AttemptScope } from "@/domain/attempts/attempt";
import type { AttemptMode } from "@/domain/attempts/disclosure";
import type { Locale } from "@/domain/common/locale";
import type { QuizCatalog } from "@/i18n/quiz-catalogs";

type Scope = AttemptScope;
type Mode = AttemptMode;

function availableScopes(exam: PublishedExamDetail): Scope[] {
  const scopes: Scope[] = [];
  if (exam.topics.length > 0) scopes.push("TOPIC");
  if (exam.tests.length > 0) scopes.push("FULL_TEST");
  if (exam.publishedQuestionCount > 0) scopes.push("QUESTION_BANK");
  return scopes;
}

export function StartAttemptForm({
  locale,
  messages,
  exam,
}: {
  locale: Locale;
  messages: QuizCatalog;
  exam: PublishedExamDetail;
}) {
  const router = useRouter();
  const scopes = useMemo(() => availableScopes(exam), [exam]);
  const [scope, setScope] = useState<Scope | null>(scopes[0] ?? null);
  const [topicId, setTopicId] = useState<string>(exam.topics[0]?.id ?? "");
  const [testId, setTestId] = useState<string>(exam.tests[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("STUDY");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTopic: PublishedTopicSummary | undefined = exam.topics.find(
    (topic) => topic.id === topicId,
  );
  const selectedTest: PublishedTestSummary | undefined = exam.tests.find(
    (test) => test.id === testId,
  );

  const summaryQuestionCount =
    scope === "TOPIC"
      ? (selectedTopic?.publishedQuestionCount ?? 0)
      : scope === "FULL_TEST"
        ? (selectedTest?.questionCount ?? 0)
        : exam.publishedQuestionCount;
  const summaryDurationMinutes =
    scope === "FULL_TEST" ? (selectedTest?.durationMinutes ?? null) : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scope) return;
    setPending(true);
    setError(null);
    try {
      const result = await appApiRequest<{ attemptId: string }>(
        "/api/attempts",
        locale,
        {
          body: {
            examId: exam.id,
            scope,
            mode,
            topicId: scope === "TOPIC" ? topicId : undefined,
            testId: scope === "FULL_TEST" ? testId : undefined,
          },
        },
      );
      router.push(`/${locale}/attempts/${result.attemptId}` as Route);
    } catch (caught) {
      setError(
        caught instanceof AppApiRequestError
          ? (caught.body?.message ?? messages.exams.startError)
          : messages.exams.startError,
      );
      setPending(false);
    }
  }

  if (scopes.length === 0) {
    return <p className="admin-empty">{messages.exams.noTopicsError}</p>;
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <fieldset className="admin-fieldset">
        <legend>{messages.exams.scopeLabel}</legend>
        <div className="choice-grid">
          {scopes.includes("TOPIC") && (
            <label className="choice-card">
              <input
                type="radio"
                name="scope"
                checked={scope === "TOPIC"}
                onChange={() => setScope("TOPIC")}
              />
              <span className="choice-card-body">
                {messages.common.scopeTopic}
                <span>{messages.exams.scopeTopicHint}</span>
              </span>
            </label>
          )}
          {scopes.includes("FULL_TEST") && (
            <label className="choice-card">
              <input
                type="radio"
                name="scope"
                checked={scope === "FULL_TEST"}
                onChange={() => setScope("FULL_TEST")}
              />
              <span className="choice-card-body">
                {messages.common.scopeFullTest}
                <span>{messages.exams.scopeFullTestHint}</span>
              </span>
            </label>
          )}
          {scopes.includes("QUESTION_BANK") && (
            <label className="choice-card">
              <input
                type="radio"
                name="scope"
                checked={scope === "QUESTION_BANK"}
                onChange={() => setScope("QUESTION_BANK")}
              />
              <span className="choice-card-body">
                {messages.common.scopeQuestionBank}
                <span>{messages.exams.scopeQuestionBankHint}</span>
              </span>
            </label>
          )}
        </div>
      </fieldset>

      {scope === "TOPIC" && (
        <label>
          <span>{messages.exams.selectTopicLabel}</span>
          <select
            value={topicId}
            onChange={(event) => setTopicId(event.target.value)}
          >
            {exam.topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name} (
                {messages.exams.topicQuestionsCount.replace(
                  "{count}",
                  String(topic.publishedQuestionCount),
                )}
                )
              </option>
            ))}
          </select>
        </label>
      )}

      {scope === "FULL_TEST" && (
        <label>
          <span>{messages.exams.selectTestLabel}</span>
          <select
            value={testId}
            onChange={(event) => setTestId(event.target.value)}
          >
            {exam.tests.map((test) => (
              <option key={test.id} value={test.id}>
                {test.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="admin-fieldset">
        <legend>{messages.exams.modeLabel}</legend>
        <div className="choice-grid">
          <label className="choice-card">
            <input
              type="radio"
              name="mode"
              checked={mode === "STUDY"}
              onChange={() => setMode("STUDY")}
            />
            <span className="choice-card-body">
              {messages.common.modeStudy}
              <span>{messages.exams.modeStudyHint}</span>
            </span>
          </label>
          <label className="choice-card">
            <input
              type="radio"
              name="mode"
              checked={mode === "PRACTICE_IMMEDIATE"}
              onChange={() => setMode("PRACTICE_IMMEDIATE")}
            />
            <span className="choice-card-body">
              {messages.common.modePracticeImmediate}
              <span>{messages.exams.modePracticeImmediateHint}</span>
            </span>
          </label>
          <label className="choice-card">
            <input
              type="radio"
              name="mode"
              checked={mode === "EXAM_DEFERRED"}
              onChange={() => setMode("EXAM_DEFERRED")}
            />
            <span className="choice-card-body">
              {messages.common.modeExamDeferred}
              <span>{messages.exams.modeExamDeferredHint}</span>
            </span>
          </label>
        </div>
      </fieldset>

      <p className="admin-hint">
        {messages.exams.questionsCount.replace(
          "{count}",
          String(summaryQuestionCount),
        )}
        {" · "}
        {summaryDurationMinutes
          ? messages.exams.testDurationMinutes.replace(
              "{minutes}",
              String(summaryDurationMinutes),
            )
          : messages.exams.testNoTimeLimit}
      </p>

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
          {pending ? messages.exams.startWorking : messages.exams.startAction}
        </button>
      </div>
    </form>
  );
}
