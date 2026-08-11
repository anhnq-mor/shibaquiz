import { NextResponse } from "next/server";

import { mediaLibraryQuerySchema } from "@/domain/media/media";
import { requireAdmin } from "@/server/auth/authorization";
import { getMediaLibraryService } from "@/server/content/runtime";
import { mediaErrorResponse } from "@/server/http/media-http";
import { requestLocale } from "@/server/http/auth-http";
import { localeFromQuery } from "@/server/http/admin-http";

export async function GET(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    await requireAdmin();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const query = mediaLibraryQuerySchema.parse(params);
    const result = await getMediaLibraryService().listLibrary(query);
    return NextResponse.json(result);
  } catch (error) {
    return mediaErrorResponse(error, locale);
  }
}
