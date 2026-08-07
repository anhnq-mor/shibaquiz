import { NextResponse } from "next/server";
import { z } from "zod";

import { AdminContentError, entityIdSchema } from "@/domain/admin/content";
import { locales } from "@/domain/common/locale";
import { requireAdmin } from "@/server/auth/authorization";
import { getContentTranslationService } from "@/server/content/runtime";
import { adminErrorResponse, localeFromQuery } from "@/server/http/admin-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";

const enableLocaleSchema = z.object({ locale: z.enum(locales) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    await requireAdmin();
    const { id } = entityIdSchema.parse({ id: (await params).id });
    const input = await parseJson(request, enableLocaleSchema);
    const result = await getContentTranslationService().enableExamLocale(
      id,
      input.locale,
    );
    if (result.status === "EXAM_NOT_FOUND") {
      throw new AdminContentError("NOT_FOUND", 404, "Exam not found");
    }
    return NextResponse.json(result);
  } catch (error) {
    return adminErrorResponse(error, locale);
  }
}
