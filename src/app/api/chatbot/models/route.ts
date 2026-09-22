import { NextResponse } from "next/server";

import { listModelsRequestSchema } from "@/domain/chatbot/chatbot";
import { requireUser } from "@/server/auth/authorization";
import { getChatbotService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";
import { chatbotErrorResponse } from "@/server/http/chatbot-http";

export async function POST(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const input = await parseJson(request, listModelsRequestSchema);
    const result = await getChatbotService().listModels(
      input.provider,
      input.apiKey,
      user.id,
    );
    return NextResponse.json(result);
  } catch (error) {
    return chatbotErrorResponse(error, locale);
  }
}
