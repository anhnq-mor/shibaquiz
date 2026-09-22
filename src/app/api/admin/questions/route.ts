import { NextResponse } from "next/server";

import {
  adminQuestionListQuerySchema,
  saveQuestionSchema,
} from "@/domain/admin/content";
import { requireAdmin } from "@/server/auth/authorization";
import { getAdminContentService } from "@/server/content/runtime";
import { adminErrorResponse, localeFromQuery } from "@/server/http/admin-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";

export async function GET(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    await requireAdmin();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const query = adminQuestionListQuerySchema.parse(params);
    const result = await getAdminContentService().listQuestions(query);
    return NextResponse.json(result);
  } catch (error) {
    return adminErrorResponse(error, locale);
  }
}

export async function POST(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const input = await parseJson(request, saveQuestionSchema);
    const id = await getAdminContentService().saveQuestion(input, admin.id);
    return NextResponse.json({ id });
  } catch (error) {
    return adminErrorResponse(error, locale);
  }
}
