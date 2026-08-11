import type {
  CreateUploadRequest,
  MediaStorage,
} from "@/domain/media/media-storage";
import { MediaError } from "@/domain/media/media";

function disabled(): never {
  throw new MediaError("FEATURE_DISABLED", 503, "Media storage is disabled");
}

export class DisabledMediaStorage implements MediaStorage {
  async createSignedUpload(request: CreateUploadRequest): Promise<never> {
    void request;
    return disabled();
  }

  async inspect(objectKey: string, version?: string): Promise<never> {
    void objectKey;
    void version;
    return disabled();
  }

  async readHeadBytes(
    objectKey: string,
    length: number,
    version?: string,
  ): Promise<never> {
    void objectKey;
    void length;
    void version;
    return disabled();
  }

  async createSignedRead(objectKey: string, version?: string): Promise<never> {
    void objectKey;
    void version;
    return disabled();
  }

  async deleteOrphan(objectKey: string, version?: string): Promise<never> {
    void objectKey;
    void version;
    return disabled();
  }
}
