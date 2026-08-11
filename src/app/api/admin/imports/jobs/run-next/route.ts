import { after, NextResponse } from "next/server";

import { requireAdmin } from "@/server/auth/authorization";
import { getImportService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { assertTrustedOrigin, requestLocale } from "@/server/http/auth-http";
import { importErrorResponse } from "@/server/http/import-http";

export const maxDuration = 300;

export async function POST(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    await requireAdmin();
    const service = getImportService();
    after(() => service.processNextJob());
    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error) {
    return importErrorResponse(error, locale);
  }
}
