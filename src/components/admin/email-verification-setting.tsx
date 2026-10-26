"use client";

import { useState } from "react";

import {
  adminApiRequest,
  AdminApiRequestError,
} from "@/components/admin/admin-api";
import type { Locale } from "@/domain/common/locale";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

export function EmailVerificationSetting({
  locale,
  messages,
  initialRequired,
  emailProvider,
}: {
  locale: Locale;
  messages: AdminCatalog;
  initialRequired: boolean;
  emailProvider: "console" | "resend" | "disabled";
}) {
  const [required, setRequired] = useState(initialRequired);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const delivery = emailProvider === "disabled";

  async function change(next: boolean) {
    setPending(true);
    setResult(null);
    try {
      await adminApiRequest("/api/admin/settings/email-verification", locale, {
        body: { required: next },
      });
      setRequired(next);
      setResult({
        kind: "success",
        text: messages.users.emailVerificationSaved,
      });
    } catch (error) {
      setResult({
        kind: "error",
        text:
          error instanceof AdminApiRequestError
            ? (error.body?.message ?? messages.users.actionFailed)
            : messages.common.connectionError,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2>{messages.users.emailVerificationHeading}</h2>
      </div>
      <p>{messages.users.emailVerificationHint}</p>
      {delivery && (
        <p className="form-message error" role="alert">
          {messages.users.emailVerificationDeliveryDisabled}
        </p>
      )}
      {emailProvider === "console" && (
        <p className="form-message error" role="alert">
          {messages.users.emailVerificationConsoleWarning}
        </p>
      )}
      <label className="admin-checkbox-field">
        <span>{messages.users.emailVerificationLabel}</span>
        <input
          type="checkbox"
          checked={required}
          disabled={pending || delivery}
          onChange={(event) => void change(event.target.checked)}
        />
      </label>
      {result && (
        <p
          className={`form-message ${result.kind}`}
          role={result.kind === "error" ? "alert" : "status"}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
