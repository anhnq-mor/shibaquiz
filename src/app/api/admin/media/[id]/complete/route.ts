import { NextResponse } from "next/server";

import { mediaIdParamSchema } from "@/domain/media/media";
import { requireAdmin } from "@/server/auth/authorization";
import { getMediaLibraryService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { assertTrustedOrigin, requestLocale } from "@/server/http/auth-http";
import { mediaErrorResponse } from "@/server/http/media-http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = mediaIdParamSchema.parse({ id: (await params).id });
    const asset = await getMediaLibraryService().completeUpload(id, admin.id);
    return NextResponse.json(asset);
  } catch (error) {
    return mediaErrorResponse(error, locale);
  }
}
