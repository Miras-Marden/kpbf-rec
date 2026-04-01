"use client";

import { isApiConfigured } from "@/lib/api";

/**
 * Shown when the optional Nest API is not configured (Supabase-only mode).
 */
export function ApiOfflineBanner() {
  if (isApiConfigured()) return null;
  return (
    <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
      Live data API is not configured. Set <code className="rounded bg-black/20 px-1">NEXT_PUBLIC_API_URL</code> to load
      fighters, events, rankings, and admin data. Auth uses Supabase only.
    </div>
  );
}
