import { NextResponse, type NextRequest } from "next/server";

import {
  isLocale,
  localePreferenceCookieName,
  resolveLocale,
} from "@/domain/common/locale";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const firstSegment = pathname.split("/")[1];

  if (pathname === "/") {
    return NextResponse.next();
  }

  if (firstSegment && !isLocale(firstSegment)) {
    const locale = resolveLocale({
      cookieLocale: request.cookies.get(localePreferenceCookieName)?.value,
      acceptLanguage: request.headers.get("accept-language"),
    });
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
