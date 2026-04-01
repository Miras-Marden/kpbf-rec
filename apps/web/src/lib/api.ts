export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

import { auth, getLoginHref } from "./auth";
import { getSupabaseBrowserClient } from "./supabase/browser";

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function getBearerToken() {
  const inMemory = auth.getState().accessToken;
  if (inMemory) return inMemory;
  if (typeof window === "undefined") return null;
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  auth.setAccessToken(token);
  return token;
}

export async function apiFetch<T>({
  path,
  method = "GET",
  body
}: {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}): Promise<T> {
  const attempt = async (accessToken: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined
    });
  };

  const initialToken = await getBearerToken();
  let res = await attempt(initialToken);

  if (res.status === 401) {
    auth.clear();
    if (typeof window !== "undefined") {
      const locale = window.location.pathname.split("/")[1] || "en";
      window.location.href = getLoginHref({
        locale,
        nextPath: window.location.pathname + window.location.search
      });
    }
  }

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }

  return res.json() as Promise<T>;
}

