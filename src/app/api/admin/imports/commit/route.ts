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
    const admin = await requireAdmin();
    const { buffer, format, examId } = await parseImportRequest(request);
    const result = await getImportService().commitImport(
      buffer,
      format,
      examId,
      admin.id,
    );
    return NextResponse.json(result);
  } catch (error) {
    return importErrorResponse(error, locale);
  }
}
