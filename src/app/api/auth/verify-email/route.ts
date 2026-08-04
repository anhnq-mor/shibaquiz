import { NextResponse } from "next/server";
import { z } from "zod";

import { tokenSchema } from "@/domain/auth/validation";
import { getAuthService } from "@/server/auth/runtime";
import {
  assertTrustedOrigin,
  authErrorResponse,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";

const schema = z.object({ token: tokenSchema, locale: z.enum(["vi", "en"]) });

export async function POST(request: Request) {
  let locale = requestLocale(request);
  try {
    assertTrustedOrigin(request);
    const input = await parseJson(request, schema);
    locale = input.locale;
    await getAuthService().verifyEmail(input.token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error, locale);
  }
}
