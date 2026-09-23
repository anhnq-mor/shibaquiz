import "server-only";

import { cookies } from "next/headers";

export interface SessionCookieAdapter {
  readSessionCookie(): Promise<string | undefined>;
  writeSessionCookie(
    value: string,
    expires: Date,
    secure: boolean,
  ): Promise<void>;
  clearSessionCookie(): Promise<void>;
}

export function createSessionCookieAdapter(
  cookieName: string,
): SessionCookieAdapter {
  return {
    async readSessionCookie() {
      return (await cookies()).get(cookieName)?.value;
    },
    async writeSessionCookie(value, expires, secure) {
      (await cookies()).set(cookieName, value, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        expires,
      });
    },
    async clearSessionCookie() {
      (await cookies()).delete(cookieName);
    },
  };
}
