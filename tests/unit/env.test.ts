import { describe, expect, it } from "vitest";

import {
  loadAuthConfig,
  loadMediaStorageConfig,
  loadRuntimeConfig,
} from "@/server/config/env";

const validRuntime = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DEFAULT_LOCALE: "vi",
  SUPPORTED_LOCALES: "vi,en",
  STORAGE_DRIVER: "postgres",
  DATABASE_URL: "postgresql://example.test/shibaquiz",
  DATABASE_SSL: "false",
};

describe("runtime configuration", () => {
  it("accepts PostgreSQL with both supported locales", () => {
    expect(loadRuntimeConfig(validRuntime).STORAGE_DRIVER).toBe("postgres");
  });

  it("accepts PGlite without DATABASE_URL for local development", () => {
    const config = loadRuntimeConfig({
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      STORAGE_DRIVER: "pglite",
      PGLITE_DATA_DIR: "./data/pglite",
    });

    expect(config.STORAGE_DRIVER).toBe("pglite");
    expect(config.DATABASE_URL).toBeUndefined();
  });

  it("rejects a JSON persistence driver in every environment", () => {
    expect(() =>
      loadRuntimeConfig({ ...validRuntime, STORAGE_DRIVER: "json" }),
    ).toThrow();
  });

  it("requires HTTPS in production", () => {
    expect(() =>
      loadRuntimeConfig({ ...validRuntime, NODE_ENV: "production" }),
    ).toThrow(/HTTPS/);
  });

  it("rejects PGlite in production even with HTTPS", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "production",
        APP_URL: "https://quiz.example.com",
        STORAGE_DRIVER: "pglite",
        PGLITE_DATA_DIR: "./data/pglite",
      }),
    ).toThrow(/local-development only/);
  });

  it("requires DATABASE_URL for the PostgreSQL driver", () => {
    expect(() =>
      loadRuntimeConfig({
        NODE_ENV: "development",
        APP_URL: "http://localhost:3000",
        STORAGE_DRIVER: "postgres",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects missing bilingual locale support", () => {
    expect(() =>
      loadRuntimeConfig({ ...validRuntime, SUPPORTED_LOCALES: "vi" }),
    ).toThrow(/vi,en/);
  });

  it("requires private object-storage credentials rather than a local driver", () => {
    expect(() =>
      loadMediaStorageConfig({
        MEDIA_STORAGE_DRIVER: "local",
        MEDIA_S3_BUCKET: "test",
        MEDIA_S3_ACCESS_KEY_ID: "test",
        MEDIA_S3_SECRET_ACCESS_KEY: "test",
      }),
    ).toThrow();
  });

  it("provides a local-only authentication secret", () => {
    const config = loadAuthConfig({
      NODE_ENV: "development",
      AUTH_SECRET: "",
      EMAIL_FROM: "",
      EMAIL_API_KEY: "",
    });
    expect(config.AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(config.REQUIRE_EMAIL_VERIFICATION).toBe(true);
  });

  it("allows an explicit server-side email verification opt-out", () => {
    expect(
      loadAuthConfig({
        NODE_ENV: "development",
        REQUIRE_EMAIL_VERIFICATION: "false",
      }).REQUIRE_EMAIL_VERIFICATION,
    ).toBe(false);
  });

  it("rejects unsafe production auth and email configuration", () => {
    expect(() =>
      loadAuthConfig({
        NODE_ENV: "production",
        APP_URL: "https://quiz.example.com",
        EMAIL_PROVIDER: "console",
      }),
    ).toThrow();
  });
});
