import { sql } from "drizzle-orm";

import { createDatabaseConnection } from "../src/server/db/client";

type Row = Record<string, unknown>;

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Row[] }).rows;
  }
  return [];
}

const connection = createDatabaseConnection();

try {
  const tableResult = await connection.db.execute(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `);
  const tableNames = rowsOf(tableResult).map((row) => String(row.table_name));
  const tableCounts: { table: string; rows: number }[] = [];

  for (const tableName of tableNames) {
    if (!/^[a-z_]+$/.test(tableName)) continue;
    const countResult = await connection.db.execute(
      sql.raw(`select count(*)::int as count from "${tableName}"`),
    );
    tableCounts.push({
      table: tableName,
      rows: Number(rowsOf(countResult)[0]?.count ?? 0),
    });
  }

  const users = rowsOf(
    await connection.db.execute(sql`
      select id, email, display_name, role, status, email_verified_at,
             last_login_at, preferred_locale, created_at
      from users
      order by created_at desc
    `),
  );
  const authTokens = rowsOf(
    await connection.db.execute(sql`
      select type,
             count(*)::int as total,
             count(*) filter (where used_at is null and expires_at > now())::int as active
      from auth_tokens
      group by type
      order by type
    `),
  );
  const sessions = rowsOf(
    await connection.db.execute(sql`
      select count(*)::int as total,
             count(*) filter (where revoked_at is null and expires_at > now())::int as active
      from sessions
    `),
  );
  const rateLimits = rowsOf(
    await connection.db.execute(sql`
      select action, count(*)::int as keys, max(attempt_count)::int as max_attempts
      from rate_limits
      group by action
      order by action
    `),
  );

  process.stdout.write("\nTABLE COUNTS (public schema)\n");
  console.table(tableCounts);
  process.stdout.write("\nUSERS (sensitive hashes omitted)\n");
  console.table(users);
  process.stdout.write("\nAUTH TOKEN SUMMARY (token hashes omitted)\n");
  console.table(authTokens);
  process.stdout.write("\nSESSION SUMMARY (session hashes omitted)\n");
  console.table(sessions);
  process.stdout.write("\nRATE LIMIT SUMMARY (key hashes omitted)\n");
  console.table(rateLimits);
} finally {
  await connection.close();
}
