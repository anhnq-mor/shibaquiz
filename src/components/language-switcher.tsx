import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Locale } from "@/domain/common/locale";
import type { MessageCatalog } from "@/i18n/catalogs";

export function LanguageSwitcher({
  locale,
  messages,
}: {
  locale: Locale;
  messages: MessageCatalog;
}) {
  return (
    <LocaleSwitcher
      className="language-switcher"
      locale={locale}
      navigationLabel={messages.a11y.languageNavigation}
      vietnameseLabel={messages.navigation.switchToVietnamese}
      englishLabel={messages.navigation.switchToEnglish}
    />
  );
}
