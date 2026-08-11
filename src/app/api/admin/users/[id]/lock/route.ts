import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { setUserLockSchema } from "@/domain/admin/users";
import { requireAdmin } from "@/server/auth/authorization";
import { getAdminUserService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { adminUserErrorResponse } from "@/server/http/admin-user-http";
import {
  assertTrustedOrigin,
  parseJson,
  requestLocale,
} from "@/server/http/auth-http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = entityIdSchema.parse({ id: (await params).id });
    const input = await parseJson(request, setUserLockSchema);
    await getAdminUserService().setLocked(id, input.locked, admin.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminUserErrorResponse(error, locale);
  }
}
