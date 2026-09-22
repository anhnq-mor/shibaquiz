import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import type { Locale } from "@/domain/common/locale";
import { isChatbotError } from "@/domain/chatbot/chatbot";
import { authErrorResponse } from "@/server/http/auth-http";

const messages = {
  vi: {
    RATE_LIMITED: "Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau.",
    PROVIDER_ERROR:
      "Không thể kết nối tới nhà cung cấp AI. Kiểm tra API key và thử lại.",
    BAD_REQUEST: "Dữ liệu gửi lên chưa hợp lệ.",
  },
  en: {
    RATE_LIMITED: "You're sending messages too fast. Please try again later.",
    PROVIDER_ERROR:
      "Couldn't reach the AI provider. Check your API key and try again.",
    BAD_REQUEST: "The submitted data is invalid.",
  },
} as const;

export function chatbotErrorResponse(
  error: unknown,
  locale: Locale,
): NextResponse {
  if (isChatbotError(error)) {
    return NextResponse.json(
      {
        code: error.code,
        message:
          messages[locale][error.code as keyof (typeof messages)[Locale]] ??
          messages[locale].PROVIDER_ERROR,
        requestId: randomUUID(),
      },
      { status: error.status },
    );
  }
  return authErrorResponse(error, locale);
}
