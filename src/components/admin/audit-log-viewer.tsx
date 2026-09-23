"use client";

import { AuditLogViewer as BaseAuditLogViewer } from "@shibaquiz/admin-platform/components/audit-log-viewer";

import { adminApiRequest } from "@/components/admin/admin-api";
import type { AuditLogEntry } from "@/domain/admin/audit";
import type { Locale } from "@/domain/common/locale";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

export function AuditLogViewer({
  locale,
  messages,
  initialItems,
  initialCursor,
}: {
  locale: Locale;
  messages: AdminCatalog;
  initialItems: AuditLogEntry[];
  initialCursor: string | null;
}) {
  return (
    <BaseAuditLogViewer
      locale={locale}
      messages={{ common: messages.common, audit: messages.audit }}
      initialItems={initialItems}
      initialCursor={initialCursor}
      request={adminApiRequest}
    />
  );
}
