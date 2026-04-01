"use client";

import { useEffect } from "react";
import { auth } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { bootstrapAuthSession } from "@/lib/supabase/auth";

export function AuthBootstrap() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    // Canonical app bootstrap: sync/provision + load /auth/me if session exists.
    bootstrapAuthSession().catch(() => {
      // Errors are handled inside bootstrap; keep this as a final safety net.
      if (!mounted) return;
      auth.clear();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      auth.setAccessToken(session?.access_token ?? null);
      if (!session) {
        auth.setUser(null);
        auth.setBootstrapStatus("ready");
        return;
      }
      // If session exists (sign-in / refresh) and canonical identity isn't loaded yet,
      // kick a deduped bootstrap. Single-flight prevents initial load duplication.
      if (!auth.getState().user) {
        bootstrapAuthSession({ force: true }).catch(() => {
          auth.clear();
        });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
