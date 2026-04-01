export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

import { auth, getLoginHref } from "./auth";
import { getCurrentBearerToken } from "./supabase/auth";

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function getBearerToken() {
  // Centralized token source: AuthBootstrap -> auth state.
  // Avoid calling supabase.auth.getSession() inside the API client.
  const inMemory = getCurrentBearerToken() ?? auth.getState().accessToken;
  return inMemory ?? null;
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

