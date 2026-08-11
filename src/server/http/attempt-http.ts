import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { isAttemptError } from "@/domain/attempts/attempt";
import type { Locale } from "@/domain/common/locale";
import { authErrorResponse } from "@/server/http/auth-http";

const messages = {
  vi: {
    NOT_FOUND: "Không tìm thấy nội dung được yêu cầu.",
    FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    INVALID_STRUCTURE: "Dữ liệu gửi lên chưa hợp lệ.",
    INSUFFICIENT_QUESTIONS: "Chưa đủ câu hỏi để bắt đầu lựa chọn này.",
    LOCKED: "Bài làm này không còn nhận thay đổi.",
  },
  en: {
    NOT_FOUND: "The requested content was not found.",
    FORBIDDEN: "You do not have permission to perform this action.",
    INVALID_STRUCTURE: "The submitted data is invalid.",
    INSUFFICIENT_QUESTIONS:
      "There are not enough questions for this selection yet.",
    LOCKED: "This attempt no longer accepts changes.",
  },
} as const;

export function attemptErrorResponse(
  error: unknown,
  locale: Locale,
): NextResponse {
  if (isAttemptError(error)) {
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
