import { NextResponse } from "next/server";

import { commentListQuerySchema, createCommentSchema } from "@/domain/comments/comments";
import { requireUser } from "@/server/auth/authorization";
import { getCommentService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";
import { commentErrorResponse } from "@/server/http/comment-http";

export async function GET(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    await requireUser();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const query = commentListQuerySchema.parse(params);
    const result = await getCommentService().listForQuestion(query);
    return NextResponse.json(result);
  } catch (error) {
    return commentErrorResponse(error, locale);
  }
}

export async function POST(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const input = await parseJson(request, createCommentSchema);
    const comment = await getCommentService().postComment(input, user.id);
    return NextResponse.json(comment);
  } catch (error) {
    return commentErrorResponse(error, locale);
  }
}
