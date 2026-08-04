import { createDatabaseConnection } from "../src/server/db/client";
import { runDatabaseMigrations } from "../src/server/db/migrate";

const connection = createDatabaseConnection();

try {
  await runDatabaseMigrations(connection);
  process.stdout.write("Database migrations applied.\n");
} finally {
  await connection.close();
}
