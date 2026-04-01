export const supportedLocales = ["ru", "kz", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

/** Default locale for `/` redirect and invalid `[locale]` segments */
export const defaultLocale: Locale = "ru";

export function normalizeLocale(locale: string | undefined | null): Locale {
  if (!locale) return defaultLocale;
  const hit = supportedLocales.find((l) => l === locale);
  return hit ?? defaultLocale;
}

