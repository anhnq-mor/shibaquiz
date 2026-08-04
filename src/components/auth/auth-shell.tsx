import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import type { Locale } from "@/domain/common/locale";
import type { AuthCatalog } from "@/i18n/auth-catalogs";

export function AuthShell({
  locale,
  messages,
  path,
  title,
  description,
  children,
  token,
}: {
  locale: Locale;
  messages: AuthCatalog;
  path: string;
  title: string;
  description: string;
  children: ReactNode;
  token?: string | undefined;
}) {
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return (
    <main className="auth-page">
      <div
        className="auth-language"
        aria-label={messages.common.languageNavigation}
      >
        <Link
          href={`/vi/${path}${query}` as Route}
          lang="vi"
          aria-current={locale === "vi" ? "page" : undefined}
        >
          VI
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/en/${path}${query}` as Route}
          lang="en"
          aria-current={locale === "en" ? "page" : undefined}
        >
          EN
        </Link>
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        <Link href={`/${locale}` as Route} className="auth-brand">
          <BrandMark />
          <span>ShibaQuiz</span>
        </Link>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
        <Link href={`/${locale}` as Route} className="auth-home-link">
          {messages.common.home}
        </Link>
      </section>
    </main>
  );
}
