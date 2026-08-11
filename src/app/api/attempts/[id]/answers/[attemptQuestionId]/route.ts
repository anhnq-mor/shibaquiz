import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { saveAnswerSchema } from "@/domain/attempts/attempt";
import { requireUser } from "@/server/auth/authorization";
import { getAttemptService } from "@/server/content/runtime";
import { attemptErrorResponse } from "@/server/http/attempt-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";
import { localeFromQuery } from "@/server/http/admin-http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; attemptQuestionId: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const user = await requireUser();
    const { id, attemptQuestionId } = await params;
    entityIdSchema.parse({ id });
    entityIdSchema.parse({ id: attemptQuestionId });
    const input = await parseJson(request, saveAnswerSchema);
    const result = await getAttemptService().saveAnswer(
      id,
      attemptQuestionId,
      user.id,
      input,
    );
    return NextResponse.json(result);
  } catch (error) {
    return attemptErrorResponse(error, locale);
  }
}
