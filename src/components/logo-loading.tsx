import { BrandMark } from "@/components/brand-mark";
import type { Locale } from "@/domain/common/locale";
import { getLoadingMessages } from "@/i18n/loading-catalogs";

export function LogoLoading({ locale }: { locale: Locale }) {
  const messages = getLoadingMessages(locale);

  return (
    <div className="logo-loading">
      <span className="logo-loading-mark" aria-hidden="true">
        <BrandMark />
      </span>
      <span className="sr-only">{messages.loading}</span>
    </div>
  );
}
