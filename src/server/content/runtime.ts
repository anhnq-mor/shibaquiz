import "server-only";

import { getDatabaseConnection } from "@/server/db/client";
import { DrizzleAdminContentRepository } from "@/server/repositories/drizzle-admin-content-repository";
import { DrizzleContentTranslationRepository } from "@/server/repositories/drizzle-content-translation-repository";
import { AdminContentService } from "@/server/services/admin-content-service";
import { ContentTranslationService } from "@/server/services/content-translation-service";

const runtimeGlobal = globalThis as typeof globalThis & {
  shibaQuizAdminContentService?: AdminContentService;
  shibaQuizContentTranslationService?: ContentTranslationService;
};

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
