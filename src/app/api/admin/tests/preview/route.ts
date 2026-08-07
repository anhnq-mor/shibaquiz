import { NextResponse } from "next/server";

import { saveTestSchema } from "@/domain/admin/content";
import { requireAdmin } from "@/server/auth/authorization";
import { getAdminContentService } from "@/server/content/runtime";
import { adminErrorResponse, localeFromQuery } from "@/server/http/admin-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";

export async function POST(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    await requireAdmin();
    const input = await parseJson(request, saveTestSchema);
    const preview = await getAdminContentService().previewTest(input);
    return NextResponse.json({ preview });
  } catch (error) {
    return adminErrorResponse(error, locale);
  }
}
