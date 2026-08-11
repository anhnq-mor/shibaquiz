import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { AdminUserError } from "@/domain/admin/users";
import { requireAdmin } from "@/server/auth/authorization";
import { getAuthService } from "@/server/auth/runtime";
import { getAdminUserService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { adminUserErrorResponse } from "@/server/http/admin-user-http";
import { assertTrustedOrigin, requestLocale } from "@/server/http/auth-http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    assertTrustedOrigin(request);
    const admin = await requireAdmin();
    const { id } = entityIdSchema.parse({ id: (await params).id });
    const target = await getAdminUserService().findById(id);
    if (!target) {
      throw new AdminUserError("NOT_FOUND", 404, "User not found");
    }
    await getAuthService().requestPasswordReset({
      email: target.email,
      locale,
    });
    await getAdminUserService().recordPasswordResetTriggered(id, admin.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminUserErrorResponse(error, locale);
  }
}
