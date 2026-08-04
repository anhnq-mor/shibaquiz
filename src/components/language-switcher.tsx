import type { Route } from "next";
import Link from "next/link";

import type { Locale } from "@/domain/common/locale";
import type { MessageCatalog } from "@/i18n/catalogs";

export function LanguageSwitcher({
  locale,
  messages,
}: {
  locale: Locale;
  messages: MessageCatalog;
}) {
  return (
    <nav
      className="language-switcher"
      aria-label={messages.a11y.languageNavigation}
    >
      <Link
        href={"/vi" as Route}
        hrefLang="vi"
        lang="vi"
        aria-current={locale === "vi" ? "page" : undefined}
        aria-label={messages.navigation.switchToVietnamese}
      >
        VI
      </Link>
      <span aria-hidden="true">/</span>
      <Link
        href={"/en" as Route}
        hrefLang="en"
        lang="en"
        aria-current={locale === "en" ? "page" : undefined}
        aria-label={messages.navigation.switchToEnglish}
      >
        EN
      </Link>
    </nav>
  );
}
