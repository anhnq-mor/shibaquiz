import { NextResponse } from "next/server";

import { auditLogQuerySchema } from "@/domain/admin/audit";
import { requireAdmin } from "@/server/auth/authorization";
import { getAuditLogService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { authErrorResponse, requestLocale } from "@/server/http/auth-http";

export async function GET(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    await requireAdmin();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const query = auditLogQuerySchema.parse(params);
    const result = await getAuditLogService().list(query);
    return NextResponse.json(result);
  } catch (error) {
    return authErrorResponse(error, locale);
  }
}
