import { notFound } from "next/navigation";

import { UsersManager } from "@/components/admin/users-manager";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import { getAdminUserService } from "@/server/content/runtime";
import { requireAdmin } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getAdminMessages(locale);
  const currentAdmin = await requireAdmin();
  const page = await getAdminUserService().listUsers({ limit: 30 });

  return (
    <>
      <div className="admin-page-header">
        <h1>{messages.users.title}</h1>
        <p>{messages.users.description}</p>
      </div>
      <UsersManager
        locale={locale}
        messages={messages}
        initialItems={page.items}
        initialCursor={page.nextCursor}
        currentUserId={currentAdmin.id}
      />
    </>
  );
}
