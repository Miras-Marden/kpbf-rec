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

export async function bootstrapCanonicalIdentity() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token ?? null;
  if (!accessToken) {
    auth.clear();
    throw new Error("No active session");
  }
  auth.setAccessToken(accessToken);
  await syncSupabaseIdentity(accessToken);
  const me = await apiFetch<{ sub: string; email: string; roles: string[] }>({ path: "/auth/me" });
  auth.setUser(me);
  return me;
}

export async function signInWithSupabase(params: { email: string; password: string }) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password
  });
  if (error) throw new Error(error.message);
  return bootstrapCanonicalIdentity();
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
  return bootstrapCanonicalIdentity();
}

export async function signOutSupabase() {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
  auth.clear();
}
