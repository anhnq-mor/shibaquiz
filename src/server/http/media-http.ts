import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { isMediaError } from "@/domain/media/media";
import type { Locale } from "@/domain/common/locale";
import { authErrorResponse } from "@/server/http/auth-http";

const messages = {
  vi: {
    NOT_FOUND: "Không tìm thấy tệp media được yêu cầu.",
    INVALID_STRUCTURE: "Dữ liệu media gửi lên chưa hợp lệ.",
    UNSUPPORTED_MEDIA_TYPE: "Loại tệp này không được hỗ trợ.",
    MEDIA_TOO_LARGE: "Tệp vượt quá kích thước cho phép.",
    CONFLICT: "Không thể thực hiện vì tệp vẫn còn được sử dụng.",
    FEATURE_DISABLED: "Tính năng media hiện chưa được bật.",
  },
  en: {
    NOT_FOUND: "The requested media asset was not found.",
    INVALID_STRUCTURE: "The submitted media data is invalid.",
    UNSUPPORTED_MEDIA_TYPE: "This file type is not supported.",
    MEDIA_TOO_LARGE: "The file exceeds the allowed size.",
    CONFLICT: "This action isn't possible while the file is still in use.",
    FEATURE_DISABLED: "Media is not currently enabled.",
  },
} as const;

export function mediaErrorResponse(
  error: unknown,
  locale: Locale,
): NextResponse {
  if (isMediaError(error)) {
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
