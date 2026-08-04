import type { FoundationSeedRepository } from "@/domain/repositories";
import type { Database } from "@/server/db/client";
import {
  exams,
  examTranslations,
  topics,
  topicTranslations,
} from "@/server/db/schema";

const foundationIds = {
  exam: "10000000-0000-4000-8000-000000000001",
  topic: "10000000-0000-4000-8000-000000000002",
} as const;

export class PostgresFoundationSeedRepository implements FoundationSeedRepository {
  constructor(private readonly database: Database) {}

  async seedBilingualFoundation(): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .insert(exams)
        .values({
          id: foundationIds.exam,
          code: "SHIBA-DEMO",
          slug: "shiba-demo",
          primaryLocale: "vi",
          enabledLocales: ["vi", "en"],
          status: "DRAFT",
        })
        .onConflictDoNothing();

      await transaction
        .insert(examTranslations)
        .values([
          {
            examId: foundationIds.exam,
            locale: "vi",
            name: "Kỳ thi mẫu ShibaQuiz",
            description:
              "Dữ liệu nền song ngữ ở trạng thái nháp cho môi trường phát triển.",
          },
          {
            examId: foundationIds.exam,
            locale: "en",
            name: "ShibaQuiz sample exam",
            description:
              "Bilingual draft foundation data for development environments.",
          },
        ])
        .onConflictDoNothing();

      await transaction
        .insert(topics)
        .values({
          id: foundationIds.topic,
          examId: foundationIds.exam,
          slug: "getting-started",
          displayOrder: 0,
          status: "DRAFT",
        })
        .onConflictDoNothing();

      await transaction
        .insert(topicTranslations)
        .values([
          {
            topicId: foundationIds.topic,
            locale: "vi",
            name: "Bắt đầu",
            description: "Chủ đề mẫu chưa được publish.",
          },
          {
            topicId: foundationIds.topic,
            locale: "en",
            name: "Getting started",
            description: "Sample topic that is not published.",
          },
        ])
        .onConflictDoNothing();
    });
  }
}
