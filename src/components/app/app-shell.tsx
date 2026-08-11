import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppNav } from "@/components/app/app-nav";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoutButton } from "@/components/auth/logout-button";
import type { Locale } from "@/domain/common/locale";
import type { AuthCatalog } from "@/i18n/auth-catalogs";
import type { QuizCatalog } from "@/i18n/quiz-catalogs";

export function AppShell({
  locale,
  messages,
  authMessages,
  children,
}: {
  locale: Locale;
  messages: QuizCatalog;
  authMessages: AuthCatalog;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="page-shell app-topbar-inner">
          <Link
            href={`/${locale}/exams` as Route}
            className="brand"
            aria-label={messages.nav.exams}
          >
            <BrandMark />
            <span>ShibaQuiz</span>
          </Link>
          <AppNav locale={locale} messages={messages} />
          <Link href={`/${locale}` as Route}>{messages.nav.backToSite}</Link>
          <LocaleSwitcher
            locale={locale}
            navigationLabel={messages.nav.exams}
            vietnameseLabel="Tiếng Việt"
            englishLabel="English"
          />
          <LogoutButton
            locale={locale}
            label={authMessages.account.logout}
            working={authMessages.common.working}
          />
        </div>
      </header>
      <main className="page-shell app-main">{children}</main>
    </div>
  );
}
