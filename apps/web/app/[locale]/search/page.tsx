"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, isApiConfigured } from "@/lib/api";
import { LoadingState } from "@/ui/LoadingState";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { AnimatePresence } from "framer-motion";
import { RevealItem, RevealList } from "@/ui/motion/Reveal";

type SearchResult =
  | { type: "fighter"; id: string; slug: string; title: string }
  | { type: "event"; id: string; slug: string; title: string }
  | { type: "news"; id: string; slug: string; title: string };

export default function SearchPage({
  params
}: {
  params: { locale: string };
}) {
  const locale = params.locale;
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const urlParams = useMemo(() => {
    const u = new URLSearchParams();
    if (q.trim()) u.set("q", q.trim());
    return u.toString();
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      if (!isApiConfigured()) {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
          setError(null);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ items: SearchResult[] }>({
          path: `/public/search?${urlParams}`
        });
        if (!cancelled) setResults(data.items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Search failed");
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
        <div className="text-sm font-semibold">Global search</div>
        <div className="mt-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search fighters, events, news..."
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
          />
        </div>
      </div>

      {loading ? <LoadingState label="Searching..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      <AnimatePresence mode="popLayout" initial={false}>
        {!loading && !error && results.length > 0 ? (
          <RevealList>
            <div className="space-y-2">
              {results.map((r) => {
                if (r.type === "fighter") {
                  return (
                    <RevealItem key={`${r.type}:${r.id}`}>
                      <Link
                        href={`/${locale}/fighters/${r.slug}`}
                        className="block rounded-xl border border-white/10 bg-white/2 px-3 py-3 text-sm"
                      >
                        <div className="text-xs text-white/60">{r.type}</div>
                        <div className="font-semibold">{r.title}</div>
                      </Link>
                    </RevealItem>
                  );
                }
                return (
                  <RevealItem key={`${r.type}:${r.id}`}>
                    <div className="rounded-xl border border-white/10 bg-white/2 px-3 py-3 text-sm text-white/70">
                      <div className="text-xs text-white/60">{r.type}</div>
                      <div className="font-semibold">{r.title}</div>
                    </div>
                  </RevealItem>
                );
              })}
            </div>
          </RevealList>
        ) : null}
      </AnimatePresence>

      {!loading && !error && q.trim() && results.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-white/70">
          No results.
        </div>
      ) : null}
    </div>
  );
}

