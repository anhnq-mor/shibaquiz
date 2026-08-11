import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { ImportError } from "@/domain/import/import";
import { requireAdmin } from "@/server/auth/authorization";
import { getImportService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { requestLocale } from "@/server/http/auth-http";
import { importErrorResponse } from "@/server/http/import-http";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    await requireAdmin();
    const { id } = entityIdSchema.parse(await context.params);
    const job = await getImportService().getJob(id);
    if (!job) throw new ImportError("NOT_FOUND", 404, "Import job not found");
    return NextResponse.json(job);
  } catch (error) {
    return importErrorResponse(error, locale);
  }
}
