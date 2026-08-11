import type { DiscoveryListQuery } from "@/domain/discovery/discovery";
import type { DiscoveryRepository } from "@/domain/discovery/discovery";
import type { Locale } from "@/domain/common/locale";

export class DiscoveryService {
  constructor(private readonly repository: DiscoveryRepository) {}

  listPublishedExams(query: DiscoveryListQuery, locale: Locale) {
    return this.repository.listPublishedExams({ ...query, locale });
  }

  getPublishedExamDetail(slug: string, locale: Locale) {
    return this.repository.getPublishedExamDetail({ slug, locale });
  }
}
