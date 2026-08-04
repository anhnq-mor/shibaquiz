import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AuthError, type EmailService } from "@/domain/auth/auth";
import * as schema from "@/server/db/schema";
import { BcryptPasswordHasher } from "@/server/auth/password-hasher";
import { DrizzleAuthRepository } from "@/server/repositories/drizzle-auth-repository";
import { AuthService } from "@/server/services/auth-service";

const client = new PGlite();
const database = drizzle(client, { schema });
const emails: { verification?: string; reset?: string } = {};
const emailService: EmailService = {
  async sendVerification(input) {
    emails.verification = input.token;
  },
  async sendPasswordReset(input) {
    emails.reset = input.token;
  },
};
let tokenNumber = 0;
const service = new AuthService(
  new DrizzleAuthRepository(database),
  emailService,
  new BcryptPasswordHasher(10),
  {
    secret: "test-secret-that-is-at-least-thirty-two-characters",
    sessionDays: 7,
    requireEmailVerification: true,
  },
  () => new Date("2026-08-04T10:00:00.000Z"),
  () => `${String(++tokenNumber).padStart(2, "0")}-${"x".repeat(41)}`,
);

const optionalVerificationService = new AuthService(
  new DrizzleAuthRepository(database),
  emailService,
  new BcryptPasswordHasher(10),
  {
    secret: "test-secret-that-is-at-least-thirty-two-characters",
    sessionDays: 7,
    requireEmailVerification: false,
  },
  () => new Date("2026-08-04T10:00:00.000Z"),
  () => `${String(++tokenNumber).padStart(2, "0")}-${"x".repeat(41)}`,
);

const failingResendService = new AuthService(
  new DrizzleAuthRepository(database),
  {
    async sendVerification() {
      throw new Error("simulated provider outage");
    },
    async sendPasswordReset() {},
  },
  new BcryptPasswordHasher(10),
  {
    secret: "test-secret-that-is-at-least-thirty-two-characters",
    sessionDays: 7,
    requireEmailVerification: true,
  },
  () => new Date("2026-08-04T10:00:00.000Z"),
  () => `${String(++tokenNumber).padStart(2, "0")}-${"x".repeat(41)}`,
);

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
});

afterAll(async () => {
  await client.close();
});

describe("secure account vertical slice", () => {
  it("registers, verifies, signs in, resets the password, and revokes sessions", async () => {
    await service.register({
      displayName: "Học viên",
      email: "learner@example.com",
      password: "matkhau1234",
      locale: "vi",
    });
    const initialVerificationToken = emails.verification;
    expect(initialVerificationToken).toBeTruthy();

    const storedTokens = await client.query<{ token_hash: string }>(
      "select token_hash from auth_tokens",
    );
    expect(storedTokens.rows[0]?.token_hash).not.toBe(initialVerificationToken);

    await service.resendVerification({
      email: "learner@example.com",
      locale: "vi",
    });
    const replacementVerificationToken = emails.verification;
    expect(replacementVerificationToken).toBeTruthy();
    expect(replacementVerificationToken).not.toBe(initialVerificationToken);
    await expect(
      service.verifyEmail(initialVerificationToken!),
    ).rejects.toMatchObject({
      code: "TOKEN_INVALID",
    } satisfies Partial<AuthError>);

    await expect(
      service.login({ email: "learner@example.com", password: "matkhau1234" }),
    ).rejects.toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
    } satisfies Partial<AuthError>);

    await service.verifyEmail(replacementVerificationToken!);
    await expect(
      service.verifyEmail(replacementVerificationToken!),
    ).rejects.toMatchObject({
      code: "TOKEN_INVALID",
    } satisfies Partial<AuthError>);
    const login = await service.login({
      email: "learner@example.com",
      password: "matkhau1234",
    });
    expect(login.user).not.toHaveProperty("passwordHash");
    expect(await service.currentUser(login.sessionToken)).toMatchObject({
      email: "learner@example.com",
    });

    await service.requestPasswordReset({
      email: "learner@example.com",
      locale: "vi",
    });
    expect(emails.reset).toBeTruthy();
    await service.resetPassword(emails.reset!, "matkhaumoi5678");
    await expect(
      service.resetPassword(emails.reset!, "matkhaukhac9876"),
    ).rejects.toMatchObject({
      code: "TOKEN_INVALID",
    } satisfies Partial<AuthError>);
    expect(await service.currentUser(login.sessionToken)).toBeNull();
    await expect(
      service.login({ email: "learner@example.com", password: "matkhau1234" }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    } satisfies Partial<AuthError>);
    await expect(
      service.login({
        email: "learner@example.com",
        password: "matkhaumoi5678",
      }),
    ).resolves.toHaveProperty("sessionToken");
  });

  it("does not reveal whether a password-reset email exists", async () => {
    await expect(
      service.requestPasswordReset({
        email: "missing@example.com",
        locale: "en",
      }),
    ).resolves.toBeUndefined();
  });

  it("creates a durable exemption and sends no verification email when the policy is disabled", async () => {
    const previousVerificationToken = emails.verification;
    await optionalVerificationService.register({
      displayName: "Optional verification",
      email: "optional@example.com",
      password: "matkhau1234",
      locale: "en",
    });

    expect(emails.verification).toBe(previousVerificationToken);
    const stored = await client.query<{
      email_verified_at: Date | null;
      email_verification_exempted_at: Date | null;
      token_count: number;
    }>(
      `select u.email_verified_at,
              u.email_verification_exempted_at,
              count(t.id)::int as token_count
       from users u
       left join auth_tokens t
         on t.user_id = u.id and t.type = 'EMAIL_VERIFY'
       where u.email = $1
       group by u.id`,
      ["optional@example.com"],
    );
    expect(stored.rows[0]?.email_verified_at).toBeNull();
    expect(stored.rows[0]?.email_verification_exempted_at).not.toBeNull();
    expect(stored.rows[0]?.token_count).toBe(0);

    const login = await optionalVerificationService.login({
      email: "optional@example.com",
      password: "matkhau1234",
    });
    await expect(
      optionalVerificationService.currentUser(login.sessionToken),
    ).resolves.toMatchObject({ email: "optional@example.com" });
    await expect(
      service.currentUser(login.sessionToken),
    ).resolves.toMatchObject({
      email: "optional@example.com",
    });

    await optionalVerificationService.resendVerification({
      email: "optional@example.com",
      locale: "en",
    });
    expect(emails.verification).toBe(previousVerificationToken);
  });

  it("temporarily admits a legacy unverified account only while verification is disabled", async () => {
    await service.register({
      displayName: "Pending learner",
      email: "pending@example.com",
      password: "matkhau1234",
      locale: "vi",
    });

    const login = await optionalVerificationService.login({
      email: "pending@example.com",
      password: "matkhau1234",
    });
    await expect(
      optionalVerificationService.currentUser(login.sessionToken),
    ).resolves.toMatchObject({ email: "pending@example.com" });
    await expect(service.currentUser(login.sessionToken)).resolves.toBeNull();
  });

  it("keeps resend generic when the email provider fails", async () => {
    await expect(
      failingResendService.resendVerification({
        email: "pending@example.com",
        locale: "vi",
      }),
    ).resolves.toBeUndefined();

    const audit = await client.query<{ action: string }>(
      `select action
       from audit_logs
       where action = 'AUTH_VERIFICATION_RESEND_FAILED'
       order by created_at desc
       limit 1`,
    );
    expect(audit.rows[0]?.action).toBe("AUTH_VERIFICATION_RESEND_FAILED");
  });

  it("denies a locked user and invalidates an existing session immediately", async () => {
    const login = await service.login({
      email: "learner@example.com",
      password: "matkhaumoi5678",
    });
    await client.query("update users set status = 'LOCKED' where email = $1", [
      "learner@example.com",
    ]);

    expect(await service.currentUser(login.sessionToken)).toBeNull();
    await expect(
      service.login({
        email: "learner@example.com",
        password: "matkhaumoi5678",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    } satisfies Partial<AuthError>);

    await client.query("update users set status = 'ACTIVE' where email = $1", [
      "learner@example.com",
    ]);
  });

  it("retains the current session after a password change and revokes the others", async () => {
    const current = await service.login({
      email: "learner@example.com",
      password: "matkhaumoi5678",
    });
    const other = await service.login({
      email: "learner@example.com",
      password: "matkhaumoi5678",
    });
    await service.changePassword({
      userId: current.user.id,
      sessionToken: current.sessionToken,
      currentPassword: "matkhaumoi5678",
      newPassword: "Matkhaucuoi2468",
    });

    expect(await service.currentUser(current.sessionToken)).toMatchObject({
      id: current.user.id,
    });
    expect(await service.currentUser(other.sessionToken)).toBeNull();
  });

  it("enforces a database-backed request limit", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await service.requestPasswordReset({
        email: "limited@example.com",
        locale: "en",
      });
    }
    await expect(
      service.requestPasswordReset({
        email: "limited@example.com",
        locale: "en",
      }),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    } satisfies Partial<AuthError>);
  });
});
