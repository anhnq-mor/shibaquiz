import { NextResponse } from "next/server";

import { userListQuerySchema } from "@/domain/admin/users";
import { requireAdmin } from "@/server/auth/authorization";
import { getAdminUserService } from "@/server/content/runtime";
import { localeFromQuery } from "@/server/http/admin-http";
import { adminUserErrorResponse } from "@/server/http/admin-user-http";
import { requestLocale } from "@/server/http/auth-http";

export async function GET(request: Request) {
  const locale = requestLocale(request, localeFromQuery(request));
  try {
    await requireAdmin();
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const query = userListQuerySchema.parse(params);
    const result = await getAdminUserService().listUsers(query);
    return NextResponse.json(result);
  } catch (error) {
    return adminUserErrorResponse(error, locale);
  }
}
