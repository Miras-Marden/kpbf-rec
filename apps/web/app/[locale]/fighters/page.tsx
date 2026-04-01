"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, isApiConfigured } from "@/lib/api";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";
import { normalizeLocale } from "@/lib/i18n";
import { AnimatePresence } from "framer-motion";
import { RevealItem, RevealList } from "@/ui/motion/Reveal";

type FighterSummary = {
  id: string;
  slug: string;
  fullName: string;
  photoUrl?: string | null;
  nationality?: string | null;
  regionCity?: string | null;
  weightCategory?: { slug: string; name: string } | null;
  record?: { wins: number; losses: number; draws: number; nc: number } | null;
};

export default function FightersListPage({
  params
}: {
  params: { locale: string };
}) {
  const locale = normalizeLocale(params.locale);

  const [q, setQ] = useState("");
  const [items, setItems] = useState<FighterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const urlParams = useMemo(() => {
    const u = new URLSearchParams();
    if (q.trim()) u.set("q", q.trim());
    return u.toString();
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isApiConfigured()) {
        if (!cancelled) {
          setLoading(false);
          setItems([]);
          setError(null);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{
          items: FighterSummary[];
        }>({
          path: `/public/fighters?${urlParams}`
        });
        if (!cancelled) setItems(data.items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load fighters");
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
  }, [urlParams]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Fighters</div>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name..."
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
          />
          <button
            type="button"
            onClick={() => setQ((prev) => prev)}
            className="rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-[#062034]"
          >
            Go
          </button>
        </div>
      </div>

      {loading ? <LoadingState label="Loading fighters..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-white/70">
          No fighters found.
        </div>
      ) : null}

      <AnimatePresence mode="popLayout" initial={false}>
        {!loading && !error ? (
          <RevealList>
            <div className="space-y-3 pb-24">
              {items.map((f) => {
                const href = `/${locale}/fighters/${f.slug}`;
                return (
                  <RevealItem key={f.id}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/2 p-3 ring-1 ring-white/5"
                    >
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                        {f.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={f.photoUrl}
                            alt={f.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs font-semibold text-white/40">
                            Photo
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white/95">
                          {f.fullName}
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          {f.nationality ?? "Kazakhstan"}
                          {f.regionCity ? ` • ${f.regionCity}` : ""}
                        </div>
                        <div className="mt-2 text-xs text-white/60">
                          {f.weightCategory ? f.weightCategory.name : "—"}
                        </div>
                      </div>
                      <div className="text-right text-xs text-white/70">
                        {(f.record
                          ? `${f.record.wins}-${f.record.losses}-${f.record.draws}`
                          : "—")}
                      </div>
                    </Link>
                  </RevealItem>
                );
              })}
            </div>
          </RevealList>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

