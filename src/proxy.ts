import { NextResponse, type NextRequest } from "next/server";

import {
  isLocale,
  localePreferenceCookieName,
  resolveLocale,
} from "@/domain/common/locale";
import { createContentSecurityPolicy } from "@/server/http/content-security-policy";

function applyContentSecurityPolicy(
  response: NextResponse,
  contentSecurityPolicy: string,
) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = createContentSecurityPolicy({
    nonce,
    isDevelopment: process.env.NODE_ENV === "development",
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const pathname = request.nextUrl.pathname;
  const firstSegment = pathname.split("/")[1];

  if (pathname === "/") {
    return applyContentSecurityPolicy(
      NextResponse.next({ request: { headers: requestHeaders } }),
      contentSecurityPolicy,
    );
  }

  if (firstSegment && !isLocale(firstSegment)) {
    const locale = resolveLocale({
      cookieLocale: request.cookies.get(localePreferenceCookieName)?.value,
      acceptLanguage: request.headers.get("accept-language"),
    });
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}${pathname}`;
    return applyContentSecurityPolicy(
      NextResponse.redirect(redirectUrl),
      contentSecurityPolicy,
    );
  }

  return applyContentSecurityPolicy(
    NextResponse.next({ request: { headers: requestHeaders } }),
    contentSecurityPolicy,
  );
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
