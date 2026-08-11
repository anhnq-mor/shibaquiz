"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";

import { appApiRequest } from "@/components/app/app-api";
import {
  isAnswerCorrect,
  type AttemptQuestionState,
  type AttemptTakingView,
} from "@/domain/attempts/attempt";
import type { Locale } from "@/domain/common/locale";
import type { QuizCatalog } from "@/i18n/quiz-catalogs";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type NavFilter = "all" | "unanswered" | "flagged";

function matchesFilter(
  question: AttemptQuestionState,
  filter: NavFilter,
): boolean {
  if (filter === "unanswered") return question.selectedOptionIds.length === 0;
  if (filter === "flagged") return question.isFlagged;
  return true;
}

function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function toggleOption(
  selected: string[],
  optionId: string,
  isSingle: boolean,
): string[] {
  if (isSingle) return [optionId];
  return selected.includes(optionId)
    ? selected.filter((id) => id !== optionId)
    : [...selected, optionId];
}

export function AttemptRunner({
  locale,
  messages,
  initial,
}: {
  locale: Locale;
  messages: QuizCatalog;
  initial: AttemptTakingView;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<AttemptQuestionState[]>(
    initial.questions,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [submitPending, setSubmitPending] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [navFilter, setNavFilter] = useState<NavFilter>("all");
  const submitDialogRef = useRef<HTMLDialogElement>(null);
  const abandonDialogRef = useRef<HTMLDialogElement>(null);
  const mobileNavDialogRef = useRef<HTMLDialogElement>(null);
  const topbarRef = useRef<HTMLDivElement>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingSaveCount = useRef(0);
  const autoSubmitted = useRef(false);

  const current = questions[currentIndex]!;
  const unansweredCount = questions.filter(
    (question) => question.selectedOptionIds.length === 0,
  ).length;
  const answeredCount = questions.length - unansweredCount;
  const distinctTopicCount = new Set(
    questions.map((question) => question.topicId),
  ).size;

  const [clockOffsetMs] = useState(
    () => new Date(initial.serverNow).getTime() - Date.now(),
  );
  const expiresAtMs = initial.expiresAt
    ? new Date(initial.expiresAt).getTime()
    : null;
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    expiresAtMs
      ? Math.round((expiresAtMs - (Date.now() + clockOffsetMs)) / 1000)
      : null,
  );

  const submitAttempt = useCallback(async () => {
    setSubmitPending(true);
    try {
      await appApiRequest(`/api/attempts/${initial.attemptId}/submit`, locale);
      router.push(`/${locale}/attempts/${initial.attemptId}/result` as Route);
    } catch {
      setSubmitPending(false);
    }
  }, [initial.attemptId, locale, router]);

  useEffect(() => {
    if (expiresAtMs === null) return;
    const interval = setInterval(() => {
      const secondsLeft = Math.round(
        (expiresAtMs - (Date.now() + clockOffsetMs)) / 1000,
      );
      setRemainingSeconds(secondsLeft);
      if (secondsLeft <= 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        setTimeUp(true);
        void submitAttempt();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAtMs, clockOffsetMs, submitAttempt]);

  useEffect(() => {
    const element = topbarRef.current;
    if (!element) return;
    const updateHeight = () => {
      document.documentElement.style.setProperty(
        "--attempt-topbar-height",
        `${element.getBoundingClientRect().height}px`,
      );
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (pendingSaveCount.current > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const persistAnswer = useCallback(
    (
      attemptQuestionId: string,
      selectedOptionIds: string[],
      isFlagged: boolean,
    ) => {
      window.clearTimeout(saveTimers.current[attemptQuestionId]);
      pendingSaveCount.current += 1;
      setSaveStatus((state) => ({ ...state, [attemptQuestionId]: "saving" }));
      saveTimers.current[attemptQuestionId] = setTimeout(async () => {
        try {
          const updated = await appApiRequest<AttemptQuestionState>(
            `/api/attempts/${initial.attemptId}/answers/${attemptQuestionId}`,
            locale,
            { body: { selectedOptionIds, isFlagged } },
          );
          setQuestions((list) =>
            list.map((question) =>
              question.attemptQuestionId === attemptQuestionId
                ? updated
                : question,
            ),
          );
          setSaveStatus((state) => ({
            ...state,
            [attemptQuestionId]: "saved",
          }));
        } catch {
          setSaveStatus((state) => ({
            ...state,
            [attemptQuestionId]: "error",
          }));
        } finally {
          pendingSaveCount.current = Math.max(0, pendingSaveCount.current - 1);
        }
      }, 500);
    },
    [initial.attemptId, locale],
  );

  function selectOption(optionId: string) {
    if (current.checkedAt) return;
    const nextSelected = toggleOption(
      current.selectedOptionIds,
      optionId,
      current.type === "SINGLE_CHOICE",
    );
    setQuestions((list) =>
      list.map((question) =>
        question.attemptQuestionId === current.attemptQuestionId
          ? { ...question, selectedOptionIds: nextSelected }
          : question,
      ),
    );
    persistAnswer(current.attemptQuestionId, nextSelected, current.isFlagged);
  }

  function toggleFlag() {
    const nextFlag = !current.isFlagged;
    setQuestions((list) =>
      list.map((question) =>
        question.attemptQuestionId === current.attemptQuestionId
          ? { ...question, isFlagged: nextFlag }
          : question,
      ),
    );
    persistAnswer(
      current.attemptQuestionId,
      current.selectedOptionIds,
      nextFlag,
    );
  }

  async function checkCurrentAnswer() {
    try {
      const updated = await appApiRequest<AttemptQuestionState>(
        `/api/attempts/${initial.attemptId}/questions/${current.attemptQuestionId}/check`,
        locale,
      );
      setQuestions((list) =>
        list.map((question) =>
          question.attemptQuestionId === current.attemptQuestionId
            ? updated
            : question,
        ),
      );
    } catch {
      setSaveStatus((state) => ({
        ...state,
        [current.attemptQuestionId]: "error",
      }));
    }
  }

  async function abandonAttempt() {
    try {
      await appApiRequest(`/api/attempts/${initial.attemptId}/abandon`, locale);
    } finally {
      router.push(
        (initial.examSlug
          ? `/${locale}/exams/${initial.examSlug}`
          : `/${locale}/exams`) as Route,
      );
    }
  }

  const status = saveStatus[current.attemptQuestionId] ?? "idle";
  const revealed = current.question.disclosure === "REVEALED";
  const isCurrentCorrect =
    revealed && current.checkedAt && "options" in current.question
      ? isAnswerCorrect(
          current.selectedOptionIds,
          current.question.options
            .filter((option) => "isCorrect" in option && option.isCorrect)
            .map((option) => option.id),
        )
      : null;

  return (
    <div>
      <div className="attempt-topbar" ref={topbarRef}>
        <h1 className="attempt-topbar-title">{initial.examName}</h1>
        {remainingSeconds !== null && (
          <span
            className={`timer-badge${remainingSeconds <= 60 ? "low" : ""}`}
            role="status"
          >
            {messages.attempt.timeRemainingLabel}:{" "}
            {formatDuration(remainingSeconds)}
          </span>
        )}
        <button
          type="button"
          className="button button-secondary"
          onClick={() => abandonDialogRef.current?.showModal()}
        >
          {messages.attempt.abandonAction}
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={() => submitDialogRef.current?.showModal()}
          disabled={submitPending}
        >
          {messages.attempt.submitAction}
        </button>
      </div>

      {timeUp && (
        <p className="form-message" role="alert">
          {messages.attempt.timeUpNotice}
        </p>
      )}

      <div className="attempt-mobile-bar">
        <span className="attempt-mobile-bar-progress">
          {messages.attempt.questionOf
            .replace("{current}", String(currentIndex + 1))
            .replace("{total}", String(questions.length))}
          {" · "}
          {messages.attempt.navigatorAnsweredCount
            .replace("{answered}", String(answeredCount))
            .replace("{total}", String(questions.length))}
        </span>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => mobileNavDialogRef.current?.showModal()}
        >
          {messages.attempt.navigatorOpenAction}
        </button>
      </div>

      <div className="attempt-layout">
        <section className="attempt-question-panel" aria-live="polite">
          <div className="attempt-question-heading">
            <div className="attempt-question-title">
              <h2>
                {messages.attempt.questionOf
                  .replace("{current}", String(currentIndex + 1))
                  .replace("{total}", String(questions.length))}
              </h2>
              {distinctTopicCount > 1 && (
                <span className="attempt-topic-badge">{current.topicName}</span>
              )}
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={toggleFlag}
            >
              {current.isFlagged
                ? messages.attempt.unflagAction
                : messages.attempt.flagAction}
            </button>
          </div>

          <p>{current.question.content}</p>

          {current.question.media.length > 0 && (
            <AttemptQuestionMedia
              key={current.attemptQuestionId}
              attemptId={initial.attemptId}
              attemptQuestionId={current.attemptQuestionId}
              media={current.question.media}
              locale={locale}
              messages={messages}
            />
          )}

          <ul className="option-list">
            {current.question.options.map((option) => {
              const isSelected = current.selectedOptionIds.includes(option.id);
              const isCorrectOption =
                "isCorrect" in option ? option.isCorrect : undefined;
              const optionClass =
                revealed && isCorrectOption
                  ? "correct"
                  : revealed && isSelected && isCorrectOption === false
                    ? "incorrect"
                    : "";
              return (
                <li key={option.id} className={optionClass}>
                  <label>
                    <input
                      type={
                        current.type === "SINGLE_CHOICE" ? "radio" : "checkbox"
                      }
                      name={`question-${current.attemptQuestionId}`}
                      checked={isSelected}
                      disabled={Boolean(current.checkedAt)}
                      onChange={() => selectOption(option.id)}
                    />
                    <span>{option.content}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          {initial.mode === "EXAM_DEFERRED" && !revealed && (
            <p className="admin-hint">{messages.exams.modeExamDeferredHint}</p>
          )}

          {isCurrentCorrect !== null && (
            <p role="status">
              {isCurrentCorrect
                ? messages.attempt.checkedCorrect
                : messages.attempt.checkedIncorrect}
            </p>
          )}

          {revealed && "explanation" in current.question && (
            <div>
              <h3>{messages.attempt.explanationLabel}</h3>
              <p>{current.question.explanation}</p>
            </div>
          )}

          <div className="attempt-toolbar">
            <span
              className={`save-indicator${status === "error" ? "error" : ""}`}
            >
              {status === "saving" && messages.attempt.savingIndicator}
              {status === "saved" && messages.attempt.savedIndicator}
              {status === "error" && (
                <>
                  {messages.attempt.saveErrorIndicator}{" "}
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() =>
                      persistAnswer(
                        current.attemptQuestionId,
                        current.selectedOptionIds,
                        current.isFlagged,
                      )
                    }
                  >
                    {messages.attempt.retryAction}
                  </button>
                </>
              )}
            </span>
            <button
              type="button"
              className="button button-secondary"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
            >
              {messages.attempt.previousAction}
            </button>
            {initial.mode === "PRACTICE_IMMEDIATE" && !current.checkedAt && (
              <button
                type="button"
                className="button button-primary"
                onClick={checkCurrentAnswer}
              >
                {messages.attempt.checkAction}
              </button>
            )}
            <button
              type="button"
              className="button button-secondary"
              disabled={currentIndex === questions.length - 1}
              onClick={() =>
                setCurrentIndex((index) =>
                  Math.min(questions.length - 1, index + 1),
                )
              }
            >
              {messages.attempt.nextAction}
            </button>
          </div>
        </section>

        <AttemptNavigator
          questions={questions}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
          filter={navFilter}
          onFilterChange={setNavFilter}
          messages={messages}
        />
      </div>

      <dialog
        ref={mobileNavDialogRef}
        className="admin-dialog attempt-nav-dialog"
        aria-label={messages.attempt.navigatorHeading}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="admin-dialog-body">
          <AttemptNavigator
            questions={questions}
            currentIndex={currentIndex}
            onSelect={(index) => {
              setCurrentIndex(index);
              mobileNavDialogRef.current?.close();
            }}
            filter={navFilter}
            onFilterChange={setNavFilter}
            messages={messages}
          />
        </div>
      </dialog>

      <ConfirmDialog
        dialogRef={submitDialogRef}
        titleId="submit-dialog-title"
        title={messages.attempt.submitConfirmTitle}
        body={
          unansweredCount > 0
            ? `${messages.attempt.submitConfirmUnanswered.replace("{count}", String(unansweredCount))} ${messages.attempt.submitConfirmBody}`
            : messages.attempt.submitConfirmBody
        }
        confirmLabel={messages.attempt.submitConfirmConfirm}
        cancelLabel={messages.attempt.submitConfirmCancel}
        onConfirm={() => {
          submitDialogRef.current?.close();
          void submitAttempt();
        }}
      />

      <ConfirmDialog
        dialogRef={abandonDialogRef}
        titleId="abandon-dialog-title"
        title={messages.attempt.abandonConfirmTitle}
        body={messages.attempt.abandonConfirmBody}
        confirmLabel={messages.attempt.abandonConfirmConfirm}
        cancelLabel={messages.attempt.abandonConfirmCancel}
        onConfirm={() => {
          abandonDialogRef.current?.close();
          void abandonAttempt();
        }}
      />
    </div>
  );
}

function AttemptQuestionMedia({
  attemptId,
  attemptQuestionId,
  media,
  locale,
  messages,
}: {
  attemptId: string;
  attemptQuestionId: string;
  media: AttemptQuestionState["question"]["media"];
  locale: Locale;
  messages: QuizCatalog;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await Promise.all(
          media.map(async (item) => {
            const access = await appApiRequest<{ url: string }>(
              `/api/attempts/${attemptId}/questions/${attemptQuestionId}/media/${item.id}`,
              locale,
              { method: "GET" },
            );
            return [item.id, access.url] as const;
          }),
        );
        if (!cancelled) setUrls(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, attemptQuestionId, media, locale]);

  if (error) {
    return (
      <p className="form-message error" role="alert">
        {messages.attempt.mediaLoadError}
      </p>
    );
  }

  return (
    <div className="attempt-media-list">
      {media.map((item) => {
        const url = urls[item.id];
        if (!url) {
          return <div key={item.id} className="attempt-media-loading" />;
        }
        if (item.type === "IMAGE") {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={item.id} src={url} alt={item.altText ?? ""} />
          );
        }
        if (item.type === "AUDIO") {
          return (
            <figure key={item.id}>
              <audio controls src={url} />
              {item.caption && <figcaption>{item.caption}</figcaption>}
            </figure>
          );
        }
        return (
          <figure key={item.id}>
            <video controls src={url} />
            {item.caption && <figcaption>{item.caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}

function AttemptNavigator({
  questions,
  currentIndex,
  onSelect,
  filter,
  onFilterChange,
  messages,
}: {
  questions: AttemptQuestionState[];
  currentIndex: number;
  onSelect: (index: number) => void;
  filter: NavFilter;
  onFilterChange: (filter: NavFilter) => void;
  messages: QuizCatalog;
}) {
  const jumpInputRef = useRef<HTMLInputElement>(null);
  const total = questions.length;
  const answeredCount = questions.filter(
    (question) => question.selectedOptionIds.length > 0,
  ).length;
  const progressPercent =
    total === 0 ? 0 : Math.round((answeredCount / total) * 100);
  const firstUnansweredIndex = questions.findIndex(
    (question) => question.selectedOptionIds.length === 0,
  );

  function submitJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(jumpInputRef.current?.value);
    if (Number.isInteger(value) && value >= 1 && value <= total) {
      onSelect(value - 1);
    }
    if (jumpInputRef.current) jumpInputRef.current.value = "";
  }

  return (
    <nav
      className="attempt-navigator"
      aria-label={messages.attempt.navigatorHeading}
    >
      <div className="attempt-navigator-header">
        <h2>{messages.attempt.navigatorHeading}</h2>
        <span className="attempt-nav-count">
          {messages.attempt.navigatorAnsweredCount
            .replace("{answered}", String(answeredCount))
            .replace("{total}", String(total))}
        </span>
      </div>

      <div
        className="attempt-nav-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
      >
        <div
          className="attempt-nav-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="attempt-legend">
        <span>
          <span className="attempt-legend-dot answered" aria-hidden="true" />
          {messages.attempt.statusAnswered}
        </span>
        <span>
          <span className="attempt-legend-dot flagged" aria-hidden="true" />
          {messages.attempt.statusFlagged}
        </span>
        <span>
          <span className="attempt-legend-dot" aria-hidden="true" />
          {messages.attempt.statusUnanswered}
        </span>
      </div>

      <div className="attempt-nav-filters" role="group">
        {(["all", "unanswered", "flagged"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`attempt-nav-filter${filter === option ? "active" : ""}`}
            aria-pressed={filter === option}
            onClick={() => onFilterChange(option)}
          >
            {option === "all"
              ? messages.attempt.filterAll
              : option === "unanswered"
                ? messages.attempt.statusUnanswered
                : messages.attempt.statusFlagged}
          </button>
        ))}
      </div>

      <form className="attempt-nav-jump-form" onSubmit={submitJump}>
        <label htmlFor="attempt-nav-jump-input">
          {messages.attempt.jumpToQuestionLabel}
        </label>
        <input
          id="attempt-nav-jump-input"
          ref={jumpInputRef}
          type="number"
          min={1}
          max={total}
          inputMode="numeric"
        />
        <button type="submit" className="button button-secondary">
          {messages.attempt.jumpToQuestionAction}
        </button>
      </form>

      <div className="attempt-nav-scroll">
        {questions.some((question) => matchesFilter(question, filter)) ? (
          <div className="attempt-nav-grid">
            {questions.map((question, index) => {
              if (!matchesFilter(question, filter)) return null;
              const classes = [
                "attempt-nav-item",
                question.selectedOptionIds.length > 0 ? "answered" : "",
                question.isFlagged ? "flagged" : "",
                index === currentIndex ? "current" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={question.attemptQuestionId}
                  type="button"
                  className={classes}
                  aria-current={index === currentIndex ? "true" : undefined}
                  onClick={() => onSelect(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="attempt-nav-empty">{messages.attempt.filterEmpty}</p>
        )}
      </div>

      {firstUnansweredIndex !== -1 && (
        <button
          type="button"
          className="button button-secondary attempt-nav-jump"
          onClick={() => onSelect(firstUnansweredIndex)}
        >
          {messages.attempt.jumpToUnansweredAction}
        </button>
      )}
    </nav>
  );
}

function ConfirmDialog({
  dialogRef,
  titleId,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  titleId: string;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}) {
  return (
    <dialog
      ref={dialogRef}
      className="admin-dialog"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="admin-dialog-body">
        <h2 id={titleId}>{title}</h2>
        <p>{body}</p>
        <div className="admin-form-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => dialogRef.current?.close()}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
