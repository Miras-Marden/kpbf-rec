"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { auth } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { ErrorBanner } from "@/ui/ErrorBanner";

export default function RegisterPage({ params }: { params: { locale: string } }) {
  const locale = normalizeLocale(params.locale);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || `/${locale}/admin`;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.getState().accessToken) {
      router.replace(next);
    }
  }, [next, router]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch({
        path: "/auth/register",
        method: "POST",
        body: { email, password, displayName: displayName || undefined }
      });
      const data = await apiFetch<{ accessToken: string }>({
        path: "/auth/login",
        method: "POST",
        body: { email, password }
      });
      auth.setAccessToken(data.accessToken);
      const me = await apiFetch<{ sub: string; email: string; roles: string[] }>({ path: "/auth/me" });
      auth.setUser(me);
      router.replace(next);
    } catch (e) {
      auth.clear();
      setError(e instanceof Error ? e.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Register</div>
        <p className="mt-2 text-sm text-white/70">Create an account.</p>
      </section>

      {error ? <ErrorBanner message={error} /> : null}

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name (optional)"
          autoComplete="name"
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
        />
        <button
          type="button"
          onClick={() => submit()}
          disabled={busy || !email.trim() || !password.trim()}
          className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-[#062034] disabled:opacity-50"
        >
          {busy ? "Creating..." : "Create account"}
        </button>
        <div className="text-xs text-white/60">
          Already have an account?{" "}
          <Link className="text-white underline" href={`/${locale}/login?next=${encodeURIComponent(next)}`}>
            Login
          </Link>
        </div>
      </section>
    </div>
  );
}

