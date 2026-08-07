import { type NextRequest, NextResponse } from "next/server";

import {
  localePreferenceCookieName,
  resolveLocale,
} from "@/domain/common/locale";
import { getAuthService } from "@/server/auth/runtime";
import { SESSION_COOKIE_NAME } from "@/server/auth/session-cookie";

export async function GET(request: NextRequest) {
  const user = await getAuthService().currentUser(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  const locale = resolveLocale({
    profileLocale: user?.preferredLocale,
    cookieLocale: request.cookies.get(localePreferenceCookieName)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });
  return NextResponse.redirect(new URL(`/${locale}`, request.url));
}
