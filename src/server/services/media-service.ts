import type {
  CreateUploadInput,
  MediaAccessRepository,
  MediaLibraryQuery,
  MediaLibraryRepository,
  UpdateMediaTranslationsInput,
} from "@/domain/media/media";

export class MediaLibraryService {
  constructor(private readonly repository: MediaLibraryRepository) {}

  createUpload(input: CreateUploadInput, actorUserId: string, now = new Date()) {
    return this.repository.createUpload(input, actorUserId, now);
  }

  completeUpload(mediaAssetId: string, actorUserId: string, now = new Date()) {
    return this.repository.completeUpload(mediaAssetId, actorUserId, now);
  }

  listLibrary(query: MediaLibraryQuery) {
    return this.repository.listLibrary(query);
  }

  updateTranslations(
    mediaAssetId: string,
    input: UpdateMediaTranslationsInput,
    now = new Date(),
  ) {
    return this.repository.updateTranslations(mediaAssetId, input, now);
  }

  deleteAsset(mediaAssetId: string, now = new Date()) {
    return this.repository.deleteAsset(mediaAssetId, now);
  }

  getPreviewUrl(mediaAssetId: string) {
    return this.repository.getPreviewUrl(mediaAssetId);
  }
}

export class MediaAccessService {
  constructor(private readonly repository: MediaAccessRepository) {}

  getAttemptMediaAccessUrl(
    attemptQuestionId: string,
    mediaAssetId: string,
    userId: string,
  ) {
    return this.repository.getAttemptMediaAccessUrl(
      attemptQuestionId,
      mediaAssetId,
      userId,
    );
  }
}
