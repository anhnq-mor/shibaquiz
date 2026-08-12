import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { requireAdmin } from "@/server/auth/authorization";
import { getImportService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { assertTrustedOrigin, requestLocale } from "@/server/http/auth-http";
import { importErrorResponse } from "@/server/http/import-http";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = entityIdSchema.parse(await context.params);
    const service = getImportService();
    const job = await service.requestCancel(id, admin.id);
    return NextResponse.json(job);
  } catch (error) {
    return importErrorResponse(error, locale);
  }
}
