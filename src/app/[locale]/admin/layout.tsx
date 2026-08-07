import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getAdminMessages(locale);
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login` as Route);

  if (user.role !== "ADMIN") {
    return (
      <div className="page-shell admin-forbidden" role="alert">
        <h1>{messages.forbidden.title}</h1>
        <p>{messages.forbidden.description}</p>
        <Link href={`/${locale}` as Route}>{messages.forbidden.homeLink}</Link>
      </div>
    );
  }

  return (
    <AdminShell locale={locale} messages={messages}>
      {children}
    </AdminShell>
  );
}
