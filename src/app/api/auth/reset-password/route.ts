import { NextResponse } from "next/server";

import { resetPasswordSchema } from "@/domain/auth/validation";
import { getAuthService } from "@/server/auth/runtime";
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
    const input = await parseJson(request, resetPasswordSchema);
    locale = input.locale;
    await getAuthService().resetPassword(input.token, input.password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, locale);
  }
}
