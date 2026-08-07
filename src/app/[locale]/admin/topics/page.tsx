import { notFound } from "next/navigation";

import { TopicsEditor } from "@/components/admin/topics-editor";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import { getAdminContentService } from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function AdminTopicsPage({
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
        <h1>{messages.topics.title}</h1>
        <p>{messages.topics.description}</p>
      </div>
      <TopicsEditor
        locale={locale}
        messages={messages}
        exams={workspace.exams}
        topics={workspace.topics}
      />
    </>
  );
}
