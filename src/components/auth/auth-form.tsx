"use client";

import { AuthForm as BaseAuthForm } from "@shibaquiz/admin-platform/components/auth-form";

import { apiFetch } from "@/components/api-activity";
import type { Locale } from "@/domain/common/locale";
import type { AuthCatalog } from "@/i18n/auth-catalogs";

type Mode =
  "register" | "login" | "forgot" | "reset" | "verify" | "resend" | "change";

export function AuthForm({
  mode,
  locale,
  messages,
  token,
}: {
  mode: Mode;
  locale: Locale;
  messages: AuthCatalog;
  token?: string;
}) {
  return (
    <BaseAuthForm
      mode={mode}
      locale={locale}
      messages={messages}
      token={token}
      fetchImpl={apiFetch}
      resolveLoginRedirect={(role) => (role === "ADMIN" ? "admin" : "exams")}
    />
  );
}
