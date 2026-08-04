import { createDatabaseConnection } from "../src/server/db/client";
import { runDatabaseMigrations } from "../src/server/db/migrate";
import { PostgresFoundationSeedRepository } from "../src/server/repositories/postgres-foundation-seed-repository";

const connection = createDatabaseConnection();

try {
  await runDatabaseMigrations(connection);
  const seeds = new PostgresFoundationSeedRepository(connection.db);
  await seeds.seedBilingualFoundation();
  process.stdout.write("Local PGlite database is migrated and seeded.\n");
} finally {
  await connection.close();
}
