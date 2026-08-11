import { NextResponse } from "next/server";

import { requireAdmin } from "@/server/auth/authorization";
import { getImportService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { authErrorResponse, requestLocale } from "@/server/http/auth-http";

export async function GET(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isInteger(requestedLimit) ? requestedLimit : 50;
    const jobs = await getImportService().listJobs(limit);
    return NextResponse.json({ jobs });
  } catch (error) {
    return authErrorResponse(error, locale);
  }
}
