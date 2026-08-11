import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { isCommentError } from "@/domain/comments/comments";
import type { Locale } from "@/domain/common/locale";
import { authErrorResponse } from "@/server/http/auth-http";

const messages = {
  vi: {
    NOT_FOUND: "Không tìm thấy bình luận hoặc câu hỏi được yêu cầu.",
    FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    CONFLICT: "Bình luận này không còn có thể chỉnh sửa.",
    RATE_LIMITED: "Bạn đang bình luận quá nhanh. Vui lòng thử lại sau.",
    INVALID_STRUCTURE: "Nội dung bình luận không hợp lệ.",
  },
  en: {
    NOT_FOUND: "The requested comment or question was not found.",
    FORBIDDEN: "You do not have permission to perform this action.",
    CONFLICT: "This comment can no longer be edited.",
    RATE_LIMITED: "You're commenting too fast. Please try again later.",
    INVALID_STRUCTURE: "The comment content is invalid.",
  },
} as const;

export function commentErrorResponse(
  error: unknown,
  locale: Locale,
): NextResponse {
  if (isCommentError(error)) {
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
