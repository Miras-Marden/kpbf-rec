"use client";

import type { User } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";
import { getSupabaseBrowserClient } from "./browser";

type CanonicalMe = { sub: string; email: string; roles: string[] };

let bootstrapPromise: Promise<CanonicalMe | null> | null = null;

function rolesFromSupabaseUser(user: User): string[] {
  const app = user.app_metadata as Record<string, unknown> | null | undefined;
  const meta = user.user_metadata as Record<string, unknown> | null | undefined;
  const r = app?.roles ?? meta?.roles;
  if (Array.isArray(r) && r.every((x): x is string => typeof x === "string")) {
    return r;
  }
  return [];
}

function authUserFromSupabaseUser(user: User): CanonicalMe {
  return {
    sub: user.id,
    email: user.email ?? "",
    roles: rolesFromSupabaseUser(user)
  };
}

/**
 * Canonical bootstrap: Supabase session only (no Nest API required).
 * Roles may come from `app_metadata.roles` / `user_metadata.roles` as string[] if you set them in Supabase.
 */
export async function bootstrapAuthSession(opts?: { force?: boolean }) {
  if (!opts?.force && bootstrapPromise) return bootstrapPromise;

  auth.setBootstrapStatus("bootstrapping");

  bootstrapPromise = (async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const accessToken = session?.access_token ?? null;

    if (!accessToken || !session?.user) {
      auth.clear();
      return null;
    }

    auth.setAccessToken(accessToken);
    const me = authUserFromSupabaseUser(session.user);
    auth.setUser(me);
    auth.setBootstrapStatus("ready");
    return me;
  })();

  try {
    return await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
    auth.setBootstrapStatus("ready");
  }
}

export function getCurrentBearerToken() {
  return auth.getState().accessToken;
}

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
