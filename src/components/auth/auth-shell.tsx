import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Locale } from "@/domain/common/locale";
import type { AuthCatalog } from "@/i18n/auth-catalogs";

export function AuthShell({
  locale,
  messages,
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
  return (
    <main className="auth-page">
      <LocaleSwitcher
        className="auth-language"
        locale={locale}
        navigationLabel={messages.common.languageNavigation}
        vietnameseLabel={messages.common.switchToVietnamese}
        englishLabel={messages.common.switchToEnglish}
        fallbackSearch={token ? `?token=${encodeURIComponent(token)}` : ""}
      />
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
