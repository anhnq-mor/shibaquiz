import { NextResponse } from "next/server";

import { createUploadSchema } from "@/domain/media/media";
import { requireAdmin } from "@/server/auth/authorization";
import { getMediaLibraryService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";
import { mediaErrorResponse } from "@/server/http/media-http";

export async function POST(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const input = await parseJson(request, createUploadSchema);
    const result = await getMediaLibraryService().createUpload(input, admin.id);
    return NextResponse.json(result);
  } catch (error) {
    return mediaErrorResponse(error, locale);
  }
}
