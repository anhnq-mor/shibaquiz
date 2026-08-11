import { and, eq, isNull, sql } from "drizzle-orm";

import {
  AdminUserError,
  type AdminUserRepository,
  type AdminUserSummary,
  type UserListQuery,
  type UserRole,
} from "@/domain/admin/users";
import type { Database } from "@/server/db/client";
import { auditLogs, sessions, users } from "@/server/db/schema";

function toSummary(row: typeof users.$inferSelect): AdminUserSummary {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    status: row.status,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class DrizzleAdminUserRepository implements AdminUserRepository {
  constructor(private readonly database: Database) {}

  async listUsers(
    query: UserListQuery,
  ): Promise<{ items: AdminUserSummary[]; nextCursor: string | null }> {
    const conditions = [];
    if (query.role) conditions.push(eq(users.role, query.role));
    if (query.status) conditions.push(eq(users.status, query.status));
    if (query.query) {
      const pattern = `%${query.query}%`;
      conditions.push(
        sql`(${users.email} ilike ${pattern} or ${users.displayName} ilike ${pattern})`,
      );
    }
    if (query.cursor) {
      const cursorRow = (
        await this.database
          .select({ createdAt: users.createdAt })
          .from(users)
          .where(eq(users.id, query.cursor))
          .limit(1)
      )[0];
      if (cursorRow) {
        conditions.push(
          sql`(${users.createdAt}, ${users.id}) < (${cursorRow.createdAt}, ${query.cursor})`,
        );
      }
    }

    const rows = await this.database
      .select()
      .from(users)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${users.createdAt} desc, ${users.id} desc`)
      .limit(query.limit + 1);

    const page = rows.slice(0, query.limit);
    const nextCursor = rows.length > query.limit ? page.at(-1)!.id : null;
    return { items: page.map(toSummary), nextCursor };
  }

  async findById(userId: string): Promise<AdminUserSummary | null> {
    const row = (
      await this.database.select().from(users).where(eq(users.id, userId)).limit(1)
    )[0];
    return row ? toSummary(row) : null;
  }

  async setRole(
    userId: string,
    role: UserRole,
    actorUserId: string,
    now: Date,
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      const activeAdmins = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "ADMIN"), eq(users.status, "ACTIVE")))
        .for("update");
      const target = (
        await tx.select().from(users).where(eq(users.id, userId)).limit(1).for("update")
      )[0];
      if (!target) {
        throw new AdminUserError("NOT_FOUND", 404, "User not found");
      }
      const targetIsActiveAdmin =
        target.role === "ADMIN" && target.status === "ACTIVE";
      if (targetIsActiveAdmin && role === "USER" && activeAdmins.length <= 1) {
        throw new AdminUserError(
          "LAST_ADMIN_GUARD",
          409,
          "Cannot demote the last remaining admin",
        );
      }

      await tx
        .update(users)
        .set({ role, updatedAt: now })
        .where(eq(users.id, userId));
      await tx.insert(auditLogs).values({
        actorUserId,
        action: "ADMIN_USER_ROLE_CHANGED",
        entityType: "User",
        entityId: userId,
        metadata: { role },
        createdAt: now,
      });
    });
  }

  async setLocked(
    userId: string,
    locked: boolean,
    actorUserId: string,
    now: Date,
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      const activeAdmins = locked
        ? await tx
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.role, "ADMIN"), eq(users.status, "ACTIVE")))
            .for("update")
        : [];
      const target = (
        await tx.select().from(users).where(eq(users.id, userId)).limit(1).for("update")
      )[0];
      if (!target) {
        throw new AdminUserError("NOT_FOUND", 404, "User not found");
      }
      if (locked) {
        const targetIsActiveAdmin =
          target.role === "ADMIN" && target.status === "ACTIVE";
        if (targetIsActiveAdmin && activeAdmins.length <= 1) {
          throw new AdminUserError(
            "LAST_ADMIN_GUARD",
            409,
            "Cannot lock the last remaining admin",
          );
        }
      }

      await tx
        .update(users)
        .set({
          status: locked ? "LOCKED" : "ACTIVE",
          lockedAt: locked ? now : null,
          updatedAt: now,
        })
        .where(eq(users.id, userId));

      if (locked) {
        await tx
          .update(sessions)
          .set({ revokedAt: now, updatedAt: now })
          .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
      }

      await tx.insert(auditLogs).values({
        actorUserId,
        action: locked ? "ADMIN_USER_LOCKED" : "ADMIN_USER_UNLOCKED",
        entityType: "User",
        entityId: userId,
        metadata: {},
        createdAt: now,
      });
    });
  }

  async recordPasswordResetTriggered(
    userId: string,
    actorUserId: string,
    now: Date,
  ): Promise<void> {
    await this.database.insert(auditLogs).values({
      actorUserId,
      action: "ADMIN_USER_PASSWORD_RESET_TRIGGERED",
      entityType: "User",
      entityId: userId,
      metadata: {},
      createdAt: now,
    });
  }
}
