import { auth, getLoginHref } from "./auth";
import { getCurrentBearerToken } from "./supabase/auth";

/** Backend API base URL. Empty = optional API not configured (Supabase-only mode). */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
}

export function isApiConfigured(): boolean {
  return Boolean(getApiBaseUrl());
}

export class ApiNotConfiguredError extends Error {
  constructor() {
    super("NEXT_PUBLIC_API_URL is not set");
    this.name = "ApiNotConfiguredError";
  }
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function getBearerToken() {
  const inMemory = getCurrentBearerToken() ?? auth.getState().accessToken;
  return inMemory ?? null;
}

/**
 * JSON fetch to optional backend API. Requires `NEXT_PUBLIC_API_URL` at runtime.
 * In Supabase-only deployments, use `isApiConfigured()` and skip calling this.
 */
export async function apiFetch<T>({
  path,
  method = "GET",
  body
}: {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiNotConfiguredError();
  }

  const attempt = async (accessToken: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    return fetch(`${base}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined
    });
  };

  const initialToken = await getBearerToken();
  const res = await attempt(initialToken);

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
