import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function getSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // no-op in read-only server contexts
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {
            // no-op in read-only server contexts
          }
        }
      }
    }
  );
}
