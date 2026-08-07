import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { requireAdmin } from "@/server/auth/authorization";
import { getAdminContentService } from "@/server/content/runtime";
import { adminErrorResponse, localeFromQuery } from "@/server/http/admin-http";
import { assertTrustedOrigin, requestLocale } from "@/server/http/auth-http";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = entityIdSchema.parse({ id: (await params).id });
    await getAdminContentService().deleteQuestion(id, admin.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error, locale);
  }
}
