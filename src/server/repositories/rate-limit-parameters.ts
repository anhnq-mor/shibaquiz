import { sql } from "drizzle-orm";

import { rateLimits } from "@/server/db/schema";

export function rateLimitTimestampParameters(now: Date, windowExpiresAt: Date) {
  return {
    now: sql.param(now, rateLimits.expiresAt),
    windowExpiresAt: sql.param(windowExpiresAt, rateLimits.expiresAt),
  };
}
