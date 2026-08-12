import type { ReactNode } from "react";

import { SiteHeader } from "@/components/site-header";
import type { AuthenticatedUserDto } from "@/domain/auth/auth";
import type { Locale } from "@/domain/common/locale";
import { getMessages } from "@/i18n/catalogs";

export function AppShell({
  locale,
  user,
  children,
}: {
  locale: Locale;
  user: AuthenticatedUserDto;
  children: ReactNode;
}) {
  const messages = getMessages(locale);

  return (
    <div className="app-shell">
      <SiteHeader
        locale={locale}
        messages={messages}
        user={user}
        showMarketingNav={false}
      />
      <main className="page-shell app-main">{children}</main>
    </div>
  );
}
