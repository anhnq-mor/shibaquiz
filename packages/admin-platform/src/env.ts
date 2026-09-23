import { z } from "zod";

const optionalNonEmptyString = (minimumLength = 1) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(minimumLength).optional(),
  );

const defaultTrueBooleanString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const authSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    VERCEL: z.string().optional(),
    APP_URL: z.url().default("http://localhost:3000"),
    AUTH_SECRET: optionalNonEmptyString(32),
    AUTH_BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),
    AUTH_SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    REQUIRE_EMAIL_VERIFICATION: defaultTrueBooleanString,
    EMAIL_PROVIDER: z
      .enum(["console", "resend", "disabled"])
      .default("console"),
    EMAIL_FROM: optionalNonEmptyString(),
    EMAIL_API_KEY: optionalNonEmptyString(),
  })
  .superRefine((value, context) => {
    const deployed = value.NODE_ENV === "production" || value.VERCEL === "1";
    if (deployed && !value.AUTH_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET is required in production/Vercel",
      });
    }
    if (deployed && value.EMAIL_PROVIDER === "console") {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_PROVIDER"],
        message: "Console email is development/test only",
      });
    }
    if (
      value.EMAIL_PROVIDER === "disabled" &&
      value.REQUIRE_EMAIL_VERIFICATION
    ) {
      context.addIssue({
        code: "custom",
        path: ["REQUIRE_EMAIL_VERIFICATION"],
        message:
          "Email verification must be disabled when email delivery is disabled",
      });
    }
    if (
      value.EMAIL_PROVIDER === "resend" &&
      (!value.EMAIL_FROM || !value.EMAIL_API_KEY)
    ) {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_PROVIDER"],
        message: "Resend requires EMAIL_FROM and EMAIL_API_KEY",
      });
    }
  });

export type AuthConfig = Omit<z.output<typeof authSchema>, "AUTH_SECRET"> & {
  AUTH_SECRET: string;
};

type Environment = Record<string, string | undefined>;

const DEFAULT_LOCAL_SECRET =
  "admin-platform-local-development-secret-change-before-deploying";

export function loadAuthConfig(
  environment: Environment = process.env,
  localDevelopmentSecret = DEFAULT_LOCAL_SECRET,
): AuthConfig {
  const parsed = authSchema.parse(environment);
  return {
    ...parsed,
    AUTH_SECRET: parsed.AUTH_SECRET ?? localDevelopmentSecret,
  };
}
