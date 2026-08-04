import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { LogoutButton } from "@/components/auth/logout-button";
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
    <AuthShell
      locale={locale}
      messages={messages}
      path="account"
      title={messages.account.title}
      description={`${messages.account.signedInAs} ${user.displayName}`}
    >
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
      <hr />
      <h2 className="auth-subtitle">{messages.account.changeTitle}</h2>
      <p className="auth-description">{messages.account.changeDescription}</p>
      <AuthForm mode="change" locale={locale} messages={messages} />
      <LogoutButton
        locale={locale}
        label={messages.account.logout}
        working={messages.common.working}
      />
    </AuthShell>
  );
}
