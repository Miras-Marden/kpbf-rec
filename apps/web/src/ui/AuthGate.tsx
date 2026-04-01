"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { useAuth } from "@/lib/useAuth";
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
  const a = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    // Wait for global bootstrap (AuthBootstrap) instead of bootstrapping here.
    if (a.bootstrapStatus !== "ready") {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    const ok = !!a.user;
    if (!ok) {
      auth.clear();
      if (!cancelled) {
        router.replace(`/${normalizeLocale(locale)}/login?next=${encodeURIComponent(pathname ?? "/")}`);
      }
      return () => {
        cancelled = true;
      };
    }

    setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [a.bootstrapStatus, a.user, locale, pathname, router]);

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

