import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  emailSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/domain/auth/validation";

describe("authentication input policy", () => {
  it("normalizes email before it reaches the repository", () => {
    expect(emailSchema.parse("  Learner@Example.COM ")).toBe(
      "learner@example.com",
    );
  });

  it("requires a ten-character password containing a Unicode letter and number", () => {
    expect(passwordSchema.safeParse("chỉcóchữthôi").success).toBe(false);
    expect(passwordSchema.safeParse("1234567890").success).toBe(false);
    expect(passwordSchema.safeParse("Mậtkhẩu1234").success).toBe(true);
  });

  it("rejects mismatched password confirmation for every password-creation flow", () => {
    expect(
      registerSchema.safeParse({
        displayName: "Learner",
        email: "learner@example.com",
        password: "Matkhau12345",
        confirmPassword: "Matkhau54321",
        locale: "vi",
      }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        token: "x".repeat(32),
        password: "Matkhau12345",
        confirmPassword: "Matkhau54321",
        locale: "en",
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "old-password",
        newPassword: "Matkhau12345",
        confirmPassword: "Matkhau54321",
      }).success,
    ).toBe(false);
  });

  it("accepts matching password confirmation", () => {
    expect(
      registerSchema.safeParse({
        displayName: "Learner",
        email: "learner@example.com",
        password: "Matkhau12345",
        confirmPassword: "Matkhau12345",
        locale: "vi",
      }).success,
    ).toBe(true);
  });
});
