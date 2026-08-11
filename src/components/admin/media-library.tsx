"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { AdminDialog } from "@/components/admin/admin-dialog";
import {
  adminApiRequest,
  AdminApiRequestError,
} from "@/components/admin/admin-api";
import type { MediaAssetSummary, MediaStatus } from "@/domain/media/media";
import type { Locale } from "@/domain/common/locale";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

const ACCEPTED_MIME_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp4,audio/aac,audio/ogg,video/mp4,video/webm";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function sha256Base64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function statusLabel(messages: AdminCatalog, status: MediaStatus): string {
  return {
    PENDING: messages.media.statusPending,
    READY: messages.media.statusReady,
    QUARANTINED: messages.media.statusQuarantined,
    DELETED: messages.media.statusDeleted,
  }[status];
}

interface TranslationForm {
  viAltText: string;
  viCaption: string;
  viTranscript: string;
  enAltText: string;
  enCaption: string;
  enTranscript: string;
}

function formFromAsset(asset: MediaAssetSummary | null): TranslationForm {
  const vi = asset?.translations.find((item) => item.locale === "vi");
  const en = asset?.translations.find((item) => item.locale === "en");
  return {
    viAltText: vi?.altText ?? "",
    viCaption: vi?.caption ?? "",
    viTranscript: vi?.transcript ?? "",
    enAltText: en?.altText ?? "",
    enCaption: en?.caption ?? "",
    enTranscript: en?.transcript ?? "",
  };
}

export function MediaLibrary({
  locale,
  messages,
  initialItems,
  initialCursor,
}: {
  locale: Locale;
  messages: AdminCatalog;
  initialItems: MediaAssetSummary[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState<MediaAssetSummary[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetSummary | null>(
    null,
  );
  const [form, setForm] = useState<TranslationForm>(() => formFromAsset(null));
  const [dialogPending, setDialogPending] = useState(false);
  const [dialogResult, setDialogResult] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);

  function buildQuery(cursorValue: string | null): string {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterStatus) params.set("status", filterStatus);
    if (filterKeyword.trim()) params.set("query", filterKeyword.trim());
    if (cursorValue) params.set("cursor", cursorValue);
    return params.toString();
  }

  async function reload() {
    const query = buildQuery(null);
    const result = await adminApiRequest<{
      items: MediaAssetSummary[];
      nextCursor: string | null;
    }>(`/api/admin/media${query ? `?${query}` : ""}`, locale, {
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
        items: MediaAssetSummary[];
        nextCursor: string | null;
      }>(`/api/admin/media?${query}`, locale, { method: "GET" });
      setItems((current) => [...current, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const checksumSha256Base64 = await sha256Base64(file);
      const created = await adminApiRequest<{
        mediaAssetId: string;
        uploadUrl: string;
        requiredHeaders: Record<string, string>;
      }>("/api/admin/media/uploads", locale, {
        body: {
          originalFileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          checksumSha256Base64,
        },
      });
      const putResponse = await fetch(created.uploadUrl, {
        method: "PUT",
        headers: created.requiredHeaders,
        body: file,
      });
      if (!putResponse.ok) {
        throw new Error("upload_transport_failed");
      }
      const asset = await adminApiRequest<MediaAssetSummary>(
        `/api/admin/media/${created.mediaAssetId}/complete`,
        locale,
      );
      setItems((current) => [asset, ...current]);
    } catch (error) {
      if (error instanceof AdminApiRequestError) {
        const code = error.body?.code;
        setUploadError(
          code === "UNSUPPORTED_MEDIA_TYPE"
            ? messages.media.unsupportedType
            : code === "MEDIA_TOO_LARGE"
              ? messages.media.tooLarge
              : (error.body?.message ?? messages.media.uploadFailed),
        );
      } else {
        setUploadError(messages.media.uploadFailed);
      }
    } finally {
      setUploading(false);
    }
  }

  function openDialog(asset: MediaAssetSummary) {
    setSelectedAsset(asset);
    setForm(formFromAsset(asset));
    setDialogResult(null);
    dialogRef.current?.showModal();
  }

  async function submitTranslations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAsset) return;
    setDialogResult(null);
    setDialogPending(true);
    try {
      const translations = [
        {
          locale: "vi" as const,
          altText: form.viAltText || undefined,
          caption: form.viCaption || undefined,
          transcript: form.viTranscript || undefined,
        },
        {
          locale: "en" as const,
          altText: form.enAltText || undefined,
          caption: form.enCaption || undefined,
          transcript: form.enTranscript || undefined,
        },
      ];
      const updated = await adminApiRequest<MediaAssetSummary>(
        `/api/admin/media/${selectedAsset.id}`,
        locale,
        { method: "PATCH", body: { translations } },
      );
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      dialogRef.current?.close();
    } catch (error) {
      setDialogResult({
        kind: "error",
        message:
          error instanceof AdminApiRequestError
            ? (error.body?.message ?? messages.common.requestFailed)
            : messages.common.connectionError,
      });
    } finally {
      setDialogPending(false);
    }
  }

  async function handlePreview(asset: MediaAssetSummary) {
    const preview = await adminApiRequest<{ url: string }>(
      `/api/admin/media/${asset.id}/preview`,
      locale,
      { method: "GET" },
    );
    window.open(preview.url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(asset: MediaAssetSummary) {
    if (!window.confirm(messages.common.deleteConfirm)) return;
    try {
      await adminApiRequest(`/api/admin/media/${asset.id}`, locale, {
        method: "DELETE",
      });
      await reload();
    } catch (error) {
      window.alert(
        error instanceof AdminApiRequestError
          ? (error.body?.message ?? messages.media.deleteBlocked)
          : messages.common.connectionError,
      );
    }
  }

  return (
    <div className="admin-layout">
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>{messages.media.listHeading}</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_MIME_TYPES}
              hidden
              onChange={handleUpload}
            />
            <button
              type="button"
              className="button button-primary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? messages.media.uploading : messages.media.uploadAction}
            </button>
          </div>
        </div>

        {uploadError && (
          <p className="form-message error" role="alert">
            {uploadError}
          </p>
        )}

        <div className="admin-inline-fields">
          <label>
            <span>{messages.media.filterType}</span>
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
            >
              <option value="">{messages.media.filterAll}</option>
              <option value="IMAGE">{messages.media.typeImage}</option>
              <option value="AUDIO">{messages.media.typeAudio}</option>
              <option value="VIDEO">{messages.media.typeVideo}</option>
            </select>
          </label>
          <label>
            <span>{messages.media.filterStatus}</span>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="">{messages.media.filterAll}</option>
              <option value="PENDING">{messages.media.statusPending}</option>
              <option value="READY">{messages.media.statusReady}</option>
              <option value="QUARANTINED">
                {messages.media.statusQuarantined}
              </option>
            </select>
          </label>
          <label>
            <span>{messages.media.filterKeyword}</span>
            <input
              value={filterKeyword}
              onChange={(event) => setFilterKeyword(event.target.value)}
              onBlur={() => reload()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void reload();
                }
              }}
            />
          </label>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => reload()}
          >
            {messages.common.apply}
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{messages.media.fileName}</th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.media.type}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.media.sizeBytes}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.media.status}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.media.referencedBy}
                </th>
                <th scope="col" className="admin-cell-nowrap">
                  {messages.common.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.originalFileName}</td>
                  <td className="admin-cell-nowrap">
                    {
                      {
                        IMAGE: messages.media.typeImage,
                        AUDIO: messages.media.typeAudio,
                        VIDEO: messages.media.typeVideo,
                      }[asset.type]
                    }
                  </td>
                  <td className="admin-cell-nowrap">
                    {formatSize(asset.sizeBytes)}
                  </td>
                  <td className="admin-cell-nowrap">
                    <span className="status-pill">
                      {statusLabel(messages, asset.status)}
                    </span>
                  </td>
                  <td className="admin-cell-nowrap">
                    {asset.referencedByQuestionCount}
                  </td>
                  <td className="admin-cell-nowrap">
                    <div className="admin-row-actions">
                      {asset.status === "READY" && (
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handlePreview(asset)}
                        >
                          {messages.media.preview}
                        </button>
                      )}
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => openDialog(asset)}
                      >
                        {messages.media.editTranslations}
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => handleDelete(asset)}
                      >
                        {messages.common.delete}
                      </button>
                    </div>
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
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? messages.media.processing : messages.common.loadMore}
            </button>
          </div>
        )}
      </div>

      <AdminDialog dialogRef={dialogRef} titleId="media-dialog-title">
        <h2 id="media-dialog-title">{messages.media.editTranslations}</h2>
        {selectedAsset && (
          <form className="admin-form" onSubmit={submitTranslations}>
            <fieldset className="admin-fieldset">
              <legend>{messages.common.vietnameseTab}</legend>
              <label>
                <span>{messages.media.altText}</span>
                <input
                  value={form.viAltText}
                  maxLength={300}
                  onChange={(event) =>
                    setForm({ ...form, viAltText: event.target.value })
                  }
                />
              </label>
              <label>
                <span>{messages.media.caption}</span>
                <input
                  value={form.viCaption}
                  maxLength={500}
                  onChange={(event) =>
                    setForm({ ...form, viCaption: event.target.value })
                  }
                />
              </label>
              <label>
                <span>{messages.media.transcript}</span>
                <textarea
                  value={form.viTranscript}
                  maxLength={20000}
                  onChange={(event) =>
                    setForm({ ...form, viTranscript: event.target.value })
                  }
                />
              </label>
            </fieldset>

            <fieldset className="admin-fieldset">
              <legend>{messages.common.englishTab}</legend>
              <label>
                <span>{messages.media.altText}</span>
                <input
                  value={form.enAltText}
                  maxLength={300}
                  onChange={(event) =>
                    setForm({ ...form, enAltText: event.target.value })
                  }
                />
              </label>
              <label>
                <span>{messages.media.caption}</span>
                <input
                  value={form.enCaption}
                  maxLength={500}
                  onChange={(event) =>
                    setForm({ ...form, enCaption: event.target.value })
                  }
                />
              </label>
              <label>
                <span>{messages.media.transcript}</span>
                <textarea
                  value={form.enTranscript}
                  maxLength={20000}
                  onChange={(event) =>
                    setForm({ ...form, enTranscript: event.target.value })
                  }
                />
              </label>
            </fieldset>

            {dialogResult && (
              <p
                className={`form-message ${dialogResult.kind}`}
                role={dialogResult.kind === "error" ? "alert" : "status"}
              >
                {dialogResult.message}
              </p>
            )}

            <div className="admin-form-actions">
              <button
                type="submit"
                className="button button-primary"
                disabled={dialogPending}
              >
                {dialogPending ? messages.common.saving : messages.common.save}
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => dialogRef.current?.close()}
              >
                {messages.common.cancel}
              </button>
            </div>
          </form>
        )}
      </AdminDialog>
    </div>
  );
}
