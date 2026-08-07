import { NextResponse } from "next/server";

import { saveExamSchema } from "@/domain/admin/content";
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
    const admin = await requireAdmin();
    const input = await parseJson(request, saveExamSchema);
    const id = await getAdminContentService().saveExam(input, admin.id);
    return NextResponse.json({ id });
  } catch (error) {
    return adminErrorResponse(error, locale);
  }
}
