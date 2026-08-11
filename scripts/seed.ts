import { createDatabaseConnection } from "../src/server/db/client";
import { PostgresFoundationSeedRepository } from "../src/server/repositories/postgres-foundation-seed-repository";
import { PostgresSampleContentSeedRepository } from "../src/server/repositories/postgres-sample-content-seed-repository";

const connection = createDatabaseConnection();

try {
  const seeds = new PostgresFoundationSeedRepository(connection.db);
  await seeds.seedBilingualFoundation();
  const sampleContentSeeds = new PostgresSampleContentSeedRepository(
    connection.db,
  );
  await sampleContentSeeds.seedPublishedSampleContent();
  process.stdout.write("Bilingual foundation seed applied.\n");
} finally {
  await connection.close();
}
