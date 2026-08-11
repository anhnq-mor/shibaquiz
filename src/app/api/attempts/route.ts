import { NextResponse } from "next/server";

import { startAttemptSchema } from "@/domain/attempts/attempt";
import { requireUser } from "@/server/auth/authorization";
import { getAttemptService } from "@/server/content/runtime";
import { attemptErrorResponse } from "@/server/http/attempt-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";
import { localeFromQuery } from "@/server/http/admin-http";

export async function POST(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const input = await parseJson(request, startAttemptSchema);
    const result = await getAttemptService().startOrResumeAttempt(
      input,
      user.id,
      locale,
    );
    return NextResponse.json(result);
  } catch (error) {
    return attemptErrorResponse(error, locale);
  }
}
