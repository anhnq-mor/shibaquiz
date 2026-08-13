"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";

import type { Locale } from "@/domain/common/locale";
import type { QuizCatalog } from "@/i18n/quiz-catalogs";

export function ExamSearchForm({
  locale,
  messages,
  initialQuery,
}: {
  locale: Locale;
  messages: QuizCatalog;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const target =
      `/${locale}/exams${params.toString() ? `?${params}` : ""}` as Route;
    startTransition(() => {
      router.push(target);
    });
  }

  return (
    <form className="search-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="exam-search">
        {messages.exams.searchLabel}
      </label>
      <input
        id="exam-search"
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={messages.exams.searchLabel}
      />
      <button
        type="submit"
        className="button button-primary"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 size={16} aria-hidden className="icon-spin" />
        ) : (
          <Search size={16} aria-hidden />
        )}
        {isPending ? messages.exams.searching : messages.exams.searchAction}
      </button>
    </form>
  );
}
