import { createDatabaseConnection } from "../src/server/db/client";
import { PostgresFoundationSeedRepository } from "../src/server/repositories/postgres-foundation-seed-repository";

const connection = createDatabaseConnection();

try {
  const seeds = new PostgresFoundationSeedRepository(connection.db);
  await seeds.seedBilingualFoundation();
  process.stdout.write("Bilingual foundation seed applied.\n");
} finally {
  await connection.close();
}
