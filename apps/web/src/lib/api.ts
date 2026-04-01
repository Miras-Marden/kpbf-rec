export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

import { auth, getLoginHref } from "./auth";

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function shouldAttemptRefresh(path: string) {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("/public/")) return false;
  if (path.startsWith("/health")) return false;
  if (path.startsWith("/auth/login")) return false;
  if (path.startsWith("/auth/register")) return false;
  if (path.startsWith("/auth/refresh")) return false;
  if (path.startsWith("/auth/logout")) return false;
  return true;
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

  const initialToken = auth.getState().accessToken;
  let res = await attempt(initialToken);

  if (res.status === 401 && shouldAttemptRefresh(path)) {
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    if (refreshRes.ok) {
      const data = (await refreshRes.json()) as { accessToken?: string };
      const nextToken = data.accessToken ?? null;
      auth.setAccessToken(nextToken);
      if (nextToken) res = await attempt(nextToken);
    } else {
      auth.clear();
      if (typeof window !== "undefined") {
        const locale = window.location.pathname.split("/")[1] || "en";
        window.location.href = getLoginHref({
          locale,
          nextPath: window.location.pathname + window.location.search
        });
      }
    }
  }

  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }

  return res.json() as Promise<T>;
}

