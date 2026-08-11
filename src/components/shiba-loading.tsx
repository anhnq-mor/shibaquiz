import type { Locale } from "@/domain/common/locale";
import { getLoadingMessages } from "@/i18n/loading-catalogs";

export type ShibaLoadingPhase = "running" | "done";

export function ShibaLoading({
  locale,
  phase,
}: {
  locale: Locale;
  phase: ShibaLoadingPhase;
}) {
  const messages = getLoadingMessages(locale);
  const done = phase === "done";

  return (
    <div className={`shiba-loading shiba-loading-${phase}`}>
      <div className="shiba-stage" aria-hidden="true">
        <span className="shiba-track-line" />
        <span className="shiba-dust shiba-dust-one" />
        <span className="shiba-dust shiba-dust-two" />
        <span className="shiba-dust shiba-dust-three" />
        <svg className="shiba-runner" viewBox="0 0 180 104" focusable="false">
          <g className="shiba-tail">
            <path
              d="M43 55C17 49 18 20 40 18c17-2 22 20 8 27 11-2 16-12 12-22"
              fill="none"
              stroke="#e57a20"
              strokeLinecap="round"
              strokeWidth="14"
            />
            <path
              d="M42 54C24 48 26 29 39 27"
              fill="none"
              stroke="#ffd39a"
              strokeLinecap="round"
              strokeWidth="6"
            />
          </g>
          <ellipse cx="91" cy="64" rx="49" ry="26" fill="#f59b36" />
          <path
            d="M62 59c13 12 47 16 67 4l-5 18c-21 12-48 9-64-4Z"
            fill="#fff3dc"
          />
          <path d="M120 67c14 0 28-5 39-15-3 18-17 27-38 28Z" fill="#d9483b" />
          <path d="m119 65 12 18 10-21Z" fill="#b92f2d" />
          <g className="shiba-leg shiba-leg-back">
            <path
              d="M72 76c-8 8-14 15-22 16-5 1-7-5-3-8l18-15Z"
              fill="#e57a20"
            />
            <path d="M50 83c-7 2-10 7-5 10h12l5-8Z" fill="#fff3dc" />
          </g>
          <g className="shiba-leg shiba-leg-front">
            <path
              d="M118 75c10 5 20 10 31 9 5 0 6 6 1 8-13 4-28 1-39-6Z"
              fill="#f59b36"
            />
            <path d="M145 83c8-1 12 4 8 8l-12 2-6-7Z" fill="#fff3dc" />
          </g>
          <g className="shiba-head">
            <path d="m91 31 5-24 17 18Z" fill="#e57a20" />
            <path d="m126 27 16-18 1 27Z" fill="#e57a20" />
            <path d="m98 23 2-10 8 9Z" fill="#ffd3c1" />
            <path d="m132 24 8-9v13Z" fill="#ffd3c1" />
            <circle cx="118" cy="43" r="30" fill="#f59b36" />
            <ellipse cx="121" cy="52" rx="22" ry="17" fill="#fff3dc" />
            <ellipse cx="105" cy="40" rx="4" ry="5" fill="#251a17" />
            <ellipse cx="132" cy="40" rx="4" ry="5" fill="#251a17" />
            <circle cx="119" cy="49" r="4" fill="#251a17" />
            <path
              d="M119 53c-3 6-10 5-12 1m12-1c3 6 10 5 12 1"
              fill="none"
              stroke="#251a17"
              strokeLinecap="round"
              strokeWidth="2"
            />
            <path d="M115 58c2 10 10 10 12 0Z" fill="#e95462" />
            <path
              d="M94 50c-5 2-8 1-10-1m52 2c5 2 9 1 11-1"
              fill="none"
              stroke="#e57a20"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </g>
          <circle cx="131" cy="71" r="3" fill="#fff" />
        </svg>
        {done && (
          <>
            <span className="shiba-spark shiba-spark-one">✦</span>
            <span className="shiba-spark shiba-spark-two">✦</span>
          </>
        )}
      </div>
      <div className="shiba-loading-copy">
        <strong>{done ? messages.done : messages.mission}</strong>
      </div>
    </div>
  );
}
