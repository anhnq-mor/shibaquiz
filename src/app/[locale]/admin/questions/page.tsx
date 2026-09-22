import { notFound } from "next/navigation";

import { QuestionsEditor } from "@/components/admin/questions-editor";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import {
  getAdminContentService,
  getMediaLibraryService,
} from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getAdminMessages(locale);
  const [{ exams, topics }, readyMedia, initialResult] = await Promise.all([
    getAdminContentService().listExamsAndTopics(),
    getMediaLibraryService().listLibrary({ status: "READY", limit: 100 }),
    getAdminContentService().listQuestions({ page: 1, pageSize: 20 }),
  ]);

  return (
    <>
      <div className="admin-page-header">
        <h1>{messages.questions.title}</h1>
        <p>{messages.questions.description}</p>
      </div>
      <QuestionsEditor
        locale={locale}
        messages={messages}
        exams={exams}
        topics={topics}
        initialResult={initialResult}
        readyMedia={readyMedia.items}
      />
    </>
  );
}
