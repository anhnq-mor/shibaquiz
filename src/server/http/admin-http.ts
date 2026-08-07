import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { isAdminContentError } from "@/domain/admin/content";
import type { Locale } from "@/domain/common/locale";
import { authErrorResponse } from "@/server/http/auth-http";

const messages = {
  vi: {
    NOT_FOUND: "Không tìm thấy nội dung được yêu cầu.",
    CONFLICT: "Dữ liệu đã thay đổi ở nơi khác. Vui lòng tải lại và thử lại.",
    INVALID_STRUCTURE: "Cấu trúc dữ liệu gửi lên không hợp lệ.",
    INCOMPLETE_TRANSLATION: "Thiếu bản dịch bắt buộc cho một ngôn ngữ đã bật.",
    PUBLISH_NOT_READY: "Nội dung chưa đủ điều kiện để publish.",
  },
  en: {
    NOT_FOUND: "The requested content was not found.",
    CONFLICT: "This record changed elsewhere. Reload and try again.",
    INVALID_STRUCTURE: "The submitted content structure is invalid.",
    INCOMPLETE_TRANSLATION:
      "A required translation for an enabled locale is missing.",
    PUBLISH_NOT_READY: "This content is not ready to publish.",
  },
} as const;

export function localeFromQuery(request: Request): string | null {
  return new URL(request.url).searchParams.get("locale");
}

export function adminErrorResponse(
  error: unknown,
  locale: Locale,
): NextResponse {
  if (isAdminContentError(error)) {
    return NextResponse.json(
      {
        code: error.code,
        message: messages[locale][error.code],
        fieldErrors: error.fieldErrors,
        requestId: randomUUID(),
      },
      { status: error.status },
    );
  }
  return authErrorResponse(error, locale);
}
