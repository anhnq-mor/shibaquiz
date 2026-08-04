import { z } from "zod";

import { emailSchema, passwordSchema } from "../src/domain/auth/validation";
import { BcryptPasswordHasher } from "../src/server/auth/password-hasher";
import { loadAuthConfig, loadRuntimeConfig } from "../src/server/config/env";
import { createDatabaseConnection } from "../src/server/db/client";
import { DrizzleAuthRepository } from "../src/server/repositories/drizzle-auth-repository";

const inputSchema = z.object({
  SEED_ADMIN_EMAIL: emailSchema,
  SEED_ADMIN_PASSWORD: passwordSchema,
  SEED_ADMIN_DISPLAY_NAME: z.string().trim().min(1).max(100),
  SEED_ADMIN_CONFIRM: z.literal("CREATE_ADMIN"),
  SEED_ADMIN_PRODUCTION_CONFIRM: z.string().optional(),
});

const input = inputSchema.parse(process.env);
const runtime = loadRuntimeConfig();
const auth = loadAuthConfig();
if (
  (runtime.NODE_ENV === "production" || runtime.VERCEL === "1") &&
  input.SEED_ADMIN_PRODUCTION_CONFIRM !== "I_UNDERSTAND_PRODUCTION"
) {
  throw new Error(
    "Production admin seed requires SEED_ADMIN_PRODUCTION_CONFIRM=I_UNDERSTAND_PRODUCTION",
  );
}
const connection = createDatabaseConnection(runtime);

try {
  const passwordHasher = new BcryptPasswordHasher(auth.AUTH_BCRYPT_COST);
  const repository = new DrizzleAuthRepository(connection.db);
  const result = await repository.createAdminIfAbsent({
    email: input.SEED_ADMIN_EMAIL,
    displayName: input.SEED_ADMIN_DISPLAY_NAME,
    passwordHash: await passwordHasher.hash(input.SEED_ADMIN_PASSWORD),
    now: new Date(),
  });
  process.stdout.write(`Admin seed result: ${result}.\n`);
} finally {
  await connection.close();
}
