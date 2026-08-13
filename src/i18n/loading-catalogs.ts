import type { Locale } from "@/domain/common/locale";

export interface LoadingCatalog {
  mission: string;
  done: string;
  loading: string;
}

const catalogs: Record<Locale, LoadingCatalog> = {
  vi: {
    mission: "Shiba nhận nhiệm vụ rồi!",
    done: "Xong rồi nè! 🐾",
    loading: "Đang tải…",
  },
  en: {
    mission: "Shiba got the mission!",
    done: "All done! 🐾",
    loading: "Loading…",
  },
};

export function getLoadingMessages(locale: Locale): LoadingCatalog {
  return catalogs[locale];
}
