import { NextResponse } from "next/server";

import { emailRequestSchema } from "@/domain/auth/validation";
import { getAuthService } from "@/server/auth/runtime";
import { loadAuthConfig } from "@/server/config/env";
import {
  assertTrustedOrigin,
  authErrorResponse,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";

export async function POST(request: Request) {
  let locale = requestLocale(request);
  try {
    assertTrustedOrigin(request);
    const input = await parseJson(request, emailRequestSchema);
    locale = input.locale;
    await getAuthService().requestPasswordReset(input);
    return NextResponse.json({
      ok: true,
      delivery: loadAuthConfig().EMAIL_PROVIDER,
    });
  } catch (error) {
    return authErrorResponse(error, locale);
  }
}
