"use client";

import { UsersManager as BaseUsersManager } from "@shibaquiz/admin-platform/components/users-manager";

import { adminApiRequest } from "@/components/admin/admin-api";
import type { AdminUserSummary } from "@/domain/admin/users";
import type { Locale } from "@/domain/common/locale";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

export function UsersManager({
  locale,
  messages,
  initialItems,
  initialCursor,
  currentUserId,
}: {
  locale: Locale;
  messages: AdminCatalog;
  initialItems: AdminUserSummary[];
  initialCursor: string | null;
  currentUserId: string;
}) {
  return (
    <BaseUsersManager
      locale={locale}
      messages={{
        common: messages.common,
        users: { ...messages.users, loadingMore: messages.media.processing },
      }}
      initialItems={initialItems}
      initialCursor={initialCursor}
      currentUserId={currentUserId}
      request={adminApiRequest}
    />
  );
}
