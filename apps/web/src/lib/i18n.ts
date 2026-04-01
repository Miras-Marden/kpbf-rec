export const supportedLocales = ["ru", "kz", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export function normalizeLocale(locale: string | undefined | null): Locale {
  if (!locale) return "en";
  const hit = supportedLocales.find((l) => l === locale);
  return hit ?? "en";
}

