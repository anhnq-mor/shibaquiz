import { notFound } from "next/navigation";

import { ImportJobsMonitor } from "@/components/admin/import-jobs-monitor";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";

export const dynamic = "force-dynamic";

export default async function AdminImportJobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getAdminMessages(locale);

  return (
    <>
      <div className="admin-page-header">
        <h1>{messages.imports.jobsTitle}</h1>
        <p>{messages.imports.jobsDescription}</p>
      </div>
      <ImportJobsMonitor locale={locale} messages={messages} />
    </>
  );
}
