"use client";

import type { Route } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/components/api-activity";
import type { Locale } from "@/domain/common/locale";

export function LogoutButton({
  locale,
  label,
  working,
  className = "button button-secondary",
}: {
  locale: Locale;
  label: string;
  working: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className={className}
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await apiFetch("/api/auth/logout", { method: "POST" });
        } finally {
          router.push(`/${locale}/login` as Route);
          router.refresh();
        }
      }}
    >
      {pending ? working : label}
    </button>
  );
}
