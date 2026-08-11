"use client";

import { useState } from "react";

import { adminApiRequest } from "@/components/admin/admin-api";
import type { AuditLogEntry } from "@/domain/admin/audit";
import type { Locale } from "@/domain/common/locale";
import { formatDateTime } from "@/i18n/format";
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
  const [items, setItems] = useState<AuditLogEntry[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await adminApiRequest<{
        items: AuditLogEntry[];
        nextCursor: string | null;
      }>(`/api/admin/audit?cursor=${cursor}`, locale, { method: "GET" });
      setItems((current) => [...current, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-layout">
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>{messages.audit.listHeading}</h2>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.audit.tableWhen}
                </th>
                <th scope="col">{messages.audit.tableActor}</th>
                <th scope="col">{messages.audit.tableAction}</th>
                <th scope="col">{messages.audit.tableEntityType}</th>
                <th scope="col">{messages.audit.tableEntityId}</th>
                <th scope="col">{messages.audit.tableMetadata}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id}>
                  <td className="admin-cell-nowrap">
                    {formatDateTime(entry.createdAt, locale)}
                  </td>
                  <td>
                    {entry.actorDisplayName ?? messages.audit.systemActor}
                  </td>
                  <td>{entry.action}</td>
                  <td>{entry.entityType}</td>
                  <td className="admin-cell-nowrap">{entry.entityId}</td>
                  <td>
                    <code>{JSON.stringify(entry.metadata)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="admin-empty">{messages.common.empty}</p>
          )}
        </div>

        {cursor && (
          <div className="admin-form-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={loading}
              onClick={loadMore}
            >
              {messages.common.loadMore}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
