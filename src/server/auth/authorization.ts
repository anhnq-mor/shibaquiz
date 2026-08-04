import "server-only";

import { cache } from "react";

import { AuthError } from "@/domain/auth/auth";
import { getAuthService } from "@/server/auth/runtime";
import { readSessionCookie } from "@/server/auth/session-cookie";

export const getCurrentUser = cache(async () =>
  getAuthService().currentUser(await readSessionCookie()),
);

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user)
    throw new AuthError("AUTH_REQUIRED", 401, "Authentication required");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("FORBIDDEN", 403, "Forbidden");
  return user;
}
