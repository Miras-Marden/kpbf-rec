"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeLocale } from "@/lib/i18n";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type RankingView = "active" | "all_time";
type P4PItem = {
  fighter: {
    id: string;
    slug: string;
    fullName: string;
    weightCategory?: { slug: string; name: string } | null;
  };
  rank: number;
  rating: number;
};

export default function P4PRankingsPage({ params }: { params: { locale: string } }) {
  const locale = normalizeLocale(params.locale);
  const [view, setView] = useState<RankingView>("active");
  const [items, setItems] = useState<P4PItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ items: P4PItem[] }>({
          path: `/public/rankings/p4p?view=${view}`
        });
        if (!cancelled) setItems(data.items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load P4P");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [view]);

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Pound-for-pound rankings</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("active")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${view === "active" ? "bg-brand-500 text-[#062034]" : "bg-white/5 text-white ring-1 ring-white/10"}`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setView("all_time")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${view === "all_time" ? "bg-brand-500 text-[#062034]" : "bg-white/5 text-white ring-1 ring-white/10"}`}
          >
            All-time
          </button>
          <Link
            href={`/${locale}/rankings`}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10"
          >
            By category
          </Link>
          <Link
            href={`/${locale}/rankings/history`}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10"
          >
            History
          </Link>
        </div>
      </section>

      {loading ? <LoadingState label="Loading P4P..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/3">
          <div className="grid grid-cols-[56px_1fr_96px] gap-2 border-b border-white/10 px-3 py-2 text-xs text-white/60">
            <div>Rank</div>
            <div>Fighter</div>
            <div className="text-right">Rating</div>
          </div>
          {items.map((item) => (
            <Link
              key={item.fighter.id}
              href={`/${locale}/fighters/${item.fighter.slug}`}
              className="grid grid-cols-[56px_1fr_96px] items-center gap-2 border-b border-white/5 px-3 py-3 text-sm"
            >
              <div className="font-semibold text-brand-200">#{item.rank}</div>
              <div className="truncate">
                {item.fighter.fullName}
                <span className="ml-2 text-xs text-white/50">
                  {item.fighter.weightCategory?.name ?? ""}
                </span>
              </div>
              <div className="text-right text-white/80">{item.rating.toFixed(1)}</div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
