import "server-only";

import { BcryptPasswordHasher } from "@/server/auth/password-hasher";
import { loadAuthConfig } from "@/server/config/env";
import { getDatabaseConnection } from "@/server/db/client";
import { AuthEmailService } from "@/server/email/auth-email-service";
import { DrizzleAuthRepository } from "@/server/repositories/drizzle-auth-repository";
import { AuthService } from "@/server/services/auth-service";

const runtimeGlobal = globalThis as typeof globalThis & {
  shibaQuizAuthService?: AuthService;
};

export function getAuthService(): AuthService {
  const config = loadAuthConfig();
  runtimeGlobal.shibaQuizAuthService ??= new AuthService(
    new DrizzleAuthRepository(getDatabaseConnection().db),
    new AuthEmailService(config),
    new BcryptPasswordHasher(config.AUTH_BCRYPT_COST),
    {
      secret: config.AUTH_SECRET,
      sessionDays: config.AUTH_SESSION_DAYS,
      requireEmailVerification: config.REQUIRE_EMAIL_VERIFICATION,
    },
  );
  return runtimeGlobal.shibaQuizAuthService;
}
