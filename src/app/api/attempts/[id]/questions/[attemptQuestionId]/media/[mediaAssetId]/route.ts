import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { requireUser } from "@/server/auth/authorization";
import { localeFromQuery } from "@/server/http/admin-http";
import { requestLocale } from "@/server/http/auth-http";
import { getMediaAccessService } from "@/server/content/runtime";
import { mediaErrorResponse } from "@/server/http/media-http";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      attemptQuestionId: string;
      mediaAssetId: string;
    }>;
  },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    const user = await requireUser();
    const { attemptQuestionId, mediaAssetId } = await params;
    entityIdSchema.parse({ id: attemptQuestionId });
    entityIdSchema.parse({ id: mediaAssetId });
    const access = await getMediaAccessService().getAttemptMediaAccessUrl(
      attemptQuestionId,
      mediaAssetId,
      user.id,
    );
    return NextResponse.json(access);
  } catch (error) {
    return mediaErrorResponse(error, locale);
  }
}
