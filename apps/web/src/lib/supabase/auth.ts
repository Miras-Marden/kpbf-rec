"use client";

import { auth } from "@/lib/auth";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { getSupabaseBrowserClient } from "./browser";

async function syncSupabaseIdentity(accessToken: string) {
  const res = await fetch(`${API_BASE_URL}/auth/supabase/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    credentials: "include"
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase sync failed: ${res.status} ${text}`);
  }
}

type CanonicalMe = { sub: string; email: string; roles: string[] };

let bootstrapPromise: Promise<CanonicalMe | null> | null = null;

function isAuthFailure(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("jwt");
}

/**
 * Canonical bootstrap flow for the entire web app.
 *
 * - Reads current Supabase session
 * - If session exists: /auth/supabase/sync -> /auth/me and stores canonical identity/roles
 * - If no session: clears auth state
 *
 * Single-flight (deduped) to avoid double sync/me calls during initial load.
 */
export async function bootstrapAuthSession(opts?: { force?: boolean }) {
  if (!opts?.force && bootstrapPromise) return bootstrapPromise;

  auth.setBootstrapStatus("bootstrapping");

  bootstrapPromise = (async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token ?? null;

    if (!accessToken) {
      auth.clear();
      return null;
    }

    auth.setAccessToken(accessToken);

    try {
      await syncSupabaseIdentity(accessToken);
      const me = await apiFetch<CanonicalMe>({ path: "/auth/me" });
      auth.setUser(me);
      auth.setBootstrapStatus("ready");
      return me;
    } catch (e) {
      // If the backend rejects the token, treat as invalid session and clear.
      if (isAuthFailure(e)) {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        auth.clear();
        return null;
      }
      // Non-auth failures should still end bootstrapping so the app doesn't hang.
      auth.setBootstrapStatus("ready");
      throw e;
    }
  })();

  try {
    return await bootstrapPromise;
  } finally {
    // Allow a future forced re-bootstrap (e.g. after sign-in) while preventing initial-load duplication.
    auth.setBootstrapStatus("ready");
  }
}

export function getCurrentBearerToken() {
  return auth.getState().accessToken;
}

// Back-compat alias for callers that expect this name.
export async function bootstrapCanonicalIdentity() {
  return bootstrapAuthSession({ force: true });
}

export async function signInWithSupabase(params: { email: string; password: string }) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password
  });
  if (error) throw new Error(error.message);
  return bootstrapAuthSession({ force: true });
}

export async function signUpWithSupabase(params: {
  email: string;
  password: string;
  displayName?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: params.displayName
      ? {
          data: {
            display_name: params.displayName
          }
        }
      : undefined
  });
  if (error) throw new Error(error.message);
  if (!data.session) {
    throw new Error("Registration created. Confirm your email before signing in.");
  }
  return bootstrapAuthSession({ force: true });
}

export async function signOutSupabase() {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
  auth.clear();
}
