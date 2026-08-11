import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { moderateCommentSchema } from "@/domain/comments/comments";
import { requireAdmin } from "@/server/auth/authorization";
import { getCommentService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";
import { commentErrorResponse } from "@/server/http/comment-http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = entityIdSchema.parse({ id: (await params).id });
    const input = await parseJson(request, moderateCommentSchema);
    await getCommentService().moderate(id, admin.id, input.reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return commentErrorResponse(error, locale);
  }
}
