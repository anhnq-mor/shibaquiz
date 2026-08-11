import { NextResponse } from "next/server";

import {
  mediaIdParamSchema,
  updateMediaTranslationsSchema,
} from "@/domain/media/media";
import { requireAdmin } from "@/server/auth/authorization";
import { getMediaLibraryService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";
import { mediaErrorResponse } from "@/server/http/media-http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    await requireAdmin();
    const { id } = mediaIdParamSchema.parse({ id: (await params).id });
    const input = await parseJson(request, updateMediaTranslationsSchema);
    const asset = await getMediaLibraryService().updateTranslations(id, input);
    return NextResponse.json(asset);
  } catch (error) {
    return mediaErrorResponse(error, locale);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    await requireAdmin();
    const { id } = mediaIdParamSchema.parse({ id: (await params).id });
    await getMediaLibraryService().deleteAsset(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return mediaErrorResponse(error, locale);
  }
}
