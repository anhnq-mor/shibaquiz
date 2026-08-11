import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isMediaError } from "@/domain/media/media";
import type {
  CreateUploadRequest,
  MediaStorage,
  SignedUpload,
  StoredObjectMetadata,
} from "@/domain/media/media-storage";
import * as schema from "@/server/db/schema";
import {
  DrizzleMediaAccessRepository,
  DrizzleMediaLibraryRepository,
} from "@/server/repositories/drizzle-media-repository";

const megabyte = 1024 * 1024;
const limits = { IMAGE: 5 * megabyte, AUDIO: 25 * megabyte, VIDEO: 100 * megabyte };

const JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

class FakeMediaStorage implements MediaStorage {
  private readonly objects = new Map<
    string,
    { bytes: Uint8Array; mimeType: string }
  >();
  private counter = 0;

  async createSignedUpload(request: CreateUploadRequest): Promise<SignedUpload> {
    this.counter += 1;
    const objectKey = `media/fake-${this.counter}`;
    this.objects.set(objectKey, {
      bytes: new Uint8Array(0),
      mimeType: request.mimeType,
    });
    return {
      objectKey,
      url: `fake-upload://${objectKey}`,
      expiresAt: new Date(Date.now() + 60_000),
      requiredHeaders: { "content-type": request.mimeType },
    };
  }

  uploadFile(uploadUrl: string, bytes: Uint8Array): void {
    const objectKey = uploadUrl.replace("fake-upload://", "");
    const existing = this.objects.get(objectKey);
    this.objects.set(objectKey, { bytes, mimeType: existing?.mimeType ?? "" });
  }

  async inspect(objectKey: string): Promise<StoredObjectMetadata> {
    const object = this.objects.get(objectKey);
    if (!object) throw new Error(`unknown object key: ${objectKey}`);
    return {
      objectKey,
      version: null,
      sizeBytes: object.bytes.length,
      mimeType: object.mimeType,
      checksumSha256Base64: null,
    };
  }

  async readHeadBytes(objectKey: string, length: number): Promise<Uint8Array> {
    return (this.objects.get(objectKey)?.bytes ?? new Uint8Array(0)).slice(
      0,
      length,
    );
  }

  async createSignedRead(
    objectKey: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    return {
      url: `fake-read://${objectKey}`,
      expiresAt: new Date(Date.now() + 60_000),
    };
  }

  async deleteOrphan(objectKey: string): Promise<void> {
    this.objects.delete(objectKey);
  }
}

const client = new PGlite();
const database = drizzle(client, { schema });
const storage = new FakeMediaStorage();
const libraryRepository = new DrizzleMediaLibraryRepository(
  database,
  storage,
  limits,
);
const accessRepository = new DrizzleMediaAccessRepository(database, storage);

const adminId = "50000000-0000-4000-8000-000000000001";
const otherUserId = "50000000-0000-4000-8000-000000000002";

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
  await database.insert(schema.users).values([
    {
      id: adminId,
      email: "media-admin@example.com",
      displayName: "Media Admin",
      passwordHash: "not-a-real-password-hash",
      role: "ADMIN",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
    {
      id: otherUserId,
      email: "media-other@example.com",
      displayName: "Other User",
      passwordHash: "not-a-real-password-hash",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
  ]);
});

afterAll(async () => {
  await client.close();
});

async function uploadAndComplete(bytes: Uint8Array, mimeType: string) {
  const created = await libraryRepository.createUpload(
    {
      originalFileName: "sample.bin",
      mimeType,
      sizeBytes: bytes.length,
      checksumSha256Base64: "irrelevant-for-this-fake",
    },
    adminId,
    new Date(),
  );
  storage.uploadFile(created.uploadUrl, bytes);
  const asset = await libraryRepository.completeUpload(
    created.mediaAssetId,
    adminId,
    new Date(),
  );
  return asset;
}

describe("media library lifecycle", () => {
  it("rejects a declared upload above the configured size limit", async () => {
    await expect(
      libraryRepository.createUpload(
        {
          originalFileName: "huge.png",
          mimeType: "image/png",
          sizeBytes: 10 * megabyte,
          checksumSha256Base64: "x",
        },
        adminId,
        new Date(),
      ),
    ).rejects.toSatisfy(
      (error) => isMediaError(error) && error.code === "MEDIA_TOO_LARGE",
    );
  });

  it("rejects a declared upload with an unsupported MIME type", async () => {
    await expect(
      libraryRepository.createUpload(
        {
          originalFileName: "vector.svg",
          mimeType: "image/svg+xml",
          sizeBytes: 100,
          checksumSha256Base64: "x",
        },
        adminId,
        new Date(),
      ),
    ).rejects.toSatisfy(
      (error) => isMediaError(error) && error.code === "UNSUPPORTED_MEDIA_TYPE",
    );
  });

  it("marks an upload READY when the uploaded bytes match the declared type", async () => {
    const asset = await uploadAndComplete(JPEG_HEADER, "image/jpeg");
    expect(asset.status).toBe("READY");
    expect(asset.referencedByQuestionCount).toBe(0);
  });

  it("quarantines an upload when the bytes don't match the declared MIME type", async () => {
    const asset = await uploadAndComplete(PNG_HEADER, "image/jpeg");
    expect(asset.status).toBe("QUARANTINED");
  });

  it("is idempotent when completing an already-finalized upload", async () => {
    const created = await libraryRepository.createUpload(
      {
        originalFileName: "sample.png",
        mimeType: "image/png",
        sizeBytes: PNG_HEADER.length,
        checksumSha256Base64: "x",
      },
      adminId,
      new Date(),
    );
    storage.uploadFile(created.uploadUrl, PNG_HEADER);
    const first = await libraryRepository.completeUpload(
      created.mediaAssetId,
      adminId,
      new Date(),
    );
    const second = await libraryRepository.completeUpload(
      created.mediaAssetId,
      adminId,
      new Date(),
    );
    expect(first.status).toBe("READY");
    expect(second.status).toBe("READY");
  });

  it("paginates the library and lets translations be set and updated", async () => {
    const asset = await uploadAndComplete(JPEG_HEADER, "image/jpeg");
    const updated = await libraryRepository.updateTranslations(
      asset.id,
      {
        translations: [
          { locale: "vi", altText: "Ảnh minh họa", caption: "Chú thích" },
        ],
      },
      new Date(),
    );
    expect(updated.translations).toEqual([
      {
        locale: "vi",
        altText: "Ảnh minh họa",
        caption: "Chú thích",
        transcript: null,
      },
    ]);

    const page = await libraryRepository.listLibrary({
      status: "READY",
      limit: 100,
    });
    expect(page.items.some((item) => item.id === asset.id)).toBe(true);
  });

  it("refuses to delete media that is still referenced by a question, but allows it once free", async () => {
    const asset = await uploadAndComplete(JPEG_HEADER, "image/jpeg");

    const [exam] = await database
      .insert(schema.exams)
      .values({ code: "MEDIA-DEL", slug: "media-del", status: "DRAFT" })
      .returning();
    const [topic] = await database
      .insert(schema.topics)
      .values({ examId: exam!.id, slug: "t1", displayOrder: 0 })
      .returning();
    const [question] = await database
      .insert(schema.questions)
      .values({
        examId: exam!.id,
        topicId: topic!.id,
        type: "SINGLE_CHOICE",
        status: "DRAFT",
        createdBy: adminId,
        updatedBy: adminId,
      })
      .returning();
    await database.insert(schema.questionMedia).values({
      questionId: question!.id,
      mediaAssetId: asset.id,
      displayOrder: 0,
    });

    await expect(
      libraryRepository.deleteAsset(asset.id, new Date()),
    ).rejects.toSatisfy((error) => isMediaError(error) && error.code === "CONFLICT");

    await database
      .delete(schema.questionMedia)
      .where(eq(schema.questionMedia.mediaAssetId, asset.id));

    await libraryRepository.deleteAsset(asset.id, new Date());
    const page = await libraryRepository.listLibrary({ limit: 100 });
    expect(page.items.some((item) => item.id === asset.id)).toBe(false);
  });
});

describe("attempt media access", () => {
  it("resolves a signed read URL from the attempt's frozen snapshot for the owning user", async () => {
    const [exam] = await database
      .insert(schema.exams)
      .values({ code: "MEDIA-ACC", slug: "media-acc", status: "DRAFT" })
      .returning();
    const [topic] = await database
      .insert(schema.topics)
      .values({ examId: exam!.id, slug: "t1", displayOrder: 0 })
      .returning();
    const [question] = await database
      .insert(schema.questions)
      .values({
        examId: exam!.id,
        topicId: topic!.id,
        type: "SINGLE_CHOICE",
        status: "DRAFT",
        createdBy: adminId,
        updatedBy: adminId,
      })
      .returning();
    const [attempt] = await database
      .insert(schema.attempts)
      .values({
        userId: otherUserId,
        examId: exam!.id,
        scope: "TOPIC",
        mode: "STUDY",
        locale: "vi",
        generationConfigSnapshot: {},
      })
      .returning();
    const [attemptQuestion] = await database
      .insert(schema.attemptQuestions)
      .values({
        attemptId: attempt!.id,
        sourceQuestionId: question!.id,
        topicId: topic!.id,
        displayOrder: 0,
        questionSnapshot: {
          schemaVersion: 1,
          locale: "vi",
          sourceQuestionVersion: 1,
          type: "SINGLE_CHOICE",
          content: "Câu hỏi?",
          explanation: "Giải thích.",
          options: [
            { id: "o1", label: "A", content: "Đáp án A", isCorrect: true },
          ],
          media: [
            {
              id: "m1",
              type: "IMAGE",
              objectKey: "media/frozen-key",
              objectVersion: null,
              mimeType: "image/jpeg",
              altText: null,
              caption: null,
              transcript: null,
            },
          ],
        },
      })
      .returning();

    const access = await accessRepository.getAttemptMediaAccessUrl(
      attemptQuestion!.id,
      "m1",
      otherUserId,
    );
    expect(access.url).toBe("fake-read://media/frozen-key");

    await expect(
      accessRepository.getAttemptMediaAccessUrl(
        attemptQuestion!.id,
        "m1",
        adminId,
      ),
    ).rejects.toSatisfy((error) => isMediaError(error) && error.code === "NOT_FOUND");

    await expect(
      accessRepository.getAttemptMediaAccessUrl(
        attemptQuestion!.id,
        "not-in-snapshot",
        otherUserId,
      ),
    ).rejects.toSatisfy((error) => isMediaError(error) && error.code === "NOT_FOUND");
  });
});
