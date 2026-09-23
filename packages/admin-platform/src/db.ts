import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * Generic over the consuming app's full Drizzle schema so its richer
 * `Database` type (which includes these tables plus its own) is assignable
 * here without narrowing. The repositories in this package only use table
 * objects from `./schema.ts` directly, never `db.query.*`, so the schema
 * type parameter is never actually inspected at runtime.
 */
export type AdminPlatformDatabase<
  TSchema extends Record<string, unknown> = Record<string, unknown>,
> = PostgresJsDatabase<TSchema> | PgliteDatabase<TSchema>;
