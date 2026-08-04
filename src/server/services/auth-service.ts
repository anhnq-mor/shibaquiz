import type {
  AuthenticatedUserDto,
  AuthRepository,
  EmailService,
} from "@/domain/auth/auth";
import { AuthError } from "@/domain/auth/auth";
import type { Locale } from "@/domain/common/locale";
import {
  createOpaqueToken,
  hashOpaqueToken,
  hashRateLimitKey,
} from "@/server/auth/crypto";
import {
  DUMMY_PASSWORD_HASH,
  type PasswordHasher,
} from "@/server/auth/password-hasher";

const HOUR = 60 * 60 * 1_000;
const MINUTE = 60 * 1_000;

export interface AuthServiceConfig {
  secret: string;
  sessionDays: number;
  requireEmailVerification: boolean;
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly email: EmailService,
    private readonly passwordHasher: PasswordHasher,
    private readonly config: AuthServiceConfig,
    private readonly now: () => Date = () => new Date(),
    private readonly token: () => string = createOpaqueToken,
  ) {}

  async register(input: {
    displayName: string;
    email: string;
    password: string;
    locale: Locale;
  }): Promise<void> {
    await this.enforceRateLimit("register", input.email, 5, HOUR);
    const now = this.now();
    const rawToken = this.config.requireEmailVerification
      ? this.token()
      : undefined;
    const result = await this.repository.createUser({
      displayName: input.displayName,
      email: input.email,
      passwordHash: await this.passwordHasher.hash(input.password),
      preferredLocale: input.locale,
      emailVerificationExemptedAt: this.config.requireEmailVerification
        ? null
        : now,
      ...(rawToken
        ? {
            verificationToken: {
              tokenHash: hashOpaqueToken(rawToken),
              expiresAt: new Date(now.getTime() + 24 * HOUR),
            },
          }
        : {}),
      now,
    });
    if (!result.created)
      throw new AuthError("EMAIL_IN_USE", 409, "Email is already registered");
    if (rawToken) {
      await this.email.sendVerification({
        to: input.email,
        displayName: input.displayName,
        locale: input.locale,
        token: rawToken,
      });
    }
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const consumed = await this.repository.consumeEmailVerificationToken(
      hashOpaqueToken(rawToken),
      this.now(),
    );
    if (!consumed)
      throw new AuthError("TOKEN_INVALID", 400, "Token is invalid or expired");
  }

  async resendVerification(input: {
    email: string;
    locale: Locale;
  }): Promise<void> {
    await this.enforceRateLimit("verify-resend", input.email, 3, HOUR);
    if (!this.config.requireEmailVerification) return;
    const user = await this.repository.findCredentialsByEmail(input.email);
    if (
      !user ||
      user.status !== "ACTIVE" ||
      user.emailVerifiedAt ||
      user.emailVerificationExemptedAt
    )
      return;
    const rawToken = this.token();
    const now = this.now();
    await this.repository.replaceUnusedToken({
      userId: user.id,
      type: "EMAIL_VERIFY",
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: new Date(now.getTime() + 24 * HOUR),
      now,
    });
    try {
      await this.email.sendVerification({
        to: user.email,
        displayName: user.displayName,
        locale: input.locale,
        token: rawToken,
      });
    } catch {
      // The public response must not reveal account eligibility through a
      // provider-specific failure. A later resend replaces this token again.
      try {
        await this.repository.recordAuthEvent({
          actorUserId: user.id,
          action: "AUTH_VERIFICATION_RESEND_FAILED",
          entityId: user.id,
        });
      } catch {
        // Observability must not weaken the generic resend response.
      }
    }
  }

  async login(input: { email: string; password: string }): Promise<{
    sessionToken: string;
    expiresAt: Date;
    user: AuthenticatedUserDto;
  }> {
    await this.enforceRateLimit("login", input.email, 10, 15 * MINUTE);
    const user = await this.repository.findCredentialsByEmail(input.email);
    const valid = await this.passwordHasher.compare(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !valid || user.status !== "ACTIVE") {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        401,
        "Email or password is incorrect",
      );
    }
    if (
      this.config.requireEmailVerification &&
      !user.emailVerifiedAt &&
      !user.emailVerificationExemptedAt
    ) {
      throw new AuthError("EMAIL_NOT_VERIFIED", 403, "Email is not verified");
    }
    const now = this.now();
    const rawToken = this.token();
    const expiresAt = new Date(
      now.getTime() + this.config.sessionDays * 24 * HOUR,
    );
    await this.repository.createSession({
      userId: user.id,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt,
      now,
    });
    return {
      sessionToken: rawToken,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        preferredLocale: user.preferredLocale,
      },
    };
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return;
    await this.repository.revokeSession(
      hashOpaqueToken(sessionToken),
      this.now(),
    );
  }

  async requestPasswordReset(input: {
    email: string;
    locale: Locale;
  }): Promise<void> {
    await this.enforceRateLimit("password-forgot", input.email, 5, HOUR);
    const user = await this.repository.findCredentialsByEmail(input.email);
    if (!user || user.status !== "ACTIVE") return;
    const rawToken = this.token();
    const now = this.now();
    await this.repository.replaceUnusedToken({
      userId: user.id,
      type: "PASSWORD_RESET",
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: new Date(now.getTime() + HOUR),
      now,
    });
    await this.email.sendPasswordReset({
      to: user.email,
      displayName: user.displayName,
      locale: input.locale,
      token: rawToken,
    });
  }

  async resetPassword(rawToken: string, password: string): Promise<void> {
    const updated = await this.repository.consumePasswordResetToken({
      tokenHash: hashOpaqueToken(rawToken),
      passwordHash: await this.passwordHasher.hash(password),
      now: this.now(),
    });
    if (!updated)
      throw new AuthError("TOKEN_INVALID", 400, "Token is invalid or expired");
  }

  async changePassword(input: {
    userId: string;
    sessionToken: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const user = await this.repository.findCredentialsById(input.userId);
    if (
      !user ||
      !(await this.passwordHasher.compare(
        input.currentPassword,
        user.passwordHash,
      ))
    ) {
      throw new AuthError(
        "CURRENT_PASSWORD_INVALID",
        400,
        "Current password is incorrect",
      );
    }
    await this.repository.updatePasswordAndRevokeOtherSessions({
      userId: user.id,
      currentSessionTokenHash: hashOpaqueToken(input.sessionToken),
      passwordHash: await this.passwordHasher.hash(input.newPassword),
      now: this.now(),
    });
  }

  currentUser(
    sessionToken: string | undefined,
  ): Promise<AuthenticatedUserDto | null> {
    if (!sessionToken) return Promise.resolve(null);
    return this.repository.findActiveSession({
      tokenHash: hashOpaqueToken(sessionToken),
      now: this.now(),
      requireEmailVerification: this.config.requireEmailVerification,
    });
  }

  private async enforceRateLimit(
    action: string,
    subject: string,
    maximum: number,
    windowMs: number,
  ): Promise<void> {
    const now = this.now();
    const attempt = await this.repository.consumeRateLimit({
      action,
      keyHash: hashRateLimitKey(this.config.secret, action, subject),
      windowExpiresAt: new Date(now.getTime() + windowMs),
      now,
    });
    if (attempt > maximum)
      throw new AuthError("RATE_LIMITED", 429, "Too many requests");
  }
}
