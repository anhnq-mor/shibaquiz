import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { isLocale } from "@/domain/common/locale";
import { getAuthMessages } from "@/i18n/auth-catalogs";
import { getQuizMessages } from "@/i18n/quiz-catalogs";
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
  const quizMessages = getQuizMessages(locale);
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
      <p className="auth-links">
        <Link href={`/${locale}/exams` as Route}>{quizMessages.nav.exams}</Link>
        {" · "}
        <Link href={`/${locale}/history` as Route}>
          {quizMessages.nav.history}
        </Link>
      </p>
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
