import "server-only";

import { cookies } from "next/headers";

import { loadAuthConfig } from "@/server/config/env";

export const SESSION_COOKIE_NAME = "shibaquiz_session";

export async function readSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value;
}

export async function writeSessionCookie(
  value: string,
  expires: Date,
): Promise<void> {
  const config = loadAuthConfig();
  (await cookies()).set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.NODE_ENV === "production" || config.VERCEL === "1",
    path: "/",
    expires,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
