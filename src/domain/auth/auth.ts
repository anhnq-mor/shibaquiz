import type { Locale } from "@/domain/common/locale";

export type AuthTokenType = "EMAIL_VERIFY" | "PASSWORD_RESET";
export type UserRole = "USER" | "ADMIN";

export interface CredentialUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  status: "ACTIVE" | "LOCKED";
  emailVerifiedAt: Date | null;
  emailVerificationExemptedAt: Date | null;
  preferredLocale: Locale | null;
}

export interface AuthenticatedUserDto {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  preferredLocale: Locale | null;
}

export interface AuthRepository {
  createUser(input: {
    email: string;
    displayName: string;
    passwordHash: string;
    preferredLocale: Locale;
    emailVerificationExemptedAt: Date | null;
    verificationToken?: {
      tokenHash: string;
      expiresAt: Date;
    };
    now: Date;
  }): Promise<{ created: true; userId: string } | { created: false }>;
  findCredentialsByEmail(email: string): Promise<CredentialUser | null>;
  findCredentialsById(userId: string): Promise<CredentialUser | null>;
  replaceUnusedToken(input: {
    userId: string;
    type: AuthTokenType;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<void>;
  consumeEmailVerificationToken(tokenHash: string, now: Date): Promise<boolean>;
  consumePasswordResetToken(input: {
    tokenHash: string;
    passwordHash: string;
    now: Date;
  }): Promise<boolean>;
  createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<void>;
  findActiveSession(input: {
    tokenHash: string;
    now: Date;
    requireEmailVerification: boolean;
  }): Promise<AuthenticatedUserDto | null>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
  updatePasswordAndRevokeOtherSessions(input: {
    userId: string;
    currentSessionTokenHash: string;
    passwordHash: string;
    now: Date;
  }): Promise<void>;
  updatePreferredLocale(input: {
    userId: string;
    locale: Locale;
    now: Date;
  }): Promise<void>;
  consumeRateLimit(input: {
    keyHash: string;
    action: string;
    windowExpiresAt: Date;
    now: Date;
  }): Promise<number>;
  createAdminIfAbsent(input: {
    email: string;
    displayName: string;
    passwordHash: string;
    now: Date;
  }): Promise<"CREATED" | "ALREADY_EXISTS">;
  recordAuthEvent(input: {
    actorUserId: string | null;
    action: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface EmailService {
  sendVerification(input: {
    to: string;
    displayName: string;
    locale: Locale;
    token: string;
  }): Promise<void>;
  sendPasswordReset(input: {
    to: string;
    displayName: string;
    locale: Locale;
    token: string;
  }): Promise<void>;
}

export class AuthError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Next.js dev mode compiles the page/RSC layer and the route-handler layer as
 * separate module graphs, so a class instance created by a `globalThis`-cached
 * singleton on one side can fail an `instanceof AuthError` check performed by
 * code compiled on the other side. Matching on `name` plus shape is immune to
 * that cross-layer identity mismatch.
 */
export function isAuthError(error: unknown): error is AuthError {
  return (
    error instanceof Error &&
    error.name === "AuthError" &&
    typeof (error as AuthError).code === "string" &&
    typeof (error as AuthError).status === "number"
  );
}
