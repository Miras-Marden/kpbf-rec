import { redirect } from "next/navigation";
import { defaultLocale } from "@/lib/i18n";

/**
 * All localized UI lives under `app/[locale]/...`.
 * Visiting `/` redirects to the default locale (see `defaultLocale` in `@/lib/i18n`).
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
