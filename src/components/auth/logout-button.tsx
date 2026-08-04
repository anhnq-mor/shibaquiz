"use client";

import type { Route } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "@/domain/common/locale";

export function LogoutButton({
  locale,
  label,
  working,
}: {
  locale: Locale;
  label: string;
  working: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="button button-secondary"
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.push(`/${locale}/login` as Route);
        router.refresh();
      }}
    >
      {pending ? working : label}
    </button>
  );
}
