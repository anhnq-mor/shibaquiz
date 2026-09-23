import "server-only";

import { createSessionCookieAdapter } from "@shibaquiz/admin-platform/session-cookie";
import { loadAuthConfig } from "@/server/config/env";

export const SESSION_COOKIE_NAME = "shibaquiz_session";

const adapter = createSessionCookieAdapter(SESSION_COOKIE_NAME);

export const readSessionCookie = adapter.readSessionCookie;

export async function writeSessionCookie(
  value: string,
  expires: Date,
): Promise<void> {
  const config = loadAuthConfig();
  await adapter.writeSessionCookie(
    value,
    expires,
    config.NODE_ENV === "production" || config.VERCEL === "1",
  );
}

export const clearSessionCookie = adapter.clearSessionCookie;
