import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";

import type { DatabaseConnection } from "./client";

export async function runDatabaseMigrations(
  connection: DatabaseConnection,
): Promise<void> {
  if (connection.driver === "pglite") {
    await migratePglite(connection.db, { migrationsFolder: "drizzle" });
    return;
  }

  await migratePostgres(connection.db, { migrationsFolder: "drizzle" });
}
