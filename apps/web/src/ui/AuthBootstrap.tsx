"use client";

import { useEffect } from "react";
import { auth } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthBootstrap() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        auth.setAccessToken(data.session?.access_token ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        auth.clear();
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      auth.setAccessToken(session?.access_token ?? null);
      if (!session) {
        auth.setUser(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
