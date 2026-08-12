"use client";

import { Trash2 } from "lucide-react";

import type { ContentStatus } from "@/domain/admin/content";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

export function BulkActionsToolbar({
  messages,
  count,
  allArchived,
  pending,
  status,
  onStatusChange,
  onApplyStatus,
  onDelete,
  result,
}: {
  messages: AdminCatalog;
  count: number;
  allArchived: boolean;
  pending: boolean;
  status: ContentStatus;
  onStatusChange: (status: ContentStatus) => void;
  onApplyStatus: () => void;
  onDelete: () => void;
  result: { kind: "error" | "success"; message: string } | null;
}) {
  if (count === 0) return null;

  return (
    <div className="admin-bulk-toolbar">
      <span>{messages.common.selectedCount.replace("{count}", String(count))}</span>
      <label>
        <span>{messages.common.bulkStatusLabel}</span>
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as ContentStatus)}
        >
          <option value="DRAFT">{messages.common.statusDraft}</option>
          <option value="PUBLISHED">{messages.common.statusPublished}</option>
          <option value="ARCHIVED">{messages.common.statusArchived}</option>
        </select>
      </label>
      <button
        type="button"
        className="button button-secondary"
        onClick={onApplyStatus}
        disabled={pending}
      >
        {messages.common.apply}
      </button>
      <button
        type="button"
        className="button button-danger"
        onClick={onDelete}
        disabled={pending || !allArchived}
        title={
          allArchived ? undefined : messages.common.bulkDeleteOnlyArchivedHint
        }
      >
        <Trash2 size={16} aria-hidden />
        {messages.common.bulkDeleteAction}
      </button>
      {result && (
        <p
          className={`form-message ${result.kind}`}
          role={result.kind === "error" ? "alert" : "status"}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
