"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Play } from "lucide-react";

import { appApiRequest, AppApiRequestError } from "@/components/app/app-api";
import type { PublishedExamDetail } from "@/domain/discovery/discovery";
import type { AttemptScope } from "@/domain/attempts/attempt";
import type { AttemptMode } from "@/domain/attempts/disclosure";
import type { Locale } from "@/domain/common/locale";
import type { QuizCatalog } from "@/i18n/quiz-catalogs";

type UiMode = "STUDY" | "PRACTICE";

export interface AttemptSelection {
  scope: AttemptScope;
  topicId?: string;
  testId?: string;
  label: string;
  questionCount: number;
  durationMinutes: number | null;
}

export function StartAttemptForm({
  locale,
  messages,
  exam,
  selection,
}: {
  locale: Locale;
  messages: QuizCatalog;
  exam: PublishedExamDetail;
  selection: AttemptSelection;
}) {
  const router = useRouter();
  const [uiMode, setUiMode] = useState<UiMode | null>(null);
  const [immediateCheck, setImmediateCheck] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uiMode) return;
    const mode: AttemptMode =
      uiMode === "STUDY"
        ? "STUDY"
        : immediateCheck
          ? "PRACTICE_IMMEDIATE"
          : "EXAM_DEFERRED";
    setPending(true);
    setError(null);
    try {
      const result = await appApiRequest<{ attemptId: string }>(
        "/api/attempts",
        locale,
        {
          body: {
            examId: exam.id,
            scope: selection.scope,
            mode,
            topicId: selection.topicId,
            testId: selection.testId,
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

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2>{messages.exams.chooseModeHeading}</h2>
      </div>
      <form className="admin-form" onSubmit={submit}>
        <p className="admin-hint">
          {messages.exams.selectedLabel}: <strong>{selection.label}</strong>
          {" · "}
          {messages.exams.questionsCount.replace(
            "{count}",
            String(selection.questionCount),
          )}
          {" · "}
          {selection.durationMinutes
            ? messages.exams.testDurationMinutes.replace(
                "{minutes}",
                String(selection.durationMinutes),
              )
            : messages.exams.testNoTimeLimit}
        </p>

        <fieldset className="admin-fieldset">
          <legend>{messages.exams.modeLabel}</legend>
          <div className="choice-grid">
            <label className="choice-card">
              <input
                type="radio"
                name="mode"
                checked={uiMode === "STUDY"}
                onChange={() => setUiMode("STUDY")}
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
                checked={uiMode === "PRACTICE"}
                onChange={() => setUiMode("PRACTICE")}
              />
              <span className="choice-card-body">
                {messages.common.modePracticeImmediate}
                <span>{messages.exams.modePracticeImmediateHint}</span>
              </span>
            </label>
          </div>

          {uiMode === "PRACTICE" && (
            <div>
              <label className="admin-checkbox-field">
                <span>{messages.exams.immediateCheckLabel}</span>
                <input
                  type="checkbox"
                  checked={immediateCheck}
                  onChange={(event) => setImmediateCheck(event.target.checked)}
                />
              </label>
              <p className="admin-hint">{messages.exams.immediateCheckHint}</p>
            </div>
          )}
        </fieldset>

        {error && (
          <p className="form-message error" role="alert">
            {error}
          </p>
        )}

        <div className="admin-form-actions">
          <button
            type="submit"
            className="button button-primary"
            disabled={pending || !uiMode}
          >
            <Play size={16} aria-hidden />
            {pending ? messages.exams.startWorking : messages.exams.startAction}
          </button>
        </div>
      </form>
    </div>
  );
}
