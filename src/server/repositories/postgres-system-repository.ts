import { sql } from "drizzle-orm";

import type { SystemRepository } from "@/domain/repositories";
import type { Database } from "@/server/db/client";

export class PostgresSystemRepository implements SystemRepository {
  constructor(private readonly database: Database) {}

  async ping(): Promise<boolean> {
    await this.database.execute(sql`select 1`);
    return true;
  }
}
