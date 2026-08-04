import { NextResponse } from "next/server";

import { registerSchema } from "@/domain/auth/validation";
import { getAuthService } from "@/server/auth/runtime";
import { loadAuthConfig } from "@/server/config/env";
import {
  assertTrustedOrigin,
  authErrorResponse,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";

export async function POST(request: Request) {
  let locale = requestLocale(request);
  try {
    assertTrustedOrigin(request);
    const input = await parseJson(request, registerSchema);
    locale = input.locale;
    await getAuthService().register(input);
    const config = loadAuthConfig();
    return NextResponse.json(
      {
        ok: true,
        delivery: config.EMAIL_PROVIDER,
        verificationRequired: config.REQUIRE_EMAIL_VERIFICATION,
      },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error, locale);
  }
}
