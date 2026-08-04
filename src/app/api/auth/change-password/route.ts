import { NextResponse } from "next/server";

import { AuthError } from "@/domain/auth/auth";
import { changePasswordSchema } from "@/domain/auth/validation";
import { getAuthService } from "@/server/auth/runtime";
import { readSessionCookie } from "@/server/auth/session-cookie";
import {
  assertTrustedOrigin,
  authErrorResponse,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";

export async function POST(request: Request) {
  const locale = requestLocale(request);
  try {
    assertTrustedOrigin(request);
    const sessionToken = await readSessionCookie();
    const user = await getAuthService().currentUser(sessionToken);
    if (!sessionToken || !user)
      throw new AuthError("AUTH_REQUIRED", 401, "Authentication required");
    const input = await parseJson(request, changePasswordSchema);
    await getAuthService().changePassword({
      userId: user.id,
      sessionToken,
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, locale);
  }
}
