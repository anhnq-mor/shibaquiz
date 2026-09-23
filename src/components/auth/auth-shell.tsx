import { RouteLink } from "@/components/route-link";
import type { ReactNode } from "react";

import { AuthShell as BaseAuthShell } from "@shibaquiz/admin-platform/components/auth-shell";

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
    <BaseAuthShell
      locale={locale}
      messages={messages}
      title={title}
      description={description}
      brandHref={`/${locale}`}
      brandLabel="ShibaQuiz"
      brandIcon={<BrandMark />}
      LinkComponent={RouteLink}
      localeSwitcher={
        <LocaleSwitcher
          className="auth-language"
          locale={locale}
          navigationLabel={messages.common.languageNavigation}
          vietnameseLabel={messages.common.switchToVietnamese}
          englishLabel={messages.common.switchToEnglish}
          fallbackSearch={token ? `?token=${encodeURIComponent(token)}` : ""}
        />
      }
    >
      {children}
    </BaseAuthShell>
  );
}
