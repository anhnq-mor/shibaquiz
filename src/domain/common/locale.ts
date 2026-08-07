export const locales = ["vi", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "vi";
export const localePreferenceCookieName = "shibaquiz_locale";

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

function localeFromLanguageTag(value: string): Locale | undefined {
  const primaryLanguage = value.trim().toLowerCase().split("-")[0];
  return primaryLanguage && isLocale(primaryLanguage)
    ? primaryLanguage
    : undefined;
}

export function localeFromAcceptLanguage(
  header: string | null | undefined,
): Locale | undefined {
  if (!header) return undefined;
  return header
    .split(",")
    .map((entry, index) => {
      const [languageTag = "", ...parameters] = entry.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      const parsedQuality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;
      return {
        locale: localeFromLanguageTag(languageTag),
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
        index,
      };
    })
    .filter(
      (
        candidate,
      ): candidate is {
        locale: Locale;
        quality: number;
        index: number;
      } => candidate.locale !== undefined && candidate.quality > 0,
    )
    .sort(
      (left, right) => right.quality - left.quality || left.index - right.index,
    )[0]?.locale;
}

export function resolveLocale(input: {
  profileLocale?: string | null | undefined;
  cookieLocale?: string | null | undefined;
  acceptLanguage?: string | null | undefined;
}): Locale {
  if (input.profileLocale && isLocale(input.profileLocale))
    return input.profileLocale;
  if (input.cookieLocale && isLocale(input.cookieLocale))
    return input.cookieLocale;
  return localeFromAcceptLanguage(input.acceptLanguage) ?? defaultLocale;
}

export function localizedPathname(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  if (segments[1] && isLocale(segments[1])) {
    segments[1] = locale;
    return segments.join("/") || `/${locale}`;
  }
  return `/${locale}${pathname === "/" ? "" : pathname}`;
}
