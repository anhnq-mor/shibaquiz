"use client";

import { useState, type FormEvent } from "react";

import { appApiRequest, AppApiRequestError } from "@/components/app/app-api";
import type { CommentSummary } from "@/domain/comments/comments";
import type { Locale } from "@/domain/common/locale";
import { formatDateTime } from "@/i18n/format";
import type { QuizCatalog } from "@/i18n/quiz-catalogs";

export function CommentThread({
  locale,
  messages,
  questionId,
  currentUserId,
  isAdmin,
}: {
  locale: Locale;
  messages: QuizCatalog;
  questionId: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<CommentSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadFirstPage() {
    setLoading(true);
    setError(null);
    try {
      const result = await appApiRequest<{
        items: CommentSummary[];
        nextCursor: string | null;
      }>(`/api/comments?questionId=${questionId}`, locale, { method: "GET" });
      setItems(result.items);
      setCursor(result.nextCursor);
      setLoaded(true);
    } catch {
      setError(messages.comments.postError);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    try {
      const result = await appApiRequest<{
        items: CommentSummary[];
        nextCursor: string | null;
      }>(`/api/comments?questionId=${questionId}&cursor=${cursor}`, locale, {
        method: "GET",
      });
      setItems((current) => [...current, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) await loadFirstPage();
  }

  async function submitNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newContent.trim()) return;
    setError(null);
    setPosting(true);
    try {
      const comment = await appApiRequest<CommentSummary>("/api/comments", locale, {
        body: { questionId, content: newContent.trim() },
      });
      setItems((current) => [comment, ...current]);
      setNewContent("");
    } catch (err) {
      setError(
        err instanceof AppApiRequestError && err.body?.code === "RATE_LIMITED"
          ? messages.comments.rateLimited
          : messages.comments.postError,
      );
    } finally {
      setPosting(false);
    }
  }

  function startEdit(comment: CommentSummary) {
    setEditingId(comment.id);
    setEditContent(comment.content);
  }

  async function saveEdit(id: string) {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      const updated = await appApiRequest<CommentSummary>(
        `/api/comments/${id}`,
        locale,
        { method: "PATCH", body: { content: editContent.trim() } },
      );
      setItems((current) =>
        current.map((item) => (item.id === id ? updated : item)),
      );
      setEditingId(null);
    } catch {
      setError(messages.comments.postError);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteOwn(id: string) {
    if (!window.confirm(messages.comments.deleteConfirm)) return;
    await appApiRequest(`/api/comments/${id}`, locale, { method: "DELETE" });
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function moderate(id: string) {
    const reason = window.prompt(messages.comments.moderateReasonPrompt);
    if (!reason || !reason.trim()) return;
    await appApiRequest(`/api/admin/comments/${id}/moderate`, locale, {
      body: { reason: reason.trim() },
    });
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="comment-thread">
      <button type="button" className="button button-secondary" onClick={toggleExpand}>
        {expanded ? messages.comments.hideAction : messages.comments.showAction}
      </button>

      {expanded && (
        <div className="comment-thread-body">
          <h4>{messages.comments.heading}</h4>

          <form className="comment-form" onSubmit={submitNew}>
            <label>
              <span className="sr-only">{messages.comments.heading}</span>
              <textarea
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                placeholder={messages.comments.placeholder}
                maxLength={2000}
                required
              />
            </label>
            <button type="submit" className="button button-primary" disabled={posting}>
              {posting ? messages.comments.posting : messages.comments.postAction}
            </button>
          </form>

          {error && (
            <p className="form-message error" role="alert">
              {error}
            </p>
          )}

          {loading && items.length === 0 ? null : items.length === 0 ? (
            <p className="admin-empty">{messages.comments.empty}</p>
          ) : (
            <ul className="comment-list">
              {items.map((comment) => (
                <li key={comment.id}>
                  <div className="comment-meta">
                    <strong>{comment.authorDisplayName}</strong>
                    <span>{formatDateTime(comment.createdAt, locale)}</span>
                    {comment.editedAt && (
                      <span>{messages.comments.editedLabel}</span>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <div className="comment-edit">
                      <label>
                        <span className="sr-only">
                          {messages.comments.editAction}
                        </span>
                        <textarea
                          value={editContent}
                          onChange={(event) =>
                            setEditContent(event.target.value)
                          }
                          maxLength={2000}
                        />
                      </label>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="button button-primary"
                          disabled={savingEdit}
                          onClick={() => saveEdit(comment.id)}
                        >
                          {messages.comments.saveAction}
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setEditingId(null)}
                        >
                          {messages.comments.cancelAction}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>{comment.content}</p>
                  )}

                  <div className="admin-row-actions">
                    {comment.userId === currentUserId &&
                      editingId !== comment.id && (
                        <>
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => startEdit(comment)}
                          >
                            {messages.comments.editAction}
                          </button>
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => deleteOwn(comment.id)}
                          >
                            {messages.comments.deleteAction}
                          </button>
                        </>
                      )}
                    {isAdmin && comment.userId !== currentUserId && (
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => moderate(comment.id)}
                      >
                        {messages.comments.moderateAction}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {cursor && (
            <button
              type="button"
              className="button button-secondary"
              disabled={loading}
              onClick={loadMore}
            >
              {messages.comments.loadMoreAction}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
