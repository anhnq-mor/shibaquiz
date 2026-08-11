"use client";

import { useState } from "react";

import {
  adminApiRequest,
  AdminApiRequestError,
} from "@/components/admin/admin-api";
import type { AdminUserSummary } from "@/domain/admin/users";
import type { Locale } from "@/domain/common/locale";
import { formatDateTime } from "@/i18n/format";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

export function UsersManager({
  locale,
  messages,
  initialItems,
  initialCursor,
  currentUserId,
}: {
  locale: Locale;
  messages: AdminCatalog;
  initialItems: AdminUserSummary[];
  initialCursor: string | null;
  currentUserId: string;
}) {
  const [items, setItems] = useState<AdminUserSummary[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  function buildQuery(cursorValue: string | null): string {
    const params = new URLSearchParams();
    if (filterRole) params.set("role", filterRole);
    if (filterStatus) params.set("status", filterStatus);
    if (searchQuery.trim()) params.set("query", searchQuery.trim());
    if (cursorValue) params.set("cursor", cursorValue);
    return params.toString();
  }

  async function reload() {
    const query = buildQuery(null);
    const result = await adminApiRequest<{
      items: AdminUserSummary[];
      nextCursor: string | null;
    }>(`/api/admin/users${query ? `?${query}` : ""}`, locale, {
      method: "GET",
    });
    setItems(result.items);
    setCursor(result.nextCursor);
  }

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const query = buildQuery(cursor);
      const result = await adminApiRequest<{
        items: AdminUserSummary[];
        nextCursor: string | null;
      }>(`/api/admin/users?${query}`, locale, { method: "GET" });
      setItems((current) => [...current, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function runAction(
    userId: string,
    confirmText: string,
    request: () => Promise<void>,
    successText?: string,
  ) {
    if (!window.confirm(confirmText)) return;
    setMessage(null);
    setPendingUserId(userId);
    try {
      await request();
      if (successText) {
        setMessage({ kind: "success", text: successText });
      }
      await reload();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof AdminApiRequestError
            ? (error.body?.message ?? messages.users.actionFailed)
            : messages.common.connectionError,
      });
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="admin-layout">
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>{messages.users.title}</h2>
        </div>

        <div className="admin-inline-fields">
          <label>
            <span>{messages.users.searchLabel}</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void reload();
                }
              }}
            />
          </label>
          <label>
            <span>{messages.users.filterRole}</span>
            <select
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value)}
            >
              <option value="">{messages.users.filterAll}</option>
              <option value="USER">{messages.users.roleUser}</option>
              <option value="ADMIN">{messages.users.roleAdmin}</option>
            </select>
          </label>
          <label>
            <span>{messages.users.filterStatus}</span>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="">{messages.users.filterAll}</option>
              <option value="ACTIVE">{messages.users.statusActive}</option>
              <option value="LOCKED">{messages.users.statusLocked}</option>
            </select>
          </label>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => reload()}
          >
            {messages.common.apply}
          </button>
        </div>

        {message && (
          <p
            className={`form-message ${message.kind}`}
            role={message.kind === "error" ? "alert" : "status"}
          >
            {message.text}
          </p>
        )}

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{messages.users.tableEmail}</th>
                <th scope="col">{messages.users.tableName}</th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.users.tableRole}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.users.tableStatus}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.users.tableLastLogin}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.common.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => {
                const isSelf = user.id === currentUserId;
                const busy = pendingUserId === user.id;
                return (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.displayName}</td>
                    <td className="admin-cell-nowrap">
                      <span className="status-pill">
                        {user.role === "ADMIN"
                          ? messages.users.roleAdmin
                          : messages.users.roleUser}
                      </span>
                    </td>
                    <td className="admin-cell-nowrap">
                      <span className="status-pill">
                        {user.status === "LOCKED"
                          ? messages.users.statusLocked
                          : messages.users.statusActive}
                      </span>
                    </td>
                    <td className="admin-cell-nowrap">
                      {user.lastLoginAt
                        ? formatDateTime(user.lastLoginAt, locale)
                        : messages.users.never}
                    </td>
                    <td className="admin-cell-nowrap">
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={busy || isSelf}
                          onClick={() =>
                            runAction(
                              user.id,
                              user.status === "LOCKED"
                                ? messages.users.confirmUnlock
                                : messages.users.confirmLock,
                              () =>
                                adminApiRequest(
                                  `/api/admin/users/${user.id}/lock`,
                                  locale,
                                  { body: { locked: user.status !== "LOCKED" } },
                                ),
                            )
                          }
                        >
                          {user.status === "LOCKED"
                            ? messages.users.unlockAction
                            : messages.users.lockAction}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={busy || isSelf}
                          onClick={() =>
                            runAction(
                              user.id,
                              user.role === "ADMIN"
                                ? messages.users.confirmDemote
                                : messages.users.confirmPromote,
                              () =>
                                adminApiRequest(
                                  `/api/admin/users/${user.id}/role`,
                                  locale,
                                  {
                                    body: {
                                      role:
                                        user.role === "ADMIN" ? "USER" : "ADMIN",
                                    },
                                  },
                                ),
                            )
                          }
                        >
                          {user.role === "ADMIN"
                            ? messages.users.demoteAction
                            : messages.users.promoteAction}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          disabled={busy}
                          onClick={() =>
                            runAction(
                              user.id,
                              messages.users.confirmResetPassword,
                              () =>
                                adminApiRequest(
                                  `/api/admin/users/${user.id}/reset-password`,
                                  locale,
                                ),
                              messages.users.resetPasswordSent,
                            )
                          }
                        >
                          {messages.users.resetPasswordAction}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? messages.media.processing : messages.common.loadMore}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
