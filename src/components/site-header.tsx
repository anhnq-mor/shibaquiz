import type { Route } from "next";
import Link from "next/link";

import type { Locale } from "@/domain/common/locale";
import type { MessageCatalog } from "@/i18n/catalogs";

import { BrandMark } from "./brand-mark";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader({
  locale,
  messages,
}: {
  locale: Locale;
  messages: MessageCatalog;
}) {
  return (
    <header className="site-header">
      <div className="page-shell header-inner">
        <Link
          href={`/${locale}` as Route}
          className="brand"
          aria-label={messages.a11y.homeLabel}
        >
          <BrandMark />
          <span>ShibaQuiz</span>
        </Link>
        <nav
          className="primary-navigation"
          aria-label={messages.navigation.overview}
        >
          <a href="#principles">{messages.navigation.architecture}</a>
          <a href="#status">{messages.navigation.status}</a>
        </nav>
        <div className="header-auth-links">
          <Link href={`/${locale}/login` as Route}>
            {messages.navigation.login}
          </Link>
          <Link
            className="header-register"
            href={`/${locale}/register` as Route}
          >
            {messages.navigation.register}
          </Link>
        </div>
        <LanguageSwitcher locale={locale} messages={messages} />
      </div>
    </header>
  );
}
