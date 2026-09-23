import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

/**
 * Kept as vi/en to match the exact enum this app already migrated in
 * production. A future consumer of this package with a different locale set
 * should fork this enum rather than change it in place here.
 */
export const localeEnum = pgEnum("locale", ["vi", "en"]);
export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "LOCKED"]);
export const authTokenTypeEnum = pgEnum("auth_token_type", [
  "EMAIL_VERIFY",
  "PASSWORD_RESET",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").default("USER").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    emailVerificationExemptedAt: timestamp("email_verification_exempted_at", {
      withTimezone: true,
    }),
    status: userStatusEnum("status").default("ACTIVE").notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    preferredLocale: localeEnum("preferred_locale"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_normalized_unique").on(sql`lower(${table.email})`),
    index("users_role_status_idx").on(table.role, table.status),
  ],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: authTokenTypeEnum("type").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("auth_tokens_hash_unique").on(table.tokenHash),
    index("auth_tokens_user_type_idx").on(table.userId, table.type),
    index("auth_tokens_expiry_idx").on(table.expiresAt),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.sessionTokenHash),
    index("sessions_user_active_idx").on(
      table.userId,
      table.revokedAt,
      table.expiresAt,
    ),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_created_idx").on(table.createdAt),
    index("audit_logs_entity_created_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    index("audit_logs_actor_created_idx").on(
      table.actorUserId,
      table.createdAt,
    ),
  ],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    keyHash: text("key_hash").primaryKey(),
    action: text("action").notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    attemptCount: integer("attempt_count").default(1).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("rate_limits_expiry_idx").on(table.expiresAt),
    check("rate_limits_attempt_count_positive", sql`${table.attemptCount} > 0`),
  ],
);
