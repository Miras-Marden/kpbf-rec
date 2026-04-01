import type { ReactNode } from "react";
import { defaultLocale, supportedLocales } from "@/lib/i18n";
import { MobileShell } from "@/ui/MobileShell";
import { AuthBootstrap } from "@/ui/AuthBootstrap";
import { LocaleHtmlLang } from "@/ui/LocaleHtmlLang";

export default function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const locale = supportedLocales.includes(params.locale as (typeof supportedLocales)[number])
    ? params.locale
    : defaultLocale;

  // Nested `<html>` / `<body>` here breaks App Router (only root `app/layout.tsx` may define them).
  return (
    <>
      <LocaleHtmlLang />
      <AuthBootstrap />
      <MobileShell locale={locale}>{children}</MobileShell>
    </>
  );
}

