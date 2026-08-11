import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  matchesDeclaredSignature,
  SIGNATURE_SNIFF_BYTE_LENGTH,
} from "@/domain/media/file-signature";
import {
  MediaError,
  type CreateUploadInput,
  type MediaAccessRepository,
  type MediaAssetSummary,
  type MediaLibraryQuery,
  type MediaLibraryRepository,
  type UpdateMediaTranslationsInput,
} from "@/domain/media/media";
import {
  validateMediaDeclaration,
  type MediaLimits,
} from "@/domain/media/media-policy";
import type { MediaStorage } from "@/domain/media/media-storage";
import type { Database } from "@/server/db/client";
import {
  attemptQuestions,
  attempts,
  auditLogs,
  mediaAssets,
  mediaTranslations,
  questionMedia,
} from "@/server/db/schema";

export class DrizzleMediaLibraryRepository implements MediaLibraryRepository {
  constructor(
    private readonly database: Database,
    private readonly storage: MediaStorage,
    private readonly limits: MediaLimits,
  ) {}

  private async toSummaries(
    rows: (typeof mediaAssets.$inferSelect)[],
  ): Promise<MediaAssetSummary[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [translationRows, referenceRows] = await Promise.all([
      this.database
        .select()
        .from(mediaTranslations)
        .where(inArray(mediaTranslations.mediaAssetId, ids)),
      this.database
        .select({ mediaAssetId: questionMedia.mediaAssetId, value: count() })
        .from(questionMedia)
        .where(inArray(questionMedia.mediaAssetId, ids))
        .groupBy(questionMedia.mediaAssetId),
    ]);
    const referenceCountByAssetId = new Map(
      referenceRows.map((row) => [row.mediaAssetId, Number(row.value)]),
    );
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      originalFileName: row.originalFileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      width: row.width,
      height: row.height,
      durationSeconds: row.durationSeconds ? Number(row.durationSeconds) : null,
      createdAt: row.createdAt.toISOString(),
      referencedByQuestionCount: referenceCountByAssetId.get(row.id) ?? 0,
      translations: translationRows
        .filter((translation) => translation.mediaAssetId === row.id)
        .map((translation) => ({
          locale: translation.locale,
          altText: translation.altText,
          caption: translation.caption,
          transcript: translation.transcript,
        })),
    }));
  }

  async createUpload(
    input: CreateUploadInput,
    actorUserId: string,
    now: Date,
  ): ReturnType<MediaLibraryRepository["createUpload"]> {
    const declared = validateMediaDeclaration(
      { mimeType: input.mimeType, sizeBytes: input.sizeBytes },
      this.limits,
    );
    if (!declared.valid) {
      const status = declared.code === "MEDIA_TOO_LARGE" ? 413 : 400;
      throw new MediaError(
        declared.code === "MEDIA_TOO_LARGE"
          ? "MEDIA_TOO_LARGE"
          : "UNSUPPORTED_MEDIA_TYPE",
        status,
        "Declared media does not satisfy the configured type/size policy",
      );
    }

    const signedUpload = await this.storage.createSignedUpload({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256Base64: input.checksumSha256Base64,
    });

    const [inserted] = await this.database
      .insert(mediaAssets)
      .values({
        type: declared.kind,
        status: "PENDING",
        objectKey: signedUpload.objectKey,
        originalFileName: input.originalFileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksum: input.checksumSha256Base64,
        createdBy: actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      mediaAssetId: inserted!.id,
      uploadUrl: signedUpload.url,
      requiredHeaders: { ...signedUpload.requiredHeaders },
      expiresAt: signedUpload.expiresAt.toISOString(),
    };
  }

  async completeUpload(
    mediaAssetId: string,
    actorUserId: string,
    now: Date,
  ): Promise<MediaAssetSummary> {
    const asset = (
      await this.database
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.id, mediaAssetId))
        .limit(1)
    )[0];
    if (!asset) throw new MediaError("NOT_FOUND", 404, "Media asset not found");

    if (asset.status !== "PENDING") {
      return (await this.toSummaries([asset]))[0]!;
    }

    const metadata = await this.storage.inspect(asset.objectKey);
    const declaredOk = validateMediaDeclaration(
      { mimeType: asset.mimeType, sizeBytes: metadata.sizeBytes },
      this.limits,
    ).valid;
    const headBytes = await this.storage.readHeadBytes(
      asset.objectKey,
      SIGNATURE_SNIFF_BYTE_LENGTH,
    );
    const signatureOk = matchesDeclaredSignature(headBytes, asset.mimeType);
    const nextStatus = declaredOk && signatureOk ? "READY" : "QUARANTINED";

    const [updated] = await this.database
      .update(mediaAssets)
      .set({
        status: nextStatus,
        objectVersion: metadata.version,
        sizeBytes: metadata.sizeBytes,
        readyAt: nextStatus === "READY" ? now : null,
        updatedAt: now,
      })
      .where(eq(mediaAssets.id, mediaAssetId))
      .returning();

    await this.database.insert(auditLogs).values({
      actorUserId,
      action:
        nextStatus === "READY"
          ? "MEDIA_ASSET_READY"
          : "MEDIA_ASSET_QUARANTINED",
      entityType: "MEDIA_ASSET",
      entityId: mediaAssetId,
      metadata: { type: asset.type, mimeType: asset.mimeType },
      createdAt: now,
    });

    return (await this.toSummaries([updated!]))[0]!;
  }

  async listLibrary(
    query: MediaLibraryQuery,
  ): ReturnType<MediaLibraryRepository["listLibrary"]> {
    const conditions = [isNull(mediaAssets.deletedAt)];
    if (query.status) conditions.push(eq(mediaAssets.status, query.status));
    if (query.type) conditions.push(eq(mediaAssets.type, query.type));
    if (query.query) {
      conditions.push(
        sql`${mediaAssets.originalFileName} ilike ${`%${query.query}%`}`,
      );
    }
    if (query.cursor) {
      const cursorRow = (
        await this.database
          .select({ createdAt: mediaAssets.createdAt })
          .from(mediaAssets)
          .where(eq(mediaAssets.id, query.cursor))
          .limit(1)
      )[0];
      if (cursorRow) {
        conditions.push(
          sql`(${mediaAssets.createdAt}, ${mediaAssets.id}) < (${cursorRow.createdAt}, ${query.cursor})`,
        );
      }
    }

    const rows = await this.database
      .select()
      .from(mediaAssets)
      .where(and(...conditions))
      .orderBy(desc(mediaAssets.createdAt), desc(mediaAssets.id))
      .limit(query.limit + 1);

    const page = rows.slice(0, query.limit);
    const nextCursor = rows.length > query.limit ? page.at(-1)!.id : null;
    return { items: await this.toSummaries(page), nextCursor };
  }

  async updateTranslations(
    mediaAssetId: string,
    input: UpdateMediaTranslationsInput,
    now: Date,
  ): Promise<MediaAssetSummary> {
    const asset = (
      await this.database
        .select()
        .from(mediaAssets)
        .where(
          and(eq(mediaAssets.id, mediaAssetId), isNull(mediaAssets.deletedAt)),
        )
        .limit(1)
    )[0];
    if (!asset) throw new MediaError("NOT_FOUND", 404, "Media asset not found");

    for (const translation of input.translations) {
      await this.database
        .insert(mediaTranslations)
        .values({
          mediaAssetId,
          locale: translation.locale,
          altText: translation.altText ?? null,
          caption: translation.caption ?? null,
          transcript: translation.transcript ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [mediaTranslations.mediaAssetId, mediaTranslations.locale],
          set: {
            altText: translation.altText ?? null,
            caption: translation.caption ?? null,
            transcript: translation.transcript ?? null,
            updatedAt: now,
          },
        });
    }

    return (await this.toSummaries([asset]))[0]!;
  }

  async deleteAsset(mediaAssetId: string, now: Date): Promise<void> {
    const asset = (
      await this.database
        .select({ id: mediaAssets.id, deletedAt: mediaAssets.deletedAt })
        .from(mediaAssets)
        .where(eq(mediaAssets.id, mediaAssetId))
        .limit(1)
    )[0];
    if (!asset) throw new MediaError("NOT_FOUND", 404, "Media asset not found");
    if (asset.deletedAt) return;

    const referenced = await this.database
      .select({ value: count() })
      .from(questionMedia)
      .where(eq(questionMedia.mediaAssetId, mediaAssetId));
    if (Number(referenced[0]?.value ?? 0) > 0) {
      throw new MediaError(
        "CONFLICT",
        409,
        "Detach this media from every question before deleting it",
      );
    }

    await this.database
      .update(mediaAssets)
      .set({ status: "DELETED", deletedAt: now, updatedAt: now })
      .where(eq(mediaAssets.id, mediaAssetId));
  }

  async getPreviewUrl(
    mediaAssetId: string,
  ): Promise<{ url: string; expiresAt: string }> {
    const asset = (
      await this.database
        .select({
          objectKey: mediaAssets.objectKey,
          objectVersion: mediaAssets.objectVersion,
          status: mediaAssets.status,
        })
        .from(mediaAssets)
        .where(eq(mediaAssets.id, mediaAssetId))
        .limit(1)
    )[0];
    if (!asset || asset.status !== "READY") {
      throw new MediaError("NOT_FOUND", 404, "Media asset is not ready");
    }
    const signed = await this.storage.createSignedRead(
      asset.objectKey,
      asset.objectVersion ?? undefined,
    );
    return { url: signed.url, expiresAt: signed.expiresAt.toISOString() };
  }
}

export class DrizzleMediaAccessRepository implements MediaAccessRepository {
  constructor(
    private readonly database: Database,
    private readonly storage: MediaStorage,
  ) {}

  async getAttemptMediaAccessUrl(
    attemptQuestionId: string,
    mediaAssetId: string,
    userId: string,
  ): Promise<{ url: string; expiresAt: string }> {
    const row = (
      await this.database
        .select({ questionSnapshot: attemptQuestions.questionSnapshot })
        .from(attemptQuestions)
        .innerJoin(attempts, eq(attempts.id, attemptQuestions.attemptId))
        .where(
          and(
            eq(attemptQuestions.id, attemptQuestionId),
            eq(attempts.userId, userId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new MediaError("NOT_FOUND", 404, "Attempt question not found");
    }
    const media = row.questionSnapshot.media.find(
      (item) => item.id === mediaAssetId,
    );
    if (!media) {
      throw new MediaError(
        "NOT_FOUND",
        404,
        "This media asset is not part of the question snapshot",
      );
    }
    const signed = await this.storage.createSignedRead(
      media.objectKey,
      media.objectVersion ?? undefined,
    );
    return { url: signed.url, expiresAt: signed.expiresAt.toISOString() };
  }
}
