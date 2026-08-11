import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { notFound } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { isLocale } from "@/domain/common/locale";
import { getAuthMessages } from "@/i18n/auth-catalogs";

export default async function RegisterPage({
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
      path="register"
      title={messages.register.title}
      description={messages.register.description}
    >
      <AuthForm mode="register" locale={locale} messages={messages} />
      <p className="auth-alternative">
        {messages.register.hasAccount}{" "}
        <Link href={`/${locale}/login` as Route}>
          {messages.register.loginLink}
        </Link>
      </p>
    </AuthShell>
  );
}
