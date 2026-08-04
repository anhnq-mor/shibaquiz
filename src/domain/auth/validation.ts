import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .max(320)
  .transform((value) => value.toLowerCase())
  .pipe(z.email().max(320));

export const passwordSchema = z
  .string()
  .min(10)
  .max(128)
  .regex(/\p{L}/u, "Password must contain a letter")
  .regex(/\p{N}/u, "Password must contain a number");

const confirmPasswordSchema = z.string().min(1).max(128);
const passwordsMatch = (input: {
  password?: string;
  newPassword?: string;
  confirmPassword: string;
}) => (input.password ?? input.newPassword) === input.confirmPassword;
const passwordMismatchIssue = {
  message: "Passwords do not match",
  path: ["confirmPassword"],
};

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
    locale: z.enum(["vi", "en"]),
  })
  .refine(passwordsMatch, passwordMismatchIssue);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const emailRequestSchema = z.object({
  email: emailSchema,
  locale: z.enum(["vi", "en"]),
});

export const tokenSchema = z.string().min(32).max(256);

export const resetPasswordSchema = z
  .object({
    token: tokenSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
    locale: z.enum(["vi", "en"]),
  })
  .refine(passwordsMatch, passwordMismatchIssue);

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(passwordsMatch, passwordMismatchIssue);
