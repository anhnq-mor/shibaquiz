import { sql } from "drizzle-orm";

import type { ChatbotRepository } from "@/domain/chatbot/chatbot";
import type { Database } from "@/server/db/client";
import { rateLimits } from "@/server/db/schema";
import { rateLimitTimestampParameters } from "@/server/repositories/rate-limit-parameters";

export class DrizzleChatbotRepository implements ChatbotRepository {
  constructor(private readonly database: Database) {}

  async consumeRateLimit(input: {
    keyHash: string;
    action: string;
    windowExpiresAt: Date;
    now: Date;
  }): Promise<number> {
    const timestampParameters = rateLimitTimestampParameters(
      input.now,
      input.windowExpiresAt,
    );
    const rows = await this.database
      .insert(rateLimits)
      .values({
        keyHash: input.keyHash,
        action: input.action,
        windowStartedAt: input.now,
        attemptCount: 1,
        expiresAt: input.windowExpiresAt,
      })
      .onConflictDoUpdate({
        target: rateLimits.keyHash,
        set: {
          action: input.action,
          windowStartedAt: sql`case when ${rateLimits.expiresAt} <= ${timestampParameters.now} then ${timestampParameters.now} else ${rateLimits.windowStartedAt} end`,
          attemptCount: sql`case when ${rateLimits.expiresAt} <= ${timestampParameters.now} then 1 else ${rateLimits.attemptCount} + 1 end`,
          expiresAt: sql`case when ${rateLimits.expiresAt} <= ${timestampParameters.now} then ${timestampParameters.windowExpiresAt} else ${rateLimits.expiresAt} end`,
          updatedAt: input.now,
        },
      })
      .returning();
    return rows[0]?.attemptCount ?? 1;
  }
}
