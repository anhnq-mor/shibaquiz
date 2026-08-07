import { notFound } from "next/navigation";

import { TestsEditor } from "@/components/admin/tests-editor";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import { getAdminContentService } from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function AdminTestsPage({
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
        <h1>{messages.tests.title}</h1>
        <p>{messages.tests.description}</p>
      </div>
      <TestsEditor
        locale={locale}
        messages={messages}
        exams={workspace.exams}
        topics={workspace.topics}
        questions={workspace.questions}
        tests={workspace.tests}
      />
    </>
  );
}
