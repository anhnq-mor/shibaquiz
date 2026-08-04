import { NextResponse } from "next/server";

import { getAuthService } from "@/server/auth/runtime";
import {
  clearSessionCookie,
  readSessionCookie,
} from "@/server/auth/session-cookie";
import {
  assertTrustedOrigin,
  authErrorResponse,
  requestLocale,
} from "@/server/http/auth-http";

export async function POST(request: Request) {
  const locale = requestLocale(request);
  try {
    assertTrustedOrigin(request);
    await getAuthService().logout(await readSessionCookie());
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, locale);
  }
}
