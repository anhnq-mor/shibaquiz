import { z } from "zod";

import type { Locale } from "@/domain/common/locale";
import type { TestType } from "@/domain/admin/content";

export const discoveryListQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type DiscoveryListQuery = z.infer<typeof discoveryListQuerySchema>;

export interface PublishedExamListItem {
  id: string;
  code: string;
  slug: string;
  name: string;
  description: string;
  topicCount: number;
  publishedQuestionCount: number;
}

export interface PublishedTopicSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  publishedQuestionCount: number;
}

export interface PublishedTestSummary {
  id: string;
  type: TestType;
  name: string;
  description: string;
  questionCount: number;
  durationMinutes: number | null;
  passingScorePercent: number;
}

export interface PublishedExamDetail extends PublishedExamListItem {
  locale: Locale;
  localeFallback: boolean;
  topics: PublishedTopicSummary[];
  tests: PublishedTestSummary[];
}

export interface DiscoveryRepository {
  listPublishedExams(input: {
    locale: Locale;
    query?: string | undefined;
    cursor?: string | undefined;
    limit: number;
  }): Promise<{ items: PublishedExamListItem[]; nextCursor: string | null }>;
  getPublishedExamDetail(input: {
    slug: string;
    locale: Locale;
  }): Promise<PublishedExamDetail | null>;
}
