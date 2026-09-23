import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { isAdminUserError } from "./domain/admin-users";
import { AuthError, isAuthError, type Locale } from "./domain/auth";
import { loadAuthConfig } from "./env";

export type { Locale };

const messages = {
  vi: {
    BAD_REQUEST: "Dữ liệu gửi lên chưa hợp lệ.",
    ORIGIN_INVALID: "Yêu cầu không hợp lệ.",
    EMAIL_IN_USE: "Email này đã được đăng ký.",
    INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
    EMAIL_NOT_VERIFIED: "Vui lòng xác minh email trước khi đăng nhập.",
    TOKEN_INVALID: "Liên kết không hợp lệ hoặc đã hết hạn.",
    RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    AUTH_REQUIRED: "Vui lòng đăng nhập để tiếp tục.",
    FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    CURRENT_PASSWORD_INVALID: "Mật khẩu hiện tại không đúng.",
    INTERNAL_ERROR: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    NOT_FOUND: "Không tìm thấy người dùng được yêu cầu.",
    LAST_ADMIN_GUARD: "Không thể khóa hoặc hạ quyền quản trị viên cuối cùng.",
    INVALID_STRUCTURE: "Dữ liệu gửi lên chưa hợp lệ.",
  },
  en: {
    BAD_REQUEST: "The submitted data is invalid.",
    ORIGIN_INVALID: "The request is invalid.",
    EMAIL_IN_USE: "This email is already registered.",
    INVALID_CREDENTIALS: "Email or password is incorrect.",
    EMAIL_NOT_VERIFIED: "Verify your email before signing in.",
    TOKEN_INVALID: "The link is invalid or has expired.",
    RATE_LIMITED: "Too many requests. Please try again later.",
    AUTH_REQUIRED: "Sign in to continue.",
    FORBIDDEN: "You do not have permission to perform this action.",
    CURRENT_PASSWORD_INVALID: "The current password is incorrect.",
    INTERNAL_ERROR: "Something went wrong. Please try again.",
    NOT_FOUND: "The requested user was not found.",
    LAST_ADMIN_GUARD: "Cannot lock or demote the last remaining admin.",
    INVALID_STRUCTURE: "The submitted data is invalid.",
  },
} as const;

export function localeFromQuery(request: Request): string | null {
  return new URL(request.url).searchParams.get("locale");
}

export function requestLocale(request: Request, candidate?: unknown): Locale {
  if (candidate === "vi" || candidate === "en") return candidate;
  return request.headers.get("accept-language")?.toLowerCase().startsWith("en")
    ? "en"
    : "vi";
}

export function assertTrustedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const config = loadAuthConfig();
  const configuredOrigin = new URL(config.APP_URL).origin;
  const requestOrigin = new URL(request.url).origin;
  const localSameOrigin =
    config.NODE_ENV !== "production" && origin === requestOrigin;
  if (origin !== configuredOrigin && !localSameOrigin) {
    throw new AuthError("ORIGIN_INVALID", 403, "Invalid request origin");
  }
}

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AuthError("BAD_REQUEST", 400, "Invalid JSON");
  }
  return schema.parse(body);
}

export function authErrorResponse(
  error: unknown,
  locale: Locale,
): NextResponse {
  const localeMessages = locale === "en" ? messages.en : messages.vi;
  const requestId = randomUUID();
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "form");
      (fieldErrors[field] ??= []).push(localeMessages.BAD_REQUEST);
    }
    return NextResponse.json(
      {
        code: "BAD_REQUEST",
        message: localeMessages.BAD_REQUEST,
        fieldErrors,
        requestId,
      },
      { status: 400 },
    );
  }
  if (isAuthError(error)) {
    const code = error.code as keyof typeof messages.vi;
    return NextResponse.json(
      {
        code: error.code,
        message: localeMessages[code] ?? localeMessages.INTERNAL_ERROR,
        fieldErrors: error.fieldErrors,
        requestId,
      },
      { status: error.status },
    );
  }
  console.error(`[auth:${requestId}]`, error);
  return NextResponse.json(
    {
      code: "INTERNAL_ERROR",
      message: localeMessages.INTERNAL_ERROR,
      requestId,
    },
    { status: 500 },
  );
}

export function adminUserErrorResponse(
  error: unknown,
  locale: Locale,
): NextResponse {
  if (isAdminUserError(error)) {
    const localeMessages = locale === "en" ? messages.en : messages.vi;
    return NextResponse.json(
      {
        code: error.code,
        message: localeMessages[error.code],
        requestId: randomUUID(),
      },
      { status: error.status },
    );
  }
  return authErrorResponse(error, locale);
}
