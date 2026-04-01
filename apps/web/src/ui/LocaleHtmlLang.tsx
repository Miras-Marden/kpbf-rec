"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { defaultLocale, supportedLocales, type Locale } from "@/lib/i18n";

/**
 * Keeps `<html lang>` in sync with the first path segment when routes live under `/[locale]/...`.
 * Root layout must not nest a second `<html>`; this updates `document.documentElement.lang` on the client.
 */
export function LocaleHtmlLang() {
  const pathname = usePathname();

  useEffect(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    const locale = supportedLocales.includes(seg as Locale) ? (seg as Locale) : defaultLocale;
    document.documentElement.lang = locale;
  }, [pathname]);

  return null;
}
