"use client";

import { useState } from "react";

import type { AuditLogEntry } from "../domain/audit-log";
import type { Locale } from "../domain/auth";
import { formatDateTime } from "../format";
import type { ApiRequestFn } from "./api-client";

export interface AuditLogViewerMessages {
  common: {
    empty: string;
    loadMore: string;
  };
  audit: {
    listHeading: string;
    tableWhen: string;
    tableActor: string;
    tableAction: string;
    tableEntityType: string;
    tableEntityId: string;
    tableMetadata: string;
    systemActor: string;
  };
}

export function AuditLogViewer({
  locale,
  messages,
  initialItems,
  initialCursor,
  request,
}: {
  locale: Locale;
  messages: AuditLogViewerMessages;
  initialItems: AuditLogEntry[];
  initialCursor: string | null;
  request: ApiRequestFn;
}) {
  const [items, setItems] = useState<AuditLogEntry[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await request<{
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
