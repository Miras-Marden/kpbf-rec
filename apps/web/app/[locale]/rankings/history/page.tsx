"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeLocale } from "@/lib/i18n";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type Scope = "weight" | "p4p";
type View = "active" | "all_time";
type Category = { id: string; slug: string; name: string };
type Snapshot = {
  snapshotAt: string;
  items: Array<{
    fighter: { id: string; slug: string; fullName: string };
    rank: number;
    rating: number;
  }>;
};

export default function RankingsHistoryPage({ params }: { params: { locale: string } }) {
  const locale = normalizeLocale(params.locale);
  const [scope, setScope] = useState<Scope>("p4p");
  const [view, setView] = useState<View>("active");
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = await apiFetch<{ items: Category[] }>({ path: "/public/rankings/categories" });
        if (!cancelled) {
          setCategories(data.items);
          setCategorySlug((prev) => prev || data.items[0]?.slug || "");
        }
      } catch {
        if (!cancelled) setCategories([]);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const path = useMemo(() => {
    const u = new URLSearchParams();
    u.set("scope", scope);
    u.set("view", view);
    if (scope === "weight" && categorySlug) u.set("category", categorySlug);
    return `/public/rankings/history?${u.toString()}`;
  }, [scope, view, categorySlug]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ snapshots: Snapshot[] }>({ path });
        if (!cancelled) setSnapshots(data.snapshots);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load ranking history");
          setSnapshots([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Historical rankings</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScope("p4p")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${scope === "p4p" ? "bg-brand-500 text-[#062034]" : "bg-white/5 text-white ring-1 ring-white/10"}`}
          >
            P4P
          </button>
          <button
            type="button"
            onClick={() => setScope("weight")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${scope === "weight" ? "bg-brand-500 text-[#062034]" : "bg-white/5 text-white ring-1 ring-white/10"}`}
          >
            Weight
          </button>
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
        </div>
        {scope === "weight" ? (
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
        ) : null}
      </section>

      {loading ? <LoadingState label="Loading ranking history..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error && snapshots.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-white/70">
          No ranking snapshots yet.
        </div>
      ) : null}

      {!loading && !error && snapshots.length > 0
        ? snapshots.slice(0, 10).map((snap) => (
            <section key={snap.snapshotAt} className="rounded-2xl border border-white/10 bg-white/3 p-4">
              <div className="text-xs text-white/60">
                Snapshot {new Date(snap.snapshotAt).toLocaleString()}
              </div>
              <div className="mt-3 space-y-2">
                {snap.items.slice(0, 10).map((item) => (
                  <Link
                    key={`${snap.snapshotAt}-${item.fighter.id}`}
                    href={`/${locale}/fighters/${item.fighter.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
                  >
                    <div>
                      <span className="mr-2 font-semibold text-brand-200">#{item.rank}</span>
                      {item.fighter.fullName}
                    </div>
                    <div className="text-white/80">{item.rating.toFixed(1)}</div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        : null}
    </div>
  );
}
