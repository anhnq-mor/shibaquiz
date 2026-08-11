import { z } from "zod";

import { locales, type Locale } from "@/domain/common/locale";
import type { MediaKind } from "@/domain/media/media-policy";

export const mediaStatuses = [
  "PENDING",
  "READY",
  "QUARANTINED",
  "DELETED",
] as const;
export type MediaStatus = (typeof mediaStatuses)[number];

const idSchema = z.string().uuid();
const localeSchema = z.enum(locales);

export const createUploadSchema = z.object({
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  checksumSha256Base64: z.string().trim().min(1).max(100),
});
export type CreateUploadInput = z.infer<typeof createUploadSchema>;

const mediaTranslationInputSchema = z.object({
  locale: localeSchema,
  altText: z.string().trim().max(300).optional(),
  caption: z.string().trim().max(500).optional(),
  transcript: z.string().trim().max(20_000).optional(),
});

export const updateMediaTranslationsSchema = z.object({
  translations: z
    .array(mediaTranslationInputSchema)
    .min(1)
    .max(2)
    .refine(
      (values) => new Set(values.map((value) => value.locale)).size === values.length,
      "Translation locales must be unique",
    ),
});
export type UpdateMediaTranslationsInput = z.infer<
  typeof updateMediaTranslationsSchema
>;

export const mediaIdParamSchema = z.object({ id: idSchema });

export const mediaLibraryQuerySchema = z.object({
  status: z.enum(mediaStatuses).optional(),
  type: z.enum(["IMAGE", "AUDIO", "VIDEO"]).optional(),
  query: z.string().trim().max(200).optional(),
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type MediaLibraryQuery = z.infer<typeof mediaLibraryQuerySchema>;

export interface MediaAssetTranslation {
  locale: Locale;
  altText: string | null;
  caption: string | null;
  transcript: string | null;
}

export interface MediaAssetSummary {
  id: string;
  type: MediaKind;
  status: MediaStatus;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  createdAt: string;
  referencedByQuestionCount: number;
  translations: MediaAssetTranslation[];
}

export class MediaError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "INVALID_STRUCTURE"
      | "UNSUPPORTED_MEDIA_TYPE"
      | "MEDIA_TOO_LARGE"
      | "CONFLICT",
    public readonly status: number,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

export function isMediaError(error: unknown): error is MediaError {
  return (
    error instanceof Error &&
    error.name === "MediaError" &&
    typeof (error as MediaError).code === "string" &&
    typeof (error as MediaError).status === "number"
  );
}

export interface MediaLibraryRepository {
  createUpload(
    input: CreateUploadInput,
    actorUserId: string,
    now: Date,
  ): Promise<{
    mediaAssetId: string;
    uploadUrl: string;
    requiredHeaders: Record<string, string>;
    expiresAt: string;
  }>;
  completeUpload(
    mediaAssetId: string,
    actorUserId: string,
    now: Date,
  ): Promise<MediaAssetSummary>;
  listLibrary(
    query: MediaLibraryQuery,
  ): Promise<{ items: MediaAssetSummary[]; nextCursor: string | null }>;
  updateTranslations(
    mediaAssetId: string,
    input: UpdateMediaTranslationsInput,
    now: Date,
  ): Promise<MediaAssetSummary>;
  deleteAsset(mediaAssetId: string, now: Date): Promise<void>;
  getPreviewUrl(
    mediaAssetId: string,
  ): Promise<{ url: string; expiresAt: string }>;
}

export interface MediaAccessRepository {
  getAttemptMediaAccessUrl(
    attemptQuestionId: string,
    mediaAssetId: string,
    userId: string,
  ): Promise<{ url: string; expiresAt: string }>;
}
