import "server-only";

import type { MediaLimits } from "@/domain/media/media-policy";
import type { MediaStorage } from "@/domain/media/media-storage";
import {
  loadAuthConfig,
  loadMediaStorageConfig,
  type MediaStorageConfig,
} from "@/server/config/env";
import { getDatabaseConnection } from "@/server/db/client";
import { DrizzleAdminContentRepository } from "@/server/repositories/drizzle-admin-content-repository";
import { DrizzleAdminUserRepository } from "@/server/repositories/drizzle-admin-user-repository";
import { DrizzleAttemptRepository } from "@/server/repositories/drizzle-attempt-repository";
import { DrizzleAuditLogRepository } from "@/server/repositories/drizzle-audit-log-repository";
import { DrizzleCommentRepository } from "@/server/repositories/drizzle-comment-repository";
import { DrizzleContentTranslationRepository } from "@/server/repositories/drizzle-content-translation-repository";
import { DrizzleDiscoveryRepository } from "@/server/repositories/drizzle-discovery-repository";
import { DrizzleImportRepository } from "@/server/repositories/drizzle-import-repository";
import {
  DrizzleMediaAccessRepository,
  DrizzleMediaLibraryRepository,
} from "@/server/repositories/drizzle-media-repository";
import { S3MediaStorage } from "@/server/storage/s3-media-storage";
import { DisabledMediaStorage } from "@/server/storage/disabled-media-storage";
import { AdminContentService } from "@/server/services/admin-content-service";
import { AdminUserService } from "@/server/services/admin-user-service";
import { AttemptService } from "@/server/services/attempt-service";
import { AuditLogService } from "@/server/services/audit-log-service";
import { CommentService } from "@/server/services/comment-service";
import { ContentTranslationService } from "@/server/services/content-translation-service";
import { DiscoveryService } from "@/server/services/discovery-service";
import { ImportService } from "@/server/services/import-service";
import {
  MediaAccessService,
  MediaLibraryService,
} from "@/server/services/media-service";

const runtimeGlobal = globalThis as typeof globalThis & {
  shibaQuizAdminContentService?: AdminContentService;
  shibaQuizContentTranslationService?: ContentTranslationService;
  shibaQuizDiscoveryService?: DiscoveryService;
  shibaQuizAttemptService?: AttemptService;
  shibaQuizMediaLibraryService?: MediaLibraryService;
  shibaQuizMediaAccessService?: MediaAccessService;
  shibaQuizMediaStorage?: MediaStorage;
  shibaQuizImportService?: ImportService;
  shibaQuizCommentService?: CommentService;
  shibaQuizAdminUserService?: AdminUserService;
  shibaQuizAuditLogService?: AuditLogService;
};

function mediaLimitsFromConfig(config: MediaStorageConfig): MediaLimits {
  const megabyte = 1024 * 1024;
  return {
    IMAGE: config.MEDIA_MAX_IMAGE_MB * megabyte,
    AUDIO: config.MEDIA_MAX_AUDIO_MB * megabyte,
    VIDEO: config.MEDIA_MAX_VIDEO_MB * megabyte,
  };
}

function getMediaStorage(): MediaStorage {
  const config = loadMediaStorageConfig();
  runtimeGlobal.shibaQuizMediaStorage ??=
    config.MEDIA_STORAGE_DRIVER === "disabled"
      ? new DisabledMediaStorage()
      : new S3MediaStorage(config);
  return runtimeGlobal.shibaQuizMediaStorage;
}

export function getAdminContentService(): AdminContentService {
  runtimeGlobal.shibaQuizAdminContentService ??= new AdminContentService(
    new DrizzleAdminContentRepository(getDatabaseConnection().db),
  );
  return runtimeGlobal.shibaQuizAdminContentService;
}

export function getContentTranslationService(): ContentTranslationService {
  runtimeGlobal.shibaQuizContentTranslationService ??=
    new ContentTranslationService(
      new DrizzleContentTranslationRepository(getDatabaseConnection().db),
    );
  return runtimeGlobal.shibaQuizContentTranslationService;
}

export function getDiscoveryService(): DiscoveryService {
  runtimeGlobal.shibaQuizDiscoveryService ??= new DiscoveryService(
    new DrizzleDiscoveryRepository(getDatabaseConnection().db),
  );
  return runtimeGlobal.shibaQuizDiscoveryService;
}

export function getAttemptService(): AttemptService {
  runtimeGlobal.shibaQuizAttemptService ??= new AttemptService(
    new DrizzleAttemptRepository(getDatabaseConnection().db),
  );
  return runtimeGlobal.shibaQuizAttemptService;
}

export function getMediaLibraryService(): MediaLibraryService {
  runtimeGlobal.shibaQuizMediaLibraryService ??= new MediaLibraryService(
    new DrizzleMediaLibraryRepository(
      getDatabaseConnection().db,
      getMediaStorage(),
      mediaLimitsFromConfig(loadMediaStorageConfig()),
    ),
  );
  return runtimeGlobal.shibaQuizMediaLibraryService;
}

export function getImportService(): ImportService {
  runtimeGlobal.shibaQuizImportService ??= new ImportService(
    new DrizzleImportRepository(getDatabaseConnection().db),
  );
  return runtimeGlobal.shibaQuizImportService;
}

export function getAdminUserService(): AdminUserService {
  runtimeGlobal.shibaQuizAdminUserService ??= new AdminUserService(
    new DrizzleAdminUserRepository(getDatabaseConnection().db),
  );
  return runtimeGlobal.shibaQuizAdminUserService;
}

export function getAuditLogService(): AuditLogService {
  runtimeGlobal.shibaQuizAuditLogService ??= new AuditLogService(
    new DrizzleAuditLogRepository(getDatabaseConnection().db),
  );
  return runtimeGlobal.shibaQuizAuditLogService;
}

export function getCommentService(): CommentService {
  runtimeGlobal.shibaQuizCommentService ??= new CommentService(
    new DrizzleCommentRepository(getDatabaseConnection().db),
    loadAuthConfig().AUTH_SECRET,
  );
  return runtimeGlobal.shibaQuizCommentService;
}

export function getMediaAccessService(): MediaAccessService {
  runtimeGlobal.shibaQuizMediaAccessService ??= new MediaAccessService(
    new DrizzleMediaAccessRepository(
      getDatabaseConnection().db,
      getMediaStorage(),
    ),
  );
  return runtimeGlobal.shibaQuizMediaAccessService;
}
