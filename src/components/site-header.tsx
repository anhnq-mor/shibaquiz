import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { BookOpen, History, ShieldCheck } from "lucide-react";

import { AccountMenu } from "@/components/account-menu";
import { AppMenu, type AppMenuItem } from "@/components/app-menu";
import type { AuthenticatedUserDto } from "@/domain/auth/auth";
import type { Locale } from "@/domain/common/locale";
import type { MessageCatalog } from "@/i18n/catalogs";

import { BrandMark } from "./brand-mark";
import { LanguageSwitcher } from "./language-switcher";

export function SiteHeader({
  locale,
  messages,
  user,
  showMarketingNav = true,
}: {
  locale: Locale;
  messages: MessageCatalog;
  user: AuthenticatedUserDto | null;
  showMarketingNav?: boolean;
}) {
  const appMenuItems: AppMenuItem[] = user
    ? [
        {
          href: `/${locale}/exams` as Route,
          label: messages.navigation.exams,
          icon: <BookOpen size={16} aria-hidden />,
        },
        {
          href: `/${locale}/history` as Route,
          label: messages.navigation.history,
          icon: <History size={16} aria-hidden />,
        },
        ...(user.role === "ADMIN"
          ? [
              {
                href: `/${locale}/admin` as Route,
                label: messages.navigation.admin,
                icon: <ShieldCheck size={16} aria-hidden />,
              },
            ]
          : []),
      ]
    : [];

  return (
    <header className="site-header">
      <div className="page-shell header-inner">
        <Link
          href={(user ? `/${locale}/exams` : `/${locale}`) as Route}
          className="brand"
          aria-label={messages.a11y.homeLabel}
        >
          <BrandMark />
          <span>ShibaQuiz</span>
        </Link>
        {user && (
          <AppMenu
            triggerLabel={messages.navigation.appMenu}
            triggerAriaLabel={messages.navigation.appMenuLabel}
            items={appMenuItems}
          />
        )}
        {showMarketingNav && (
          <nav
            className="primary-navigation"
            aria-label={messages.navigation.overview}
          >
            <a href="#principles">{messages.navigation.architecture}</a>
            <a href="#status">{messages.navigation.status}</a>
          </nav>
        )}
        <div className="header-actions">
          <LanguageSwitcher locale={locale} messages={messages} />
          {user ? (
            <AccountMenu locale={locale} messages={messages} user={user} />
          ) : (
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
          )}
        </div>
      </div>
    </header>
  );
}
