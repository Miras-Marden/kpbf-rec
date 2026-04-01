"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeLocale } from "@/lib/i18n";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type FightSummary = {
  id: string;
  date: string;
  fighterA: { slug: string; fullName: string };
  fighterB: { slug: string; fullName: string };
  event?: { slug: string; name: string } | null;
  weightCategory?: { name: string } | null;
  result: string;
  method: string;
};

export default function FightsListPage({ params }: { params: { locale: string } }) {
  const locale = normalizeLocale(params.locale);
  const [items, setItems] = useState<FightSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ items: FightSummary[] }>({
          path: "/public/fights?take=50"
        });
        if (!cancelled) setItems(data.items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Fights</div>
        <p className="mt-2 text-sm text-white/70">
          Latest published bouts.
        </p>
      </section>

      {loading ? <LoadingState label="Loading fights..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-white/70">
          No fights yet.
        </div>
      ) : null}

      <div className="space-y-3 pb-24">
        {items.map((f) => (
          <Link
            key={f.id}
            href={`/${locale}/fights/${f.id}`}
            className="block rounded-2xl border border-white/10 bg-white/2 p-4 ring-1 ring-white/5"
          >
            <div className="text-sm font-semibold">
              {f.fighterA.fullName} vs {f.fighterB.fullName}
            </div>
            <div className="mt-1 text-xs text-white/60">
              {new Date(f.date).toLocaleDateString()} • {f.method} • {f.result}
            </div>
            <div className="mt-2 text-xs text-white/60">
              {f.event ? `Event: ${f.event.name}` : "No event"}
              {f.weightCategory?.name ? ` • ${f.weightCategory.name}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

