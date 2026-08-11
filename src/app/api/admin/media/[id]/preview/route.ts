import { NextResponse } from "next/server";

import { mediaIdParamSchema } from "@/domain/media/media";
import { requireAdmin } from "@/server/auth/authorization";
import { getMediaLibraryService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { requestLocale } from "@/server/http/auth-http";
import { mediaErrorResponse } from "@/server/http/media-http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    await requireAdmin();
    const { id } = mediaIdParamSchema.parse({ id: (await params).id });
    const preview = await getMediaLibraryService().getPreviewUrl(id);
    return NextResponse.json(preview);
  } catch (error) {
    return mediaErrorResponse(error, locale);
  }
}
