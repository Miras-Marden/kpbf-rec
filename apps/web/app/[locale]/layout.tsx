import type { ReactNode } from "react";
import { supportedLocales } from "@/lib/i18n";
import { MobileShell } from "@/ui/MobileShell";
import { AuthBootstrap } from "@/ui/AuthBootstrap";

export default function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const locale = supportedLocales.includes(params.locale as any)
    ? params.locale
    : "en";

  return (
    <html lang={locale}>
      <body>
        <AuthBootstrap />
        <MobileShell locale={locale}>{children}</MobileShell>
      </body>
    </html>
  );
}

