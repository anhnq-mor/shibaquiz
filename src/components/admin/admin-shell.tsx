import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import type { ReactNode } from "react";

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
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link
          href={`/${locale}/admin` as Route}
          className="brand admin-sidebar-brand"
          aria-label={messages.dashboard.title}
        >
          <BrandMark />
          <span>ShibaQuiz Admin</span>
        </Link>
        <AdminNav locale={locale} messages={messages} />
        <div className="admin-sidebar-footer">
          <Link href={`/${locale}` as Route}>{messages.nav.backToSite}</Link>
          <LocaleSwitcher
            locale={locale}
            navigationLabel={messages.dashboard.title}
            vietnameseLabel="Tiếng Việt"
            englishLabel="English"
          />
        </div>
      </aside>
      <div className="admin-content">
        <main className="page-shell admin-main">{children}</main>
      </div>
    </div>
  );
}
