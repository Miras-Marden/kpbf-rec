"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeLocale } from "@/lib/i18n";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type RankingView = "active" | "all_time";

type Category = { id: string; slug: string; name: string };
type WeightRankingItem = {
  fighter: { id: string; slug: string; fullName: string; photoUrl?: string | null };
  rank: number;
  rating: number;
};

export default function RankingsByCategoryPage({ params }: { params: { locale: string } }) {
  const locale = normalizeLocale(params.locale);
  const [view, setView] = useState<RankingView>("active");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [items, setItems] = useState<WeightRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      try {
        const data = await apiFetch<{ items: Category[] }>({ path: "/public/rankings/categories" });
        if (!cancelled) {
          setCategories(data.items);
          setCategorySlug((prev) => prev || data.items[0]?.slug || "");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load categories");
        }
      }
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const rankingPath = useMemo(() => {
    if (!categorySlug) return null;
    return `/public/rankings/weight/${categorySlug}?view=${view}`;
  }, [categorySlug, view]);

  useEffect(() => {
    if (!rankingPath) return;
    const path = rankingPath;
    let cancelled = false;
    async function loadRankings() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ items: WeightRankingItem[] }>({ path });
        if (!cancelled) setItems(data.items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load rankings");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRankings();
    return () => {
      cancelled = true;
    };
  }, [rankingPath]);

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Rankings by weight category</div>
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
            href={`/${locale}/rankings/p4p`}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10"
          >
            P4P
          </Link>
          <Link
            href={`/${locale}/rankings/history`}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10"
          >
            History
          </Link>
        </div>
        <div className="mt-3">
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.slug} className="bg-[#0b1220]">
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? <LoadingState label="Loading rankings..." /> : null}
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
              <div className="truncate">{item.fighter.fullName}</div>
              <div className="text-right text-white/80">{item.rating.toFixed(1)}</div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
