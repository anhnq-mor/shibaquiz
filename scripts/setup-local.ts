import { createDatabaseConnection } from "../src/server/db/client";
import { runDatabaseMigrations } from "../src/server/db/migrate";
import { PostgresFoundationSeedRepository } from "../src/server/repositories/postgres-foundation-seed-repository";
import { PostgresSampleContentSeedRepository } from "../src/server/repositories/postgres-sample-content-seed-repository";

const connection = createDatabaseConnection();

try {
  await runDatabaseMigrations(connection);
  const seeds = new PostgresFoundationSeedRepository(connection.db);
  await seeds.seedBilingualFoundation();
  const sampleContentSeeds = new PostgresSampleContentSeedRepository(
    connection.db,
  );
  await sampleContentSeeds.seedPublishedSampleContent();
  process.stdout.write("Local PGlite database is migrated and seeded.\n");
} finally {
  await connection.close();
}
