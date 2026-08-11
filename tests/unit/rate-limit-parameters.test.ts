import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { rateLimitTimestampParameters } from "@/server/repositories/rate-limit-parameters";

describe("PostgreSQL rate-limit parameters", () => {
  it("maps Date values through the timestamp column encoder", () => {
    const now = new Date("2026-08-11T06:51:16.464Z");
    const expiresAt = new Date("2026-08-11T07:06:16.464Z");
    const parameters = rateLimitTimestampParameters(now, expiresAt);
    const query = new PgDialect().sqlToQuery(
      sql`${parameters.now}, ${parameters.windowExpiresAt}`,
    );

    expect(query.params).toEqual([now.toISOString(), expiresAt.toISOString()]);
    expect(query.params.some((parameter) => parameter instanceof Date)).toBe(
      false,
    );
  });
});
