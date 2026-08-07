import { NextResponse } from "next/server";

import { loginSchema } from "@/domain/auth/validation";
import { getAuthService } from "@/server/auth/runtime";
import { writeSessionCookie } from "@/server/auth/session-cookie";
import {
  assertTrustedOrigin,
  authErrorResponse,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";
import { writeLocaleCookie } from "@/server/i18n/locale-cookie";

export async function POST(request: Request) {
  const locale = requestLocale(request);
  try {
    assertTrustedOrigin(request);
    const input = await parseJson(request, loginSchema);
    const result = await getAuthService().login(input);
    await writeSessionCookie(result.sessionToken, result.expiresAt);
    if (result.user.preferredLocale)
      await writeLocaleCookie(result.user.preferredLocale);
    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    return authErrorResponse(error, locale);
  }
}
