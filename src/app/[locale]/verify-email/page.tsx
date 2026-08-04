import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isLocale } from "@/domain/common/locale";
import { getAuthMessages } from "@/i18n/auth-catalogs";
import { loadAuthConfig } from "@/server/config/env";

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ locale }, { token }] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  await connection();
  const messages = getAuthMessages(locale);
  const verificationRequired = loadAuthConfig().REQUIRE_EMAIL_VERIFICATION;
  return (
    <AuthShell
      locale={locale}
      messages={messages}
      path="verify-email"
      token={token}
      title={messages.verify.title}
      description={
        verificationRequired
          ? messages.verify.description
          : messages.verify.disabledDescription
      }
    >
      {!verificationRequired ? (
        <p className="auth-alternative">
          <Link href={`/${locale}/login` as Route}>
            {messages.register.loginLink}
          </Link>
        </p>
      ) : token ? (
        <>
          <AuthForm
            mode="verify"
            locale={locale}
            messages={messages}
            token={token}
          />
          <p className="auth-alternative">
            <Link href={`/${locale}/login` as Route}>
              {messages.register.loginLink}
            </Link>
          </p>
        </>
      ) : (
        <>
          <h2 className="auth-subtitle">{messages.verify.resendTitle}</h2>
          <p className="auth-description">
            {messages.verify.resendDescription}
          </p>
          <AuthForm mode="resend" locale={locale} messages={messages} />
        </>
      )}
    </AuthShell>
  );
}
