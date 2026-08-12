import { notFound, redirect } from "next/navigation";
import type { Route } from "next";

import { AppShell } from "@/components/app/app-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { isLocale } from "@/domain/common/locale";
import { getAuthMessages } from "@/i18n/auth-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login` as Route);
  const messages = getAuthMessages(locale);

  return (
    <AppShell locale={locale} user={user}>
      <div className="app-page-header">
        <h1>{messages.account.title}</h1>
        <p>
          {messages.account.signedInAs} {user.displayName}
        </p>
      </div>

      <div className="admin-layout">
        <div className="admin-card">
          <dl className="account-summary">
            <div>
              <dt>{messages.common.email}</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>{messages.account.role}</dt>
              <dd>{user.role}</dd>
            </div>
          </dl>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2>{messages.account.changeTitle}</h2>
          </div>
          <p className="admin-hint">{messages.account.changeDescription}</p>
          <AuthForm mode="change" locale={locale} messages={messages} />
        </div>
      </div>
    </AppShell>
  );
}
