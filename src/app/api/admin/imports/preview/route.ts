import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/auth/authorization";
import { getImportService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { assertTrustedOrigin, requestLocale } from "@/server/http/auth-http";
import {
  importErrorResponse,
  parseImportRequest,
} from "@/server/http/import-http";

export async function POST(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    await requireAdmin();
    const { buffer, format, examId } = await parseImportRequest(request);
    const summary = await getImportService().previewImport(
      buffer,
      format,
      examId,
    );
    return NextResponse.json(summary);
  } catch (error) {
    return importErrorResponse(error, locale);
  }
}
