import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isLocale } from "@/domain/common/locale";
import { getAuthMessages } from "@/i18n/auth-catalogs";

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ locale }, { token }] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const messages = getAuthMessages(locale);
  return (
    <AuthShell
      locale={locale}
      messages={messages}
      path="reset-password"
      token={token}
      title={messages.reset.title}
      description={messages.reset.description}
    >
      {token ? (
        <AuthForm
          mode="reset"
          locale={locale}
          messages={messages}
          token={token}
        />
      ) : (
        <p className="form-message error" role="alert">
          {messages.reset.missingToken}
        </p>
      )}
      <p className="auth-alternative">
        <Link href={`/${locale}/login` as Route}>
          {messages.reset.loginLink}
        </Link>
      </p>
    </AuthShell>
  );
}
