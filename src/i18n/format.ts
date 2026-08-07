import type { Locale } from "@/domain/common/locale";

const localeTags: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en-US",
};

export function formatDateTime(
  value: Date | string | number,
  locale: Locale,
  timeZone = "UTC",
): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTags[locale]).format(value);
}

export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTags[locale], {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value);
}
