import { notFound } from "next/navigation";

import { QuestionsEditor } from "@/components/admin/questions-editor";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import { getAdminContentService } from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage({
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
        <h1>{messages.questions.title}</h1>
        <p>{messages.questions.description}</p>
      </div>
      <QuestionsEditor
        locale={locale}
        messages={messages}
        exams={workspace.exams}
        topics={workspace.topics}
        questions={workspace.questions}
      />
    </>
  );
}
