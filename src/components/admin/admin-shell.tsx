import type { Route } from "next";
import { RouteLink } from "@/components/route-link";
import type { ReactNode } from "react";

import { AdminShell as BaseAdminShell } from "@shibaquiz/admin-platform/components/admin-shell";

import { AdminNav } from "@/components/admin/admin-nav";
import { BrandMark } from "@/components/brand-mark";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Locale } from "@/domain/common/locale";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

export function AdminShell({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: AdminCatalog;
  children: ReactNode;
}) {
  return (
    <BaseAdminShell
      brandHref={`/${locale}/admin` as Route}
      brandLabel="ShibaQuiz Admin"
      brandAriaLabel={messages.dashboard.title}
      brandIcon={<BrandMark />}
      backToSiteHref={`/${locale}` as Route}
      backToSiteLabel={messages.nav.backToSite}
      LinkComponent={RouteLink}
      nav={<AdminNav locale={locale} messages={messages} />}
      localeSwitcher={
        <LocaleSwitcher
          locale={locale}
          navigationLabel={messages.dashboard.title}
          vietnameseLabel="Tiếng Việt"
          englishLabel="English"
        />
      }
    >
      {children}
    </BaseAdminShell>
  );
}
