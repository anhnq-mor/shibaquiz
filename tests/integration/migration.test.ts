import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const database = new PGlite();

beforeAll(async () => {
  await migrate(drizzle(database), { migrationsFolder: "drizzle" });
});

afterAll(async () => {
  await database.close();
});

describe("initial migration", () => {
  it("applies to an empty PostgreSQL-compatible database", async () => {
    const result = await database.query<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
       order by table_name`,
    );

    expect(result.rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        "users",
        "exams",
        "question_translations",
        "attempts",
        "attempt_questions",
        "media_assets",
        "audit_logs",
      ]),
    );
    expect(result.rows).toHaveLength(24);
  });

  it("enforces case-insensitive email uniqueness at the database boundary", async () => {
    const base = {
      displayName: "Learner",
      passwordHash: "not-a-real-password-hash",
    };

    await database.query(
      `insert into users (email, display_name, password_hash)
       values ($1, $2, $3)`,
      ["learner@example.com", base.displayName, base.passwordHash],
    );

    await expect(
      database.query(
        `insert into users (email, display_name, password_hash)
         values ($1, $2, $3)`,
        ["LEARNER@example.com", base.displayName, base.passwordHash],
      ),
    ).rejects.toThrow();
  });

  it("tracks verification exemptions separately from verified email evidence", async () => {
    const result = await database.query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'users'
         and column_name in ('email_verified_at', 'email_verification_exempted_at')
       order by column_name`,
    );

    expect(result.rows.map((row) => row.column_name)).toEqual([
      "email_verification_exempted_at",
      "email_verified_at",
    ]);
  });
});
