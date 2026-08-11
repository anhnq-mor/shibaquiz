import { eq, sql } from "drizzle-orm";

import type {
  AuditLogEntry,
  AuditLogQuery,
  AuditLogRepository,
} from "@/domain/admin/audit";
import type { Database } from "@/server/db/client";
import { auditLogs, users } from "@/server/db/schema";

export class DrizzleAuditLogRepository implements AuditLogRepository {
  constructor(private readonly database: Database) {}

  async list(
    query: AuditLogQuery,
  ): Promise<{ items: AuditLogEntry[]; nextCursor: string | null }> {
    const conditions = [];
    if (query.cursor) {
      const cursorRow = (
        await this.database
          .select({ createdAt: auditLogs.createdAt })
          .from(auditLogs)
          .where(eq(auditLogs.id, query.cursor))
          .limit(1)
      )[0];
      if (cursorRow) {
        conditions.push(
          sql`(${auditLogs.createdAt}, ${auditLogs.id}) < (${cursorRow.createdAt}, ${query.cursor})`,
        );
      }
    }

    const rows = await this.database
      .select({
        id: auditLogs.id,
        actorUserId: auditLogs.actorUserId,
        actorDisplayName: users.displayName,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(sql`${auditLogs.createdAt} desc, ${auditLogs.id} desc`)
      .limit(query.limit + 1);

    const page = rows.slice(0, query.limit);
    const nextCursor = rows.length > query.limit ? page.at(-1)!.id : null;
    return {
      items: page.map((row) => ({
        id: row.id,
        actorUserId: row.actorUserId,
        actorDisplayName: row.actorDisplayName,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor,
    };
  }
}
