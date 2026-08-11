import { notFound } from "next/navigation";

import { MediaLibrary } from "@/components/admin/media-library";
import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import { getMediaLibraryService } from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getAdminMessages(locale);
  const page = await getMediaLibraryService().listLibrary({ limit: 30 });

  return (
    <>
      <div className="admin-page-header">
        <h1>{messages.media.title}</h1>
        <p>{messages.media.description}</p>
      </div>
      <MediaLibrary
        locale={locale}
        messages={messages}
        initialItems={page.items}
        initialCursor={page.nextCursor}
      />
    </>
  );
}
