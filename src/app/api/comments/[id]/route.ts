import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { updateCommentSchema } from "@/domain/comments/comments";
import { requireUser } from "@/server/auth/authorization";
import { getCommentService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";
import { commentErrorResponse } from "@/server/http/comment-http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { id } = entityIdSchema.parse({ id: (await params).id });
    const input = await parseJson(request, updateCommentSchema);
    const comment = await getCommentService().updateOwnContent(
      id,
      user.id,
      input.content,
    );
    return NextResponse.json(comment);
  } catch (error) {
    return commentErrorResponse(error, locale);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { id } = entityIdSchema.parse({ id: (await params).id });
    await getCommentService().softDeleteOwn(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return commentErrorResponse(error, locale);
  }
}
