import { PGlite } from "@electric-sql/pglite";
import {
  drizzle as drizzlePglite,
  type PgliteDatabase,
} from "drizzle-orm/pglite";
import {
  drizzle as drizzlePostgres,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import postgres from "postgres";

import { loadRuntimeConfig, type RuntimeConfig } from "@/server/config/env";

import * as schema from "./schema";

type Schema = typeof schema;
export type Database = PostgresJsDatabase<Schema> | PgliteDatabase<Schema>;

export type DatabaseConnection =
  | {
      driver: "postgres";
      db: PostgresJsDatabase<Schema>;
      close: () => Promise<void>;
    }
  | {
      driver: "pglite";
      db: PgliteDatabase<Schema>;
      close: () => Promise<void>;
    };

const databaseGlobal = globalThis as typeof globalThis & {
  shibaQuizDatabaseConnection?: DatabaseConnection;
};

export function createDatabaseConnection(
  config: RuntimeConfig = loadRuntimeConfig(),
): DatabaseConnection {
  if (config.STORAGE_DRIVER === "pglite") {
    const dataDirectory = resolve(config.PGLITE_DATA_DIR);
    mkdirSync(dirname(dataDirectory), { recursive: true });
    const client = new PGlite(dataDirectory);
    return {
      driver: "pglite",
      db: drizzlePglite(client, { schema }),
      close: () => client.close(),
    };
  }

  if (!config.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for PostgreSQL");
  }

  const client = postgres(config.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: config.DATABASE_SSL ? "require" : false,
    prepare: false,
  });

  return {
    driver: "postgres",
    db: drizzlePostgres(client, { schema }),
    close: () => client.end(),
  };
}

export function getDatabaseConnection(): DatabaseConnection {
  databaseGlobal.shibaQuizDatabaseConnection ??= createDatabaseConnection();
  return databaseGlobal.shibaQuizDatabaseConnection;
}
