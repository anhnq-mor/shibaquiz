import { z } from "zod";

export const userRoles = ["USER", "ADMIN"] as const;
export const userStatuses = ["ACTIVE", "LOCKED"] as const;
export type UserRole = (typeof userRoles)[number];
export type UserStatus = (typeof userStatuses)[number];

const idSchema = z.string().uuid();

export const userListQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
  role: z.enum(userRoles).optional(),
  status: z.enum(userStatuses).optional(),
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const setUserRoleSchema = z.object({ role: z.enum(userRoles) });
export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;

export const setUserLockSchema = z.object({ locked: z.boolean() });
export type SetUserLockInput = z.infer<typeof setUserLockSchema>;

export interface AdminUserSummary {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export class AdminUserError extends Error {
  constructor(
    public readonly code:
      "NOT_FOUND" | "LAST_ADMIN_GUARD" | "INVALID_STRUCTURE",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminUserError";
  }
}

export function isAdminUserError(error: unknown): error is AdminUserError {
  return (
    error instanceof Error &&
    error.name === "AdminUserError" &&
    typeof (error as AdminUserError).code === "string"
  );
}

export interface AdminUserRepository {
  listUsers(
    query: UserListQuery,
  ): Promise<{ items: AdminUserSummary[]; nextCursor: string | null }>;
  findById(userId: string): Promise<AdminUserSummary | null>;
  setRole(
    userId: string,
    role: UserRole,
    actorUserId: string,
    now: Date,
  ): Promise<void>;
  setLocked(
    userId: string,
    locked: boolean,
    actorUserId: string,
    now: Date,
  ): Promise<void>;
  recordPasswordResetTriggered(
    userId: string,
    actorUserId: string,
    now: Date,
  ): Promise<void>;
}
