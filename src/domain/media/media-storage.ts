export interface CreateUploadRequest {
  mimeType: string;
  sizeBytes: number;
  checksumSha256Base64: string;
}

export interface SignedUpload {
  objectKey: string;
  url: string;
  expiresAt: Date;
  requiredHeaders: Readonly<Record<string, string>>;
}

export interface StoredObjectMetadata {
  objectKey: string;
  version: string | null;
  sizeBytes: number;
  mimeType: string | null;
  checksumSha256Base64: string | null;
}

export interface MediaStorage {
  createSignedUpload(request: CreateUploadRequest): Promise<SignedUpload>;
  inspect(objectKey: string, version?: string): Promise<StoredObjectMetadata>;
  readHeadBytes(
    objectKey: string,
    length: number,
    version?: string,
  ): Promise<Uint8Array>;
  createSignedRead(
    objectKey: string,
    version?: string,
  ): Promise<{ url: string; expiresAt: Date }>;
  deleteOrphan(objectKey: string, version?: string): Promise<void>;
}
