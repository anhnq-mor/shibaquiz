import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { isAdminUserError } from "@/domain/admin/users";
import type { Locale } from "@/domain/common/locale";
import { authErrorResponse } from "@/server/http/auth-http";

const messages = {
  vi: {
    NOT_FOUND: "Không tìm thấy người dùng được yêu cầu.",
    LAST_ADMIN_GUARD: "Không thể khóa hoặc hạ quyền quản trị viên cuối cùng.",
    INVALID_STRUCTURE: "Dữ liệu gửi lên chưa hợp lệ.",
  },
  en: {
    NOT_FOUND: "The requested user was not found.",
    LAST_ADMIN_GUARD: "Cannot lock or demote the last remaining admin.",
    INVALID_STRUCTURE: "The submitted data is invalid.",
  },
} as const;

export function adminUserErrorResponse(
  error: unknown,
  locale: Locale,
): NextResponse {
  if (isAdminUserError(error)) {
    return NextResponse.json(
      {
        code: error.code,
        message: messages[locale][error.code],
        requestId: randomUUID(),
      },
      { status: error.status },
    );
  }
  return authErrorResponse(error, locale);
}
