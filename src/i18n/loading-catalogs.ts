import type { Locale } from "@/domain/common/locale";

export interface LoadingCatalog {
  missionPrimary: string;
  missionSecondary: string;
  donePrimary: string;
  doneSecondary: string;
}

const catalogs: Record<Locale, LoadingCatalog> = {
  vi: {
    missionPrimary: "Shiba nhận nhiệm vụ rồi! 🐕💨",
    missionSecondary: "Shiba got the mission!",
    donePrimary: "Xong rồi nè! 🐾",
    doneSecondary: "All done!",
  },
  en: {
    missionPrimary: "Shiba got the mission! 🐕💨",
    missionSecondary: "Shiba nhận nhiệm vụ rồi!",
    donePrimary: "All done! 🐾",
    doneSecondary: "Xong rồi nè!",
  },
};

export function getLoadingMessages(locale: Locale): LoadingCatalog {
  return catalogs[locale];
}
