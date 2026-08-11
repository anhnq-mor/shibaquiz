import { notFound } from "next/navigation";
import type { Route } from "next";

import { ImportWizard } from "@/components/admin/import-wizard";
import { RouteLink as Link } from "@/components/route-link";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import { getAdminContentService } from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function AdminImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getAdminMessages(locale);
  const workspace = await getAdminContentService().getWorkspace();

  return (
    <>
      <div className="admin-page-header">
        <h1>{messages.imports.title}</h1>
        <p>{messages.imports.description}</p>
        <Link
          href={`/${locale}/admin/import/jobs` as Route}
          className="button button-secondary"
        >
          {messages.imports.viewJobsAction}
        </Link>
      </div>
      <ImportWizard
        locale={locale}
        messages={messages}
        exams={workspace.exams}
      />
    </>
  );
}
