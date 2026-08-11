import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { notFound } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isLocale } from "@/domain/common/locale";
import { getAuthMessages } from "@/i18n/auth-catalogs";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getAuthMessages(locale);
  return (
    <AuthShell
      locale={locale}
      messages={messages}
      path="login"
      title={messages.login.title}
      description={messages.login.description}
    >
      <AuthForm mode="login" locale={locale} messages={messages} />
      <div className="auth-links">
        <span>
          <Link href={`/${locale}/forgot-password` as Route}>
            {messages.login.forgotLink}
          </Link>{" "}
          ·{" "}
          <Link href={`/${locale}/verify-email` as Route}>
            {messages.login.resendLink}
          </Link>
        </span>
        <span>
          {messages.login.noAccount}{" "}
          <Link href={`/${locale}/register` as Route}>
            {messages.login.registerLink}
          </Link>
        </span>
      </div>
    </AuthShell>
  );
}
