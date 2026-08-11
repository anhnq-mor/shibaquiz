import { notFound } from "next/navigation";

import { ImportWizard } from "@/components/admin/import-wizard";
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
      </div>
      <ImportWizard locale={locale} messages={messages} exams={workspace.exams} />
    </>
  );
}
