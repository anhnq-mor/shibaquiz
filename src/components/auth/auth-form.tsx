"use client";

import type { Route } from "next";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);

  const action = {
    register: "/api/auth/register",
    login: "/api/auth/login",
    forgot: "/api/auth/forgot-password",
    reset: "/api/auth/reset-password",
    verify: "/api/auth/verify-email",
    resend: "/api/auth/resend-verification",
    change: "/api/auth/change-password",
  }[mode];
  const actionLabel = {
    register: messages.register.action,
    login: messages.login.action,
    forgot: messages.forgot.action,
    reset: messages.reset.action,
    verify: messages.verify.action,
    resend: messages.verify.resendAction,
    change: messages.account.changeAction,
  }[mode];
  const successMessage = {
    register: messages.register.success,
    login: "",
    forgot: messages.forgot.success,
    reset: messages.reset.success,
    verify: messages.verify.success,
    resend: messages.verify.resendSuccess,
    change: messages.account.changeSuccess,
  }[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setResult(null);
    const form = new FormData(formElement);
    const payload: Record<string, string> = { locale };
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") payload[key] = value;
    }
    if (token) payload.token = token;
    const passwordToConfirm =
      mode === "change"
        ? payload.newPassword
        : mode === "register" || mode === "reset"
          ? payload.password
          : undefined;
    if (
      passwordToConfirm !== undefined &&
      passwordToConfirm !== payload.confirmPassword
    ) {
      setResult({ kind: "error", message: messages.common.passwordMismatch });
      return;
    }
    setPending(true);

    try {
      const response = await apiFetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as {
        message?: string;
        delivery?: "console" | "resend" | "disabled";
        verificationRequired?: boolean;
        user?: { role: "USER" | "ADMIN" };
      };
      if (!response.ok) {
        setResult({ kind: "error", message: body.message ?? "" });
        return;
      }
      if (mode === "login") {
        const destination = body.user?.role === "ADMIN" ? "admin" : "exams";
        router.push(`/${locale}/${destination}` as Route);
        router.refresh();
        return;
      }
      const deliveryNotice =
        body.delivery === "console" && body.verificationRequired !== false
          ? ` ${messages.common.consoleEmailNotice}`
          : "";
      const resolvedSuccessMessage =
        mode === "register" && body.verificationRequired === false
          ? messages.register.successWithoutVerification
          : successMessage;
      setResult({
        kind: "success",
        message: `${resolvedSuccessMessage}${deliveryNotice}`,
      });
      if (mode !== "change" && mode !== "verify") formElement.reset();
    } catch {
      setResult({
        kind: "error",
        message: messages.common.connectionError,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={action} className="auth-form" method="post" onSubmit={submit}>
      {mode === "register" && (
        <label>
          <span>{messages.common.displayName}</span>
          <input
            name="displayName"
            autoComplete="name"
            required
            maxLength={100}
          />
        </label>
      )}
      {(mode === "register" ||
        mode === "login" ||
        mode === "forgot" ||
        mode === "resend") && (
        <label>
          <span>{messages.common.email}</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={320}
          />
        </label>
      )}
      {(mode === "register" || mode === "login") && (
        <label>
          <span>{messages.common.password}</span>
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={mode === "register" ? 10 : 1}
            maxLength={128}
          />
          {mode === "register" && <small>{messages.common.passwordHint}</small>}
        </label>
      )}
      {mode === "register" && (
        <label>
          <span>{messages.common.confirmPassword}</span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
          />
        </label>
      )}
      {mode === "reset" && (
        <>
          <label>
            <span>{messages.common.newPassword}</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
            <small>{messages.common.passwordHint}</small>
          </label>
          <label>
            <span>{messages.common.confirmPassword}</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
          </label>
        </>
      )}
      {mode === "change" && (
        <>
          <label>
            <span>{messages.common.currentPassword}</span>
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <label>
            <span>{messages.common.newPassword}</span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
            <small>{messages.common.passwordHint}</small>
          </label>
          <label>
            <span>{messages.common.confirmPassword}</span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
          </label>
        </>
      )}
      {result && (
        <p
          className={`form-message ${result.kind}`}
          role={result.kind === "error" ? "alert" : "status"}
        >
          {result.message}
        </p>
      )}
      <button
        className="button button-primary auth-submit"
        type="submit"
        disabled={pending}
      >
        {pending ? messages.common.working : actionLabel}
      </button>
    </form>
  );
}
