import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isLocale } from "@/domain/common/locale";
import { getAuthMessages } from "@/i18n/auth-catalogs";

export default async function ForgotPasswordPage({
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
      path="forgot-password"
      title={messages.forgot.title}
      description={messages.forgot.description}
    >
      <AuthForm mode="forgot" locale={locale} messages={messages} />
      <p className="auth-alternative">
        <Link href={`/${locale}/login` as Route}>
          {messages.forgot.loginLink}
        </Link>
      </p>
    </AuthShell>
  );
}
