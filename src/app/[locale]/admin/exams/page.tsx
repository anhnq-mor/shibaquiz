import { notFound } from "next/navigation";

import { ExamsEditor } from "@/components/admin/exams-editor";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import { getAdminContentService } from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function AdminExamsPage({
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
        <h1>{messages.exams.title}</h1>
        <p>{messages.exams.description}</p>
      </div>
      <ExamsEditor
        locale={locale}
        messages={messages}
        exams={workspace.exams}
      />
    </>
  );
}
