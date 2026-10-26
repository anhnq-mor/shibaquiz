import { NextResponse } from "next/server";

import { setEmailVerificationSchema } from "@/domain/admin/users";
import { requireAdmin } from "@/server/auth/authorization";
import { getAuthService } from "@/server/auth/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { adminUserErrorResponse } from "@/server/http/admin-user-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";

export async function POST(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const input = await parseJson(request, setEmailVerificationSchema);
    await getAuthService().setEmailVerificationRequired(
      input.required,
      admin.id,
    );
    return NextResponse.json({ required: input.required });
  } catch (error) {
    return adminUserErrorResponse(error, locale);
  }
}
