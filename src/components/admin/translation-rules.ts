import type { Locale } from "@/domain/common/locale";
import type { ContentStatus } from "@/domain/admin/content";

export function requiredLocalesForStatus(
  exam: { primaryLocale: Locale; enabledLocales: Locale[] },
  status: ContentStatus,
): Locale[] {
  return status === "PUBLISHED" ? exam.enabledLocales : [exam.primaryLocale];
}
