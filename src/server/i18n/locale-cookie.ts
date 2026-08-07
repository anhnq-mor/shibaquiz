import "server-only";

import { cookies } from "next/headers";

import {
  localePreferenceCookieName,
  type Locale,
} from "@/domain/common/locale";
import { loadAuthConfig } from "@/server/config/env";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export async function writeLocaleCookie(locale: Locale): Promise<void> {
  const config = loadAuthConfig();
  (await cookies()).set(localePreferenceCookieName, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.NODE_ENV === "production" || config.VERCEL === "1",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}
