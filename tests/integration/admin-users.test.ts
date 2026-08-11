import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isAdminUserError } from "@/domain/admin/users";
import * as schema from "@/server/db/schema";
import { DrizzleAdminUserRepository } from "@/server/repositories/drizzle-admin-user-repository";
import { DrizzleAuditLogRepository } from "@/server/repositories/drizzle-audit-log-repository";

const client = new PGlite();
const database = drizzle(client, { schema });
const repository = new DrizzleAdminUserRepository(database);
const auditRepository = new DrizzleAuditLogRepository(database);

const adminAId = "a0000000-0000-4000-8000-000000000001";
const adminBId = "a0000000-0000-4000-8000-000000000002";
const regularUserId = "a0000000-0000-4000-8000-000000000003";
const searchableUserId = "a0000000-0000-4000-8000-000000000004";

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
  await database.insert(schema.users).values([
    {
      id: adminAId,
      email: "admin-a@example.com",
      displayName: "Admin A",
      passwordHash: "not-a-real-password-hash",
      role: "ADMIN",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
    {
      id: adminBId,
      email: "admin-b@example.com",
      displayName: "Admin B",
      passwordHash: "not-a-real-password-hash",
      role: "ADMIN",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
    {
      id: regularUserId,
      email: "regular-user@example.com",
      displayName: "Regular User",
      passwordHash: "not-a-real-password-hash",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
    {
      id: searchableUserId,
      email: "findme@example.com",
      displayName: "Findable Person",
      passwordHash: "not-a-real-password-hash",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
  ]);
});

afterAll(async () => {
  await client.close();
});

describe("listUsers", () => {
  it("filters by role and status", async () => {
    const admins = await repository.listUsers({ role: "ADMIN", limit: 50 });
    expect(admins.items.every((item) => item.role === "ADMIN")).toBe(true);
    expect(admins.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([adminAId, adminBId]),
    );
  });

  it("searches by email or display name substring", async () => {
    const result = await repository.listUsers({ query: "findme", limit: 50 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(searchableUserId);

    const byName = await repository.listUsers({
      query: "Findable",
      limit: 50,
    });
    expect(byName.items[0]?.id).toBe(searchableUserId);
  });

  it("finds a user by id", async () => {
    const found = await repository.findById(regularUserId);
    expect(found?.email).toBe("regular-user@example.com");
    expect(await repository.findById("b0000000-0000-4000-8000-000000000000")).toBeNull();
  });
});

describe("role management", () => {
  it("promotes a regular user to admin", async () => {
    await repository.setRole(regularUserId, "ADMIN", adminAId, new Date());
    const updated = await repository.findById(regularUserId);
    expect(updated?.role).toBe("ADMIN");
    // Restore for later tests that assume exactly two admins (A and B).
    await repository.setRole(regularUserId, "USER", adminAId, new Date());
  });

  it("records an audit log entry for a role change", async () => {
    await repository.setRole(regularUserId, "ADMIN", adminAId, new Date());
    const log = await auditRepository.list({ limit: 5 });
    expect(
      log.items.some(
        (entry) =>
          entry.action === "ADMIN_USER_ROLE_CHANGED" &&
          entry.entityId === regularUserId,
      ),
    ).toBe(true);
    await repository.setRole(regularUserId, "USER", adminAId, new Date());
  });

  it("refuses to demote the last remaining active admin", async () => {
    // Lock adminB first so adminA becomes the sole active admin.
    await repository.setLocked(adminBId, true, adminAId, new Date());
    await expect(
      repository.setRole(adminAId, "USER", adminAId, new Date()),
    ).rejects.toSatisfy(
      (error) => isAdminUserError(error) && error.code === "LAST_ADMIN_GUARD",
    );
    // Restore adminB to active for subsequent tests.
    await repository.setLocked(adminBId, false, adminAId, new Date());
  });

  it("throws NOT_FOUND for a missing user", async () => {
    await expect(
      repository.setRole(
        "b0000000-0000-4000-8000-000000000000",
        "ADMIN",
        adminAId,
        new Date(),
      ),
    ).rejects.toSatisfy(
      (error) => isAdminUserError(error) && error.code === "NOT_FOUND",
    );
  });
});

describe("lock management", () => {
  it("locks a regular user and revokes their active sessions", async () => {
    await database.insert(schema.sessions).values({
      userId: regularUserId,
      sessionTokenHash: "session-hash-1",
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    await repository.setLocked(regularUserId, true, adminAId, new Date());

    const updated = await repository.findById(regularUserId);
    expect(updated?.status).toBe("LOCKED");
    const session = (
      await database
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, regularUserId))
        .limit(1)
    )[0]!;
    expect(session.revokedAt).not.toBeNull();

    await repository.setLocked(regularUserId, false, adminAId, new Date());
  });

  it("refuses to lock the last remaining active admin", async () => {
    await repository.setLocked(adminBId, true, adminAId, new Date());
    await expect(
      repository.setLocked(adminAId, true, adminBId, new Date()),
    ).rejects.toSatisfy(
      (error) => isAdminUserError(error) && error.code === "LAST_ADMIN_GUARD",
    );
    await repository.setLocked(adminBId, false, adminAId, new Date());
  });

  it("never leaves zero active admins when two lock requests race", async () => {
    const results = await Promise.allSettled([
      repository.setLocked(adminAId, true, adminBId, new Date()),
      repository.setLocked(adminBId, true, adminAId, new Date()),
    ]);
    const rejected = results.filter((result) => result.status === "rejected");
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    expect(rejected.length).toBeGreaterThanOrEqual(1);

    const remainingActiveAdmins = await repository.listUsers({
      role: "ADMIN",
      status: "ACTIVE",
      limit: 50,
    });
    expect(remainingActiveAdmins.items.length).toBeGreaterThanOrEqual(1);

    // Restore both admins to active for repository-level isolation.
    await repository.setLocked(adminAId, false, adminBId, new Date());
    await repository.setLocked(adminBId, false, adminAId, new Date());
  });
});

describe("password reset trigger audit", () => {
  it("records an audit entry when an admin triggers a reset email", async () => {
    await repository.recordPasswordResetTriggered(
      regularUserId,
      adminAId,
      new Date(),
    );
    const log = await auditRepository.list({ limit: 5 });
    expect(
      log.items.some(
        (entry) =>
          entry.action === "ADMIN_USER_PASSWORD_RESET_TRIGGERED" &&
          entry.entityId === regularUserId &&
          entry.actorDisplayName === "Admin A",
      ),
    ).toBe(true);
  });
});
