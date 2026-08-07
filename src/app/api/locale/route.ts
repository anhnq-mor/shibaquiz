import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthService } from "@/server/auth/runtime";
import { readSessionCookie } from "@/server/auth/session-cookie";
import {
  assertTrustedOrigin,
  authErrorResponse,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";
import { writeLocaleCookie } from "@/server/i18n/locale-cookie";

const schema = z.object({ locale: z.enum(["vi", "en"]) });

export async function POST(request: Request) {
  let locale = requestLocale(request);
  try {
    assertTrustedOrigin(request);
    const input = await parseJson(request, schema);
    locale = input.locale;
    await getAuthService().updatePreferredLocale(
      await readSessionCookie(),
      locale,
    );
    await writeLocaleCookie(locale);
    return NextResponse.json({ ok: true, locale });
  } catch (error) {
    return authErrorResponse(error, locale);
  }
}
