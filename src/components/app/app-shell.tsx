import type { ReactNode } from "react";

import { ChatbotWidget } from "@/components/app/chatbot-widget";
import { SiteHeader } from "@/components/site-header";
import type { AuthenticatedUserDto } from "@/domain/auth/auth";
import type { Locale } from "@/domain/common/locale";
import { getMessages } from "@/i18n/catalogs";
import { getQuizMessages } from "@/i18n/quiz-catalogs";

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
      <ChatbotWidget locale={locale} messages={getQuizMessages(locale)} />
    </div>
  );
}
