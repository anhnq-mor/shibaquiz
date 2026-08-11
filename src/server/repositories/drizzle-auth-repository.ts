import { and, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";

import type {
  AuthRepository,
  AuthenticatedUserDto,
  CredentialUser,
} from "@/domain/auth/auth";
import type { Database } from "@/server/db/client";
import {
  auditLogs,
  authTokens,
  rateLimits,
  sessions,
  users,
} from "@/server/db/schema";
import { rateLimitTimestampParameters } from "@/server/repositories/rate-limit-parameters";

function toCredentialUser(row: typeof users.$inferSelect): CredentialUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    passwordHash: row.passwordHash,
    role: row.role,
    status: row.status,
    emailVerifiedAt: row.emailVerifiedAt,
    emailVerificationExemptedAt: row.emailVerificationExemptedAt,
    preferredLocale: row.preferredLocale,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly database: Database) {}

  async createUser(
    input: Parameters<AuthRepository["createUser"]>[0],
  ): ReturnType<AuthRepository["createUser"]> {
    try {
      return await this.database.transaction(async (transaction) => {
        const existing = await transaction
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.email}) = ${input.email}`)
          .limit(1);
        if (existing.length > 0) return { created: false as const };

        const created = await transaction
          .insert(users)
          .values({
            email: input.email,
            displayName: input.displayName,
            passwordHash: input.passwordHash,
            preferredLocale: input.preferredLocale,
            emailVerificationExemptedAt: input.emailVerificationExemptedAt,
          })
          .returning();
        const user = created[0];
        if (!user) throw new Error("User insert did not return an id");

        if (input.verificationToken) {
          await transaction.insert(authTokens).values({
            userId: user.id,
            type: "EMAIL_VERIFY",
            tokenHash: input.verificationToken.tokenHash,
            expiresAt: input.verificationToken.expiresAt,
          });
        }
        await transaction.insert(auditLogs).values({
          actorUserId: user.id,
          action: "AUTH_REGISTERED",
          entityType: "User",
          entityId: user.id,
          metadata: {
            emailVerificationExempted:
              input.emailVerificationExemptedAt !== null,
          },
          createdAt: input.now,
        });

        return { created: true as const, userId: user.id };
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { created: false };
      throw error;
    }
  }

  async findCredentialsByEmail(email: string): Promise<CredentialUser | null> {
    const rows = await this.database
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    return rows[0] ? toCredentialUser(rows[0]) : null;
  }

  async findCredentialsById(userId: string): Promise<CredentialUser | null> {
    const rows = await this.database
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return rows[0] ? toCredentialUser(rows[0]) : null;
  }

  async replaceUnusedToken(
    input: Parameters<AuthRepository["replaceUnusedToken"]>[0],
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(authTokens)
        .set({ usedAt: input.now, updatedAt: input.now })
        .where(
          and(
            eq(authTokens.userId, input.userId),
            eq(authTokens.type, input.type),
            isNull(authTokens.usedAt),
          ),
        );
      await transaction.insert(authTokens).values({
        userId: input.userId,
        type: input.type,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      });
    });
  }

  async consumeEmailVerificationToken(
    tokenHash: string,
    now: Date,
  ): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const consumed = await transaction
        .update(authTokens)
        .set({ usedAt: now, updatedAt: now })
        .where(
          and(
            eq(authTokens.tokenHash, tokenHash),
            eq(authTokens.type, "EMAIL_VERIFY"),
            isNull(authTokens.usedAt),
            gt(authTokens.expiresAt, now),
          ),
        )
        .returning();
      const token = consumed[0];
      if (!token) return false;

      await transaction
        .update(users)
        .set({ emailVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, token.userId));
      await transaction.insert(auditLogs).values({
        actorUserId: token.userId,
        action: "AUTH_EMAIL_VERIFIED",
        entityType: "User",
        entityId: token.userId,
        metadata: {},
        createdAt: now,
      });
      return true;
    });
  }

  async consumePasswordResetToken(
    input: Parameters<AuthRepository["consumePasswordResetToken"]>[0],
  ): Promise<boolean> {
    return this.database.transaction(async (transaction) => {
      const consumed = await transaction
        .update(authTokens)
        .set({ usedAt: input.now, updatedAt: input.now })
        .where(
          and(
            eq(authTokens.tokenHash, input.tokenHash),
            eq(authTokens.type, "PASSWORD_RESET"),
            isNull(authTokens.usedAt),
            gt(authTokens.expiresAt, input.now),
          ),
        )
        .returning();
      const token = consumed[0];
      if (!token) return false;

      await transaction
        .update(users)
        .set({ passwordHash: input.passwordHash, updatedAt: input.now })
        .where(eq(users.id, token.userId));
      await transaction
        .update(sessions)
        .set({ revokedAt: input.now, updatedAt: input.now })
        .where(
          and(eq(sessions.userId, token.userId), isNull(sessions.revokedAt)),
        );
      await transaction.insert(auditLogs).values({
        actorUserId: token.userId,
        action: "AUTH_PASSWORD_RESET",
        entityType: "User",
        entityId: token.userId,
        metadata: {},
        createdAt: input.now,
      });
      return true;
    });
  }

  async createSession(
    input: Parameters<AuthRepository["createSession"]>[0],
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction.insert(sessions).values({
        userId: input.userId,
        sessionTokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        lastSeenAt: input.now,
      });
      await transaction
        .update(users)
        .set({ lastLoginAt: input.now, updatedAt: input.now })
        .where(eq(users.id, input.userId));
      await transaction.insert(auditLogs).values({
        actorUserId: input.userId,
        action: "AUTH_LOGIN_SUCCEEDED",
        entityType: "User",
        entityId: input.userId,
        metadata: {},
        createdAt: input.now,
      });
    });
  }

  async findActiveSession(
    input: Parameters<AuthRepository["findActiveSession"]>[0],
  ): Promise<AuthenticatedUserDto | null> {
    const rows = await this.database
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        preferredLocale: users.preferredLocale,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.sessionTokenHash, input.tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, input.now),
          eq(users.status, "ACTIVE"),
          input.requireEmailVerification
            ? or(
                isNotNull(users.emailVerifiedAt),
                isNotNull(users.emailVerificationExemptedAt),
              )
            : undefined,
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.database
      .update(sessions)
      .set({ revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(sessions.sessionTokenHash, tokenHash),
          isNull(sessions.revokedAt),
        ),
      );
  }

  async updatePasswordAndRevokeOtherSessions(
    input: Parameters<
      AuthRepository["updatePasswordAndRevokeOtherSessions"]
    >[0],
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(users)
        .set({ passwordHash: input.passwordHash, updatedAt: input.now })
        .where(eq(users.id, input.userId));
      await transaction
        .update(sessions)
        .set({ revokedAt: input.now, updatedAt: input.now })
        .where(
          and(
            eq(sessions.userId, input.userId),
            isNull(sessions.revokedAt),
            sql`${sessions.sessionTokenHash} <> ${input.currentSessionTokenHash}`,
          ),
        );
      await transaction.insert(auditLogs).values({
        actorUserId: input.userId,
        action: "AUTH_PASSWORD_CHANGED",
        entityType: "User",
        entityId: input.userId,
        metadata: {},
        createdAt: input.now,
      });
    });
  }

  async updatePreferredLocale(
    input: Parameters<AuthRepository["updatePreferredLocale"]>[0],
  ): Promise<void> {
    await this.database
      .update(users)
      .set({ preferredLocale: input.locale, updatedAt: input.now })
      .where(and(eq(users.id, input.userId), eq(users.status, "ACTIVE")));
  }

  async consumeRateLimit(
    input: Parameters<AuthRepository["consumeRateLimit"]>[0],
  ): Promise<number> {
    const timestampParameters = rateLimitTimestampParameters(
      input.now,
      input.windowExpiresAt,
    );
    const rows = await this.database
      .insert(rateLimits)
      .values({
        keyHash: input.keyHash,
        action: input.action,
        windowStartedAt: input.now,
        attemptCount: 1,
        expiresAt: input.windowExpiresAt,
      })
      .onConflictDoUpdate({
        target: rateLimits.keyHash,
        set: {
          action: input.action,
          windowStartedAt: sql`case when ${rateLimits.expiresAt} <= ${timestampParameters.now} then ${timestampParameters.now} else ${rateLimits.windowStartedAt} end`,
          attemptCount: sql`case when ${rateLimits.expiresAt} <= ${timestampParameters.now} then 1 else ${rateLimits.attemptCount} + 1 end`,
          expiresAt: sql`case when ${rateLimits.expiresAt} <= ${timestampParameters.now} then ${timestampParameters.windowExpiresAt} else ${rateLimits.expiresAt} end`,
          updatedAt: input.now,
        },
      })
      .returning();
    return rows[0]?.attemptCount ?? 1;
  }

  async createAdminIfAbsent(
    input: Parameters<AuthRepository["createAdminIfAbsent"]>[0],
  ): Promise<"CREATED" | "ALREADY_EXISTS"> {
    try {
      const created = await this.database
        .insert(users)
        .values({
          email: input.email,
          displayName: input.displayName,
          passwordHash: input.passwordHash,
          role: "ADMIN",
          status: "ACTIVE",
          emailVerifiedAt: input.now,
          preferredLocale: "vi",
        })
        .onConflictDoNothing()
        .returning();
      return created.length === 1 ? "CREATED" : "ALREADY_EXISTS";
    } catch (error) {
      if (isUniqueViolation(error)) return "ALREADY_EXISTS";
      throw error;
    }
  }

  async recordAuthEvent(
    input: Parameters<AuthRepository["recordAuthEvent"]>[0],
  ): Promise<void> {
    await this.database.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: "User",
      entityId: input.entityId,
      metadata: input.metadata ?? {},
    });
  }
}
