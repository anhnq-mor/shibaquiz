import { z } from "zod";

import { defaultLocale, isLocale, type Locale } from "@/domain/common/locale";

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const defaultTrueBooleanString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const optionalNonEmptyString = (minimumLength = 1) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(minimumLength).optional(),
  );

const runtimeSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    VERCEL: z.string().optional(),
    APP_URL: z.url().default("http://localhost:3000"),
    DEFAULT_LOCALE: z.enum(["vi", "en"]).default(defaultLocale),
    SUPPORTED_LOCALES: z.string().default("vi,en"),
    STORAGE_DRIVER: z.enum(["postgres", "pglite"]).default("postgres"),
    DATABASE_URL: z.string().min(1).optional(),
    DATABASE_SSL: booleanString,
    PGLITE_DATA_DIR: z
      .string()
      .regex(
        /^\.\/data\/[a-zA-Z0-9/_-]+$/,
        "PGLITE_DATA_DIR must stay below ./data/",
      )
      .default("./data/pglite"),
  })
  .superRefine((value, context) => {
    const supported = value.SUPPORTED_LOCALES.split(",").map((locale) =>
      locale.trim(),
    );
    if (
      supported.length !== 2 ||
      !supported.every(isLocale) ||
      !supported.includes("vi") ||
      !supported.includes("en")
    ) {
      context.addIssue({
        code: "custom",
        path: ["SUPPORTED_LOCALES"],
        message: "SUPPORTED_LOCALES must contain exactly vi,en",
      });
    }

    if (
      (value.NODE_ENV === "production" || value.VERCEL === "1") &&
      !value.APP_URL.startsWith("https://")
    ) {
      context.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "APP_URL must use HTTPS in production/Vercel",
      });
    }

    if (value.STORAGE_DRIVER === "postgres" && !value.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when STORAGE_DRIVER=postgres",
      });
    }

    if (
      value.STORAGE_DRIVER === "pglite" &&
      (value.NODE_ENV === "production" || value.VERCEL === "1")
    ) {
      context.addIssue({
        code: "custom",
        path: ["STORAGE_DRIVER"],
        message:
          "PGlite is local-development only; production/Vercel requires postgres",
      });
    }
  });

const mediaStorageSchema = z.object({
  MEDIA_STORAGE_DRIVER: z.literal("s3").default("s3"),
  MEDIA_S3_REGION: z.string().min(1).default("auto"),
  MEDIA_S3_ENDPOINT: z.url().optional(),
  MEDIA_S3_BUCKET: z.string().min(1),
  MEDIA_S3_ACCESS_KEY_ID: z.string().min(1),
  MEDIA_S3_SECRET_ACCESS_KEY: z.string().min(1),
  MEDIA_S3_FORCE_PATH_STYLE: booleanString,
  MEDIA_SIGNED_URL_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(900)
    .default(300),
  MEDIA_MAX_IMAGE_MB: z.coerce.number().positive().max(25).default(5),
  MEDIA_MAX_AUDIO_MB: z.coerce.number().positive().max(100).default(25),
  MEDIA_MAX_VIDEO_MB: z.coerce.number().positive().max(500).default(100),
});

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
    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
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

export interface RuntimeConfig extends Omit<
  z.output<typeof runtimeSchema>,
  "DEFAULT_LOCALE"
> {
  DEFAULT_LOCALE: Locale;
}

export type MediaStorageConfig = z.output<typeof mediaStorageSchema>;
export type AuthConfig = Omit<z.output<typeof authSchema>, "AUTH_SECRET"> & {
  AUTH_SECRET: string;
};

type Environment = Record<string, string | undefined>;

export function loadRuntimeConfig(
  environment: Environment = process.env,
): RuntimeConfig {
  return runtimeSchema.parse(environment);
}

export function loadMediaStorageConfig(
  environment: Environment = process.env,
): MediaStorageConfig {
  return mediaStorageSchema.parse(environment);
}

export function loadAuthConfig(
  environment: Environment = process.env,
): AuthConfig {
  const parsed = authSchema.parse(environment);
  return {
    ...parsed,
    AUTH_SECRET:
      parsed.AUTH_SECRET ??
      "shibaquiz-local-development-secret-change-before-deploying",
  };
}
