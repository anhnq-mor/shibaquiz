import { notFound } from "next/navigation";

import { AuditLogViewer } from "@/components/admin/audit-log-viewer";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import { getAuditLogService } from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getAdminMessages(locale);
  const page = await getAuditLogService().list({ limit: 30 });

  return (
    <>
      <div className="admin-page-header">
        <h1>{messages.audit.title}</h1>
        <p>{messages.audit.description}</p>
      </div>
      <AuditLogViewer
        locale={locale}
        messages={messages}
        initialItems={page.items}
        initialCursor={page.nextCursor}
      />
    </>
  );
}
