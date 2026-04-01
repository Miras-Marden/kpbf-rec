"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { auth } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { LoadingState } from "./LoadingState";
import { ErrorBanner } from "./ErrorBanner";

export function RequireAuth({
  locale,
  children
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);

      const token = auth.getState().accessToken;
      if (!token) {
        if (!cancelled) router.replace(`/${normalizeLocale(locale)}/login?next=${encodeURIComponent(pathname ?? "/")}`);
        return;
      }

      try {
        const me = await apiFetch<{ sub: string; email: string; roles: string[] }>({
          path: "/auth/me"
        });
        auth.setUser(me);
      } catch (e) {
        auth.clear();
        if (!cancelled) {
          router.replace(`/${normalizeLocale(locale)}/login?next=${encodeURIComponent(pathname ?? "/")}`);
        }
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run().catch((e) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : "Failed");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locale, pathname, router]);

  if (loading) return <LoadingState label="Checking session..." />;
  if (error) return <ErrorBanner message={error} />;
  return <>{children}</>;
}

export function RequireRole({
  allow,
  children
}: {
  allow: string[];
  children: React.ReactNode;
}) {
  const user = auth.getState().user;
  const ok = !!user && user.roles.some((r) => allow.includes(r));
  if (!ok) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-white/70">
        Access denied. Required role: {allow.join(" / ")}.
      </div>
    );
  }
  return <>{children}</>;
}

