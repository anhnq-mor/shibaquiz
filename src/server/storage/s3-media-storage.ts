import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  CreateUploadRequest,
  MediaStorage,
  SignedUpload,
  StoredObjectMetadata,
} from "@/domain/media/media-storage";
import type { MediaStorageConfig } from "@/server/config/env";

const objectKeyPattern =
  /^media\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildMediaObjectKey(id: string): string {
  const key = `media/${id}`;
  assertManagedObjectKey(key);
  return key;
}

function assertManagedObjectKey(objectKey: string): void {
  if (!objectKeyPattern.test(objectKey)) {
    throw new Error("Object key is outside the managed media namespace");
  }
}

function optionalVersion(
  version: string | undefined,
): { VersionId: string } | Record<string, never> {
  return version ? { VersionId: version } : {};
}

export class S3MediaStorage implements MediaStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly ttlSeconds: number;
  private readonly now: () => Date;
  private readonly createId: () => string;

  constructor(
    config: MediaStorageConfig,
    dependencies: {
      now?: () => Date;
      createId?: () => string;
      client?: S3Client;
    } = {},
  ) {
    this.bucket = config.MEDIA_S3_BUCKET;
    this.ttlSeconds = config.MEDIA_SIGNED_URL_TTL_SECONDS;
    this.now = dependencies.now ?? (() => new Date());
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
    this.client =
      dependencies.client ??
      new S3Client({
        region: config.MEDIA_S3_REGION,
        ...(config.MEDIA_S3_ENDPOINT
          ? { endpoint: config.MEDIA_S3_ENDPOINT }
          : {}),
        forcePathStyle: config.MEDIA_S3_FORCE_PATH_STYLE,
        credentials: {
          accessKeyId: config.MEDIA_S3_ACCESS_KEY_ID,
          secretAccessKey: config.MEDIA_S3_SECRET_ACCESS_KEY,
        },
      });
  }

  async createSignedUpload(
    request: CreateUploadRequest,
  ): Promise<SignedUpload> {
    const objectKey = buildMediaObjectKey(this.createId());
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: request.mimeType,
      ContentLength: request.sizeBytes,
      ChecksumSHA256: request.checksumSha256Base64,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: this.ttlSeconds,
    });

    return {
      objectKey,
      url,
      expiresAt: new Date(this.now().getTime() + this.ttlSeconds * 1_000),
      requiredHeaders: {
        "content-type": request.mimeType,
        "x-amz-checksum-sha256": request.checksumSha256Base64,
      },
    };
  }

  async inspect(
    objectKey: string,
    version?: string,
  ): Promise<StoredObjectMetadata> {
    assertManagedObjectKey(objectKey);
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ...optionalVersion(version),
      }),
    );

    return {
      objectKey,
      version: response.VersionId ?? null,
      sizeBytes: response.ContentLength ?? 0,
      mimeType: response.ContentType ?? null,
      checksumSha256Base64: response.ChecksumSHA256 ?? null,
    };
  }

  async createSignedRead(
    objectKey: string,
    version?: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    assertManagedObjectKey(objectKey);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ...optionalVersion(version),
    });

    return {
      url: await getSignedUrl(this.client, command, {
        expiresIn: this.ttlSeconds,
      }),
      expiresAt: new Date(this.now().getTime() + this.ttlSeconds * 1_000),
    };
  }

  async deleteOrphan(objectKey: string, version?: string): Promise<void> {
    assertManagedObjectKey(objectKey);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ...optionalVersion(version),
      }),
    );
  }
}
